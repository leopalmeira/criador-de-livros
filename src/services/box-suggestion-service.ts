import { BookProject, BookType, IBookChapter } from '../types/book-project';
import { StageId } from '../types/stages';

export type BookEditorialDomain = 
  | 'fantasy-sword-sorcery'
  | 'romance'
  | 'thriller-mystery'
  | 'scifi-dystopia'
  | 'habits-self-help'
  | 'business-entrepreneurship'
  | 'finance-investing'
  | 'health-wellness'
  | 'children-picture-book'
  | 'education-learning'
  | 'journal-planner'
  | 'coloring-therapy'
  | 'activity-puzzles'
  | 'biography-memoir'
  | 'practical-tech'
  | 'culinary-recipes'
  | 'general-nonfiction';

export class BoxSuggestionService {
  private static rotationIndexMap: Map<string, number> = new Map();
  private static usedSuggestionsHistory: Map<string, Set<string>> = new Map();

  /**
   * Detecta o domínio editorial do livro baseado no título, tópico, gênero e dados preenchidos
   */
  public static detectDomain(project: BookProject, currentFormContext?: any): BookEditorialDomain {
    const kdpType = (currentFormContext?.kdpBookType || project.kdpBookType || '') as BookType;

    // Mapeamento direto por BookType oficial se disponível
    if (kdpType === 'children-picture-book' || kdpType === 'illustrated-book') return 'children-picture-book';
    if (kdpType === 'education') return 'education-learning';
    if (kdpType === 'journal') return 'journal-planner';
    if (kdpType === 'coloring-book') return 'coloring-therapy';
    if (kdpType === 'activity-book' || kdpType === 'puzzle-book') return 'activity-puzzles';
    if (kdpType === 'biography') return 'biography-memoir';
    if (kdpType === 'practical-guide') return 'practical-tech';
    if (kdpType === 'technical-manual') return 'culinary-recipes';
    if (kdpType === 'business') return 'business-entrepreneurship';
    if (kdpType === 'finance') return 'finance-investing';
    if (kdpType === 'self-help') return 'habits-self-help';
    if (kdpType === 'health-wellness') return 'health-wellness';
    if (kdpType === 'romance') return 'romance';
    if (kdpType === 'thriller' || kdpType === 'mystery' || kdpType === 'suspense') return 'thriller-mystery';
    if (kdpType === 'fantasy') return 'fantasy-sword-sorcery';
    if (kdpType === 'sci-fi') return 'scifi-dystopia';

    const raw = [
      currentFormContext?.bookTitle,
      currentFormContext?.title,
      project.title,
      currentFormContext?.topic,
      project.topic,
      currentFormContext?.genre,
      project.kdpBookType,
      project.stageData?.research?.genre,
      project.stageData?.research?.topic,
      project.stageData?.research?.bookTitle
    ].filter(Boolean).join(' ').toLowerCase();

    // 1. Livro Infantil, Fábulas e Histórias Ilustradas
    if (
      raw.includes('infantil') ||
      raw.includes('criança') ||
      raw.includes('children') ||
      raw.includes('kids') ||
      raw.includes('fábula') ||
      raw.includes('fabula') ||
      raw.includes('ninar') ||
      raw.includes('picture-book') ||
      raw.includes('historinha') ||
      raw.includes('conto de fadas') ||
      raw.includes('ilustrado para dormir')
    ) {
      return 'children-picture-book';
    }

    // 2. Estudo, Concursos, Memorização & Aprendizagem
    if (
      raw.includes('concurso') ||
      raw.includes('estudo') ||
      raw.includes('memoriza') ||
      raw.includes('aprendizagem') ||
      raw.includes('education') ||
      raw.includes('prova') ||
      raw.includes('edital') ||
      raw.includes('vestibular') ||
      raw.includes('oab') ||
      raw.includes('cognitiv')
    ) {
      return 'education-learning';
    }

    // 3. Planners, Diários Guiados & Gratidão
    if (
      raw.includes('diário') ||
      raw.includes('diario') ||
      raw.includes('journal') ||
      raw.includes('planner') ||
      raw.includes('gratidão') ||
      raw.includes('gratidao') ||
      raw.includes('prompts de reflexão') ||
      raw.includes('páginas matinais')
    ) {
      return 'journal-planner';
    }

    // 4. Colorir, Mandalas & Arte Terapêutica
    if (
      raw.includes('colorir') ||
      raw.includes('coloring') ||
      raw.includes('mandala') ||
      raw.includes('zen') ||
      raw.includes('antiestresse') ||
      raw.includes('anti-stress') ||
      raw.includes('terapêutica') ||
      raw.includes('botânico para relaxar')
    ) {
      return 'coloring-therapy';
    }

    // 5. Passatempos, Caça-Palavras, Sudoku & Desafios Mentais
    if (
      raw.includes('caça-palavras') ||
      raw.includes('caca palavras') ||
      raw.includes('passatempo') ||
      raw.includes('activity-book') ||
      raw.includes('sudoku') ||
      raw.includes('enigmas') ||
      raw.includes('labirinto') ||
      raw.includes('quebra-cabeça') ||
      raw.includes('ginástica mental')
    ) {
      return 'activity-puzzles';
    }

    // 6. Biografias, Grandes Líderes & Memórias Reais
    if (
      raw.includes('biografia') ||
      raw.includes('biography') ||
      raw.includes('memórias') ||
      raw.includes('memorias') ||
      raw.includes('trajetória de') ||
      raw.includes('história real') ||
      raw.includes('vida e obra')
    ) {
      return 'biography-memoir';
    }

    // 7. Culinária, Dietas, Air Fryer & Receitas
    if (
      raw.includes('culinária') ||
      raw.includes('culinaria') ||
      raw.includes('receita') ||
      raw.includes('cozinha') ||
      raw.includes('air fryer') ||
      raw.includes('marmita') ||
      raw.includes('gastronomia') ||
      raw.includes('low carb') ||
      raw.includes('cetogênica') ||
      raw.includes('pratos rápidos')
    ) {
      return 'culinary-recipes';
    }

    // 8. Tecnologia, IA, Prompts & Automação Prática
    if (
      raw.includes('inteligência artificial') ||
      raw.includes('inteligencia artificial') ||
      raw.includes('prompt') ||
      raw.includes('automação') ||
      raw.includes('automacao') ||
      raw.includes('workflow') ||
      raw.includes('software') ||
      raw.includes('tecnologia') ||
      raw.includes('chatgpt')
    ) {
      return 'practical-tech';
    }

    // 9. Fantasia, Espada & Feitiçaria, RPG, Épico
    if (
      raw.includes('sword') || 
      raw.includes('sorcery') || 
      raw.includes('fantasia') || 
      raw.includes('fantasy') || 
      raw.includes('mago') || 
      raw.includes('dragão') || 
      raw.includes('dragon') || 
      raw.includes('reino') || 
      raw.includes('espada') || 
      raw.includes('arcano') || 
      raw.includes('épico') || 
      raw.includes('epic') || 
      raw.includes('feitiçaria') ||
      raw.includes('cimeriano') ||
      raw.includes('valquíria') ||
      raw.includes('elfo') ||
      raw.includes('masmorra')
    ) {
      return 'fantasy-sword-sorcery';
    }

    // 10. Romance e Ficção Emocional
    if (
      raw.includes('romance') || 
      raw.includes('enemies to lovers') || 
      raw.includes('billionaire') || 
      raw.includes('amor') || 
      raw.includes('paixão') || 
      raw.includes('coração') || 
      raw.includes('drama emocional') || 
      raw.includes('fake dating') ||
      raw.includes('grumpy') ||
      raw.includes('slow burn')
    ) {
      return 'romance';
    }

    // 11. Thriller, Mistério, Policial & Suspense
    if (
      raw.includes('thriller') || 
      raw.includes('mistério') || 
      raw.includes('misterio') || 
      raw.includes('mystery') || 
      raw.includes('crime') || 
      raw.includes('assassin') || 
      raw.includes('detetive') || 
      raw.includes('investiga') || 
      raw.includes('suspense') || 
      raw.includes('plot twist') || 
      raw.includes('policial') ||
      raw.includes('serial killer')
    ) {
      return 'thriller-mystery';
    }

    // 12. Ficção Científica, Espaço & Cyberpunk
    if (
      raw.includes('sci-fi') || 
      raw.includes('scifi') || 
      raw.includes('ficção científica') || 
      raw.includes('ficcao cientifica') || 
      raw.includes('cyberpunk') || 
      raw.includes('distopia') || 
      raw.includes('dystopia') || 
      raw.includes('espaço') || 
      raw.includes('space opera') || 
      raw.includes('robô')
    ) {
      return 'scifi-dystopia';
    }

    // 13. Finanças, Investimentos & Renda Passiva
    if (
      raw.includes('finança') || 
      raw.includes('financa') || 
      raw.includes('finance') || 
      raw.includes('dinheiro') || 
      raw.includes('investi') || 
      raw.includes('renda passiva') || 
      raw.includes('ações') || 
      raw.includes('bolsa de valores') || 
      raw.includes('cripto') || 
      raw.includes('patrimônio') || 
      raw.includes('dividendos')
    ) {
      return 'finance-investing';
    }

    // 14. Negócios, Startups & Empreendedorismo
    if (
      raw.includes('negócio') || 
      raw.includes('negocio') || 
      raw.includes('business') || 
      raw.includes('startup') || 
      raw.includes('empresa') || 
      raw.includes('empreend') || 
      raw.includes('vendas') || 
      raw.includes('marketing') || 
      raw.includes('liderança') || 
      raw.includes('gestão') || 
      raw.includes('growth')
    ) {
      return 'business-entrepreneurship';
    }

    // 15. Saúde, Nutrição, Sono & Longevidade
    if (
      raw.includes('saúde') || 
      raw.includes('saude') || 
      raw.includes('health') || 
      raw.includes('nutrição') || 
      raw.includes('nutricao') || 
      raw.includes('sono') || 
      raw.includes('dieta') || 
      raw.includes('corpo') || 
      raw.includes('longevidade') || 
      raw.includes('vitalidade') || 
      raw.includes('meditação')
    ) {
      return 'health-wellness';
    }

    // 16. Hábitos, Foco & Desenvolvimento Pessoal
    if (
      raw.includes('hábito') || 
      raw.includes('habito') || 
      raw.includes('habit') || 
      raw.includes('disciplina') || 
      raw.includes('foco') || 
      raw.includes('produtividade') || 
      raw.includes('autoajuda') || 
      raw.includes('self-help') || 
      raw.includes('mentalidade') || 
      raw.includes('procrastina') || 
      raw.includes('estoicismo')
    ) {
      return 'habits-self-help';
    }

    return 'general-nonfiction';
  }

  /**
   * Obtém a próxima sugestão sem nunca repetir consecutivamente para qualquer box
   * Considera o título, gênero e contexto digitado na tela
   */
  public static getNextSuggestion(
    boxKey: string,
    project: BookProject,
    currentFormContext?: any
  ): string {
    // Campos com geradores contextuais dedicados (research + author-bio + book-titles)
    const contextualFields = [
      'research.targetAudience',
      'research.bookTitle',
      'research.topic',
      'research.stance',
      'research.standout',
      'research.authorName',
      'book-titles.mainTitle',
      'book-titles.subtitle',
      'author-bio.penName',
      'author-bio.authorName',
      'author-bio.background',
      'author-bio.achievements',
      'author-bio.personalDetails',
    ];

    if (contextualFields.includes(boxKey)) {
      const cacheKey = `${project.id || 'default'}_${boxKey}`;
      if (!this.usedSuggestionsHistory.has(cacheKey)) {
        this.usedSuggestionsHistory.set(cacheKey, new Set<string>());
      }
      const history = this.usedSuggestionsHistory.get(cacheKey)!;
      const result = this.generateContextualField(boxKey, project, currentFormContext, history);
      history.add(result);
      if (history.size >= 12) history.clear();
      return result;
    }

    const domain = this.detectDomain(project, currentFormContext);
    const titleContext = currentFormContext?.bookTitle || currentFormContext?.title || project.title || '';
    const topicContext = currentFormContext?.topic || project.topic || '';

    const list = this.getDomainSpecificSuggestions(boxKey, domain, titleContext, topicContext, project);
    if (!list || list.length === 0) {
      return `Sugestão profissional para ${boxKey} baseada em ${titleContext || topicContext || 'seu livro'}`;
    }

    const cacheKey = `${project.id || 'default'}_${boxKey}`;
    const currentIndex = this.rotationIndexMap.get(cacheKey) || 0;
    if (!this.usedSuggestionsHistory.has(cacheKey)) {
      this.usedSuggestionsHistory.set(cacheKey, new Set<string>());
    }
    const history = this.usedSuggestionsHistory.get(cacheKey)!;

    let selected = list[currentIndex % list.length];
    let attempts = 0;
    while (history.has(selected) && attempts < list.length) {
      const nextIdx = (currentIndex + attempts + 1) % list.length;
      selected = list[nextIdx];
      attempts++;
    }
    if (history.size >= list.length - 1) history.clear();
    history.add(selected);
    this.rotationIndexMap.set(cacheKey, currentIndex + 1);
    return selected;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ROTEADOR CENTRAL — despacha cada campo para seu gerador contextual
  // ═══════════════════════════════════════════════════════════════════════════
  private static generateContextualField(
    boxKey: string,
    project: BookProject,
    currentFormContext?: any,
    usedHistory?: Set<string>
  ): string {
    switch (boxKey) {
      case 'research.bookTitle':
      case 'book-titles.mainTitle':   return this.generateContextualTitle(project, currentFormContext, usedHistory);
      case 'book-titles.subtitle':    return this.generateContextualSubtitle(project, currentFormContext, usedHistory);
      case 'research.authorName':     return this.generateContextualAuthorName(project, currentFormContext, usedHistory);
      case 'research.topic':          return this.generateContextualTopic(project, currentFormContext, usedHistory);
      case 'research.stance':         return this.generateContextualStance(project, currentFormContext, usedHistory);
      case 'research.standout':       return this.generateContextualStandout(project, currentFormContext, usedHistory);
      case 'research.targetAudience': return this.generateContextualAvatar(project, currentFormContext, usedHistory);
      case 'author-bio.penName':
      case 'author-bio.authorName':   return this.generateContextualAuthorName(project, currentFormContext, usedHistory);
      case 'author-bio.background':   return this.generateAuthorBackground(project, currentFormContext, usedHistory);
      case 'author-bio.achievements': return this.generateAuthorAchievements(project, currentFormContext, usedHistory);
      case 'author-bio.personalDetails': return this.generateAuthorPersonalDetails(project, currentFormContext, usedHistory);
      default:                        return '';
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // GERADOR DE TÍTULO — fórmulas consagradas de Best Sellers da Amazon KDP
  // para TODOS os 17 segmentos editoriais. Sem clichês como 'Como Dominar' ou 'Guia'.
  // ───────────────────────────────────────────────────────────────────────────
  private static generateContextualTitle(
    project: BookProject,
    ctx?: any,
    history?: Set<string>
  ): string {
    const rawTopic = (ctx?.topic || project.topic || '').trim();
    const domain   = this.detectDomain(project, ctx);

    // Limpa preposições e artigos iniciais do tema para encaixar perfeitamente nas estruturas
    const topic = rawTopic
      .replace(/^(o|a|os|as|um|uma|uns|umas|de|do|da|dos|das|em|no|na|nos|nas|para|sobre)\s+/i, '')
      .trim() || 'Crescimento e Transformação';

    // Fórmulas autênticas de Best Seller da Amazon por domínio
    const bestSellerFormulasByDomain: Record<BookEditorialDomain, ((t: string) => string)[]> = {
      'business-entrepreneurship': [
        (t) => `A Lógica do Improvável: O Efeito ${t}`,
        (t) => `Construído para Vencer: A Nova Estratégia de ${t}`,
        (t) => `O Fator Multiplicador: ${t} sem Caos Operacional`,
        (t) => `Tração Real: O Código das Empresas que Escalam ${t}`,
        (t) => `O Ponto de Virada Corporativo: Revolucionando ${t}`,
        (t) => `Escala sem Atrito: A Alquimia de ${t}`,
        (t) => `A Revolução Silenciosa de ${t}`,
        (t) => `O Efeito Alavanca: Dominando as Fronteiras de ${t}`,
      ],
      'finance-investing': [
        (t) => `A Psicologia do Patrimônio: Decisões Inteligentes em ${t}`,
        (t) => `O Investidor Antifrágil: O Segredo de ${t}`,
        (t) => `Renda Além do Tempo: O Algoritmo de ${t}`,
        (t) => `Riqueza Silenciosa: Princípios Duradouros de ${t}`,
        (t) => `O Código da Liberdade Financeira: O Fator ${t}`,
        (t) => `Capital Invisível: Construindo Prosperidade em ${t}`,
        (t) => `A Rota dos Dividendos Reais: Estratégias em ${t}`,
        (t) => `O Mente Rica: Como Proteger e Multiplicar ${t}`,
      ],
      'habits-self-help': [
        (t) => `Arquitetura da Consistência: O Poder de ${t}`,
        (t) => `Mente Inabalável: A Ciência Diária de ${t}`,
        (t) => `A Força da Disciplina Silenciosa: O Efeito ${t}`,
        (t) => `O Código do Hábito Atômico: Transformando ${t}`,
        (t) => `Clareza sob Pressão: O Antídoto para o Caos em ${t}`,
        (t) => `Essencialismo Prático: O Foco Absoluto em ${t}`,
        (t) => `A Arte da Auto-Superação: Reprogramando ${t}`,
        (t) => `Imparável: O Método Definitivo para Sustentar ${t}`,
      ],
      'health-wellness': [
        (t) => `A Revolução Celular: O Segredo Biológico de ${t}`,
        (t) => `O Código da Longevidade Ativa: Vitalidade através de ${t}`,
        (t) => `Alquimia do Bem-Estar: Como Restaurar ${t}`,
        (t) => `A Ciência do Equilíbrio: Protocolos Naturais para ${t}`,
        (t) => `O Corpo Regenerativo: Desinflamando a Mente e ${t}`,
        (t) => `Bio-Harmonia: A Arte Clínica de Cuidar de ${t}`,
        (t) => `Vitalidade Real: O Protocolo Científico de ${t}`,
        (t) => `A Cura Silenciosa: Restaurando o Ritmo de ${t}`,
      ],
      'practical-tech': [
        (t) => `O Motor da Automação: Aplicações Inteligentes de ${t}`,
        (t) => `Fluência Algorítmica: O Novo Padrão de ${t}`,
        (t) => `Sistemas de Alta Performance: Otimizando ${t}`,
        (t) => `Engenharia de Resultados: A Revolução Prática de ${t}`,
        (t) => `Inteligência Conectada: Fluxos de Trabalho em ${t}`,
        (t) => `Otimização Exponencial: Acelere seu Dia a Dia com ${t}`,
        (t) => `A Fronteira Digital: Dominando Ferramentas de ${t}`,
        (t) => `Arquitetura de Eficiência: O Poder da Tecnologia em ${t}`,
      ],
      'children-picture-book': [
        (t) => `O Pequeno Explorador e a Grande Descoberta de ${t}`,
        (t) => `O Dia em que as Cores Encontraram ${t}`,
        (t) => `O Segredo da Floresta Encantada: A Aventura de ${t}`,
        (t) => `O Menino das Estrelas e a Lição de ${t}`,
        (t) => `Onde os Sonhos Dormem: Um Conto Carinhoso sobre ${t}`,
        (t) => `A Incrível Viagem do Ursinho que Descobriu ${t}`,
        (t) => `Coração Valente: A Doce História de ${t}`,
        (t) => `O Guarda-Chuva Mágico e o Mistério de ${t}`,
      ],
      'romance': [
        (t) => `Mil Razões para Ficar: A Promessa de ${t}`,
        (t) => `Onde o Inverno se Desfaz: Um Romance sobre ${t}`,
        (t) => `Entre o Acordo e a Rendição: As Chamas de ${t}`,
        (t) => `As Cores do Nosso Caos: Segredos e ${t}`,
        (t) => `A Hipótese do Amor Inconveniente: Tudo por ${t}`,
        (t) => `Antes do Nosso Adeus: A Segunda Chance de ${t}`,
        (t) => `Corações em Chamas: A Química Perigosa de ${t}`,
        (t) => `Pactos de Meia-Noite: O Desejo por trás de ${t}`,
      ],
      'thriller-mystery': [
        (t) => `A Testemunha Silenciosa: A Verdade Oculta de ${t}`,
        (t) => `Ninguém Sai Inocente: A Trama Sombria de ${t}`,
        (t) => `O Rastro da Mentira: 48 Horas para Revelar ${t}`,
        (t) => `O Enigma do Quarto Fechado: O Caso de ${t}`,
        (t) => `Sem Saída: Um Thriller Eletrizante sobre ${t}`,
        (t) => `Antes que a Última Luz se Apague: O Segredo de ${t}`,
        (t) => `A Garota da Colina: Conspirações em torno de ${t}`,
        (t) => `Vozes no Escuro: A Farsa Revelada de ${t}`,
      ],
      'fantasy-sword-sorcery': [
        (t) => `A Canção das Chamas Ancestrais: As Crônicas de ${t}`,
        (t) => `O Trono de Ferro e Cinzas: A Saga de ${t}`,
        (t) => `A Ordem das Sombras Esquecidas: Sangue e ${t}`,
        (t) => `O Guardião dos Portais Arcanos: O Legado de ${t}`,
        (t) => `Lâminas de Crepúsculo: O Despertar de ${t}`,
        (t) => `Pacto de Ferro e Sangue: A Batalha por ${t}`,
        (t) => `O Livro dos Reinos Caídos: Feitiçaria em ${t}`,
        (t) => `O Último Juramento: A Aliança contra ${t}`,
      ],
      'scifi-dystopia': [
        (t) => `Protocolo Órion: A Fronteira Quântica de ${t}`,
        (t) => `Nexus Sintético: O Despertar da Consciência em ${t}`,
        (t) => `Horizonte Silencioso: A Última Missão de ${t}`,
        (t) => `A Fratura do Espaço-Tempo: O Enigma de ${t}`,
        (t) => `Cidade de Silício e Sombras: A Nova Era de ${t}`,
        (t) => `Além da Matriz Neural: Sobrevivendo a ${t}`,
        (t) => `O Ponto de Singularidade: Conflito Cósmico em ${t}`,
        (t) => `Consciência Zero: A Odisseia Humana por ${t}`,
      ],
      'education-learning': [
        (t) => `O Circuito da Aprovação: Estratégias Cognitivas para ${t}`,
        (t) => `Ultra-Aprendizagem: A Ciência da Retenção Inabalável em ${t}`,
        (t) => `A Mente Concurseira: O Método Estratégico de ${t}`,
        (t) => `Memória Blindada: Como Consolidar Conteúdo de ${t}`,
        (t) => `Raciocínio Tático: O Passo a Passo para Gabaritar ${t}`,
        (t) => `O Código do Estudo de Alta Performance: Dominando ${t}`,
        (t) => `Aprovação em Foco: Planejamento Eficaz de ${t}`,
        (t) => `Neuro-Estudo: Retenção Acelerada para Provas de ${t}`,
      ],
      'journal-planner': [
        (t) => `O Diário da Intenção: 5 Minutos Diários de ${t}`,
        (t) => `Caderno de Clareza e Foco: O Ritual de ${t}`,
        (t) => `90 Dias de Transformação: Hábitos e ${t}`,
        (t) => `Páginas de Presença: O Despertar Consciente de ${t}`,
        (t) => `O Ritual Matinal: Cultivando Gratidão e ${t}`,
        (t) => `Planner de Alta Produtividade: Metas Claras para ${t}`,
        (t) => `Diário do Hábito Consciente: Construindo ${t}`,
        (t) => `Reflexões Diárias: O Caderno da Serenidade em ${t}`,
      ],
      'coloring-therapy': [
        (t) => `Santuário Zen: Ilustrações Terapêuticas de ${t}`,
        (t) => `Mandalas da Serenidade: A Calma Restauradora de ${t}`,
        (t) => `Jardins da Alma: Padrões Relaxantes de ${t}`,
        (t) => `Refúgio Botânico: Arte Meditativa com ${t}`,
        (t) => `Cores da Tranquilidade: Uma Pausa Diária para ${t}`,
        (t) => `Geometria Sagrada e Florestas: A Arte Anti-Stress de ${t}`,
        (t) => `Padrões de Paz Interior: Traços Suaves de ${t}`,
        (t) => `Universo Sereno: O Livro de Colorir para Desacelerar ${t}`,
      ],
      'activity-puzzles': [
        (t) => `Ginástica Cerebral: O Grande Livro de Desafios de ${t}`,
        (t) => `Caça-Palavras Letra Grande: Concentração e ${t}`,
        (t) => `Mente Ágil: Enigmas e Puzzles Progressivos de ${t}`,
        (t) => `O Desafio Diário dos Campeões: Lógica e ${t}`,
        (t) => `Cérebro Ativo: Passatempos Estimulantes para ${t}`,
        (t) => `Labirintos e Sudokus de Alta Precisão: Treinando ${t}`,
        (t) => `Agilidade Cognitiva: O Manual Divertido de ${t}`,
        (t) => `Passatempos Terapêuticos: Memória Forte com ${t}`,
      ],
      'biography-memoir': [
        (t) => `A Marca da Vitória: A Trajetória Improvável de ${t}`,
        (t) => `Além da Glória: Os Bastidores e Lições de ${t}`,
        (t) => `O Homem que Mudou as Regras: A Vida de ${t}`,
        (t) => `Vozes da História: O Legado Inabalável de ${t}`,
        (t) => `A Coragem de Romper Padrões: Memórias de ${t}`,
        (t) => `O Preço da Grandeza: A Verdade por trás de ${t}`,
        (t) => `Determinação de Aço: A Jornada Real de ${t}`,
        (t) => `Liderança nos Momentos de Crise: O Exemplo de ${t}`,
      ],
      'culinary-recipes': [
        (t) => `A Alquimia da Cozinha Rápida: Segredos de ${t}`,
        (t) => `Mesa Saudável em 20 Minutos: A Praticidade de ${t}`,
        (t) => `Marmitas Inteligentes: A Arte de Simplificar ${t}`,
        (t) => `Sabor & Nutrição: Pratos Irresistíveis de ${t}`,
        (t) => `Cozinha Descomplicada: Receitas Fáceis de ${t}`,
        (t) => `O Pão da Manhã: Fermentação Natural e Sabores de ${t}`,
        (t) => `Gastronomia Funcional para o Dia a Dia: ${t}`,
        (t) => `Sabores que Abraçam: O Guia Gostoso de ${t}`,
      ],
      'general-nonfiction': [
        (t) => `A Ilusão da Certeza: Uma Lente Lúcida sobre ${t}`,
        (t) => `O Olhar Lúcido: Desconstruindo os Mitos de ${t}`,
        (t) => `Filosofia para Dias Caóticos: A Sabedoria de ${t}`,
        (t) => `O Paradoxo Moderno: Uma Investigação sobre ${t}`,
        (t) => `A Arte da Clareza: Princípios Atemporais de ${t}`,
        (t) => `Em Busca do Essencial: O Significado Real de ${t}`,
        (t) => `A Sabedoria Invisível: Reflexões sobre ${t}`,
        (t) => `Homo Adaptabilis: Navegando as Transformações de ${t}`,
      ],
    };

    const formulas = bestSellerFormulasByDomain[domain] || bestSellerFormulasByDomain['general-nonfiction'];
    const histSize = history?.size || 0;

    let attempts = 0;
    while (attempts < formulas.length * 2) {
      const fn = formulas[(histSize + attempts) % formulas.length];
      const candidate = fn(topic).trim().replace(/\s{2,}/g, ' ');
      if (!history?.has(candidate)) {
        return candidate;
      }
      attempts++;
    }

    return formulas[0](topic);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // GERADOR DE SUBTÍTULO — fórmula de alta conversão da Amazon KDP
  // [Promessa de Transformação / Gancho de Curiosidade] + [Mecanismo Único]
  // ───────────────────────────────────────────────────────────────────────────
  private static generateContextualSubtitle(
    project: BookProject,
    ctx?: any,
    history?: Set<string>
  ): string {
    const rawTopic = (ctx?.topic || project.topic || '').trim();
    const domain   = this.detectDomain(project, ctx);

    const topic = rawTopic
      .replace(/^(o|a|os|as|um|uma|uns|umas|de|do|da|dos|das|em|no|na|nos|nas|para|sobre)\s+/i, '')
      .trim() || 'Crescimento e Transformação';

    const subtitlesByDomain: Record<BookEditorialDomain, ((t: string) => string)[]> = {
      'business-entrepreneurship': [
        (t) => `Estratégias de alto impacto para liderar mercados, criar processos ágeis e multiplicar resultados em ${t} sem desgaste operacional`,
        (t) => `Os bastidores das empresas que triplicam a lucratividade com equipes autônomas e diferenciais competitivos sólidos em ${t}`,
        (t) => `Como estruturar operações escaláveis, atrair clientes de alto valor e expandir ${t} com previsibilidade de caixa`,
        (t) => `O método tático para fundadores e gestores que precisam transformar ideias em receita consistente na área de ${t}`,
      ],
      'finance-investing': [
        (t) => `Princípios comprovados para construir patrimônio consistente, gerar dividendos passivos e proteger seu dinheiro da volatilidade com ${t}`,
        (t) => `O passo a passo estrutural para alcançar autonomia financeira tomando decisões racionais com pouco capital em ${t}`,
        (t) => `Como blindar sua carteira contra a inflação e criar fluxo de caixa contínuo através das melhores práticas de ${t}`,
        (t) => `Estratégias inteligentes de alocação de ativos e multiplicação de riqueza com foco no longo prazo em ${t}`,
      ],
      'habits-self-help': [
        (t) => `Microajustes diários que transformam rotinas caóticas em disciplina inabalável, foco profundo e resultados duradouros em ${t}`,
        (t) => `Como vencer a procrastinação silenciosa e reprogramar seus hábitos sem depender de picos passageiros de motivação em ${t}`,
        (t) => `Arquitetura comportamental para sustentar metas ambiciosas e cultivar paz mental em um mundo saturado de distrações sobre ${t}`,
        (t) => `A neurociência aplicada à produtividade pessoal: passos simples para destravar seu potencial diário em ${t}`,
      ],
      'health-wellness': [
        (t) => `Protocolos clínicos validados pela ciência para desinflamar o organismo, restaurar o sono e conquistar disposição duradoura com ${t}`,
        (t) => `Como regular hormônios, vitalidade celular e imunidade através de hábitos simples, naturais e sustentáveis em ${t}`,
        (t) => `A ciência da longevidade sem extremismos: orientações práticas para viver décadas a mais com saúde física e mental em ${t}`,
        (t) => `O guia de regeneração biológica para quem quer eliminar o cansaço crônico e recuperar o bem-estar diário através de ${t}`,
      ],
      'practical-tech': [
        (t) => `Estruturação de fluxos de trabalho inteligentes e automações para economizar horas preciosas toda semana em ${t}`,
        (t) => `Como integrar ferramentas modernas e inteligência artificial ao seu cotidiano profissional de forma ética e eficiente em ${t}`,
        (t) => `Da teoria à aplicação prática: o guia indispensável para dominar as inovações que estão redefinindo ${t}`,
        (t) => `Metodologias práticas e prompts de alto desempenho para elevar sua produtividade técnica sem precisar programar em ${t}`,
      ],
      'children-picture-book': [
        (t) => `Uma aventura doce e divertida sobre coragem, amizade e o poder de acreditar em si mesmo no mundo de ${t}`,
        (t) => `Um conto ilustrado para ler em família, acalmar o coração na hora de dormir e despertar lindos sonhos sobre ${t}`,
        (t) => `Uma história mágica e cheia de cores que ensina pequenos leitores a lidarem com as próprias emoções e celebrarem ${t}`,
        (t) => `Aventuras inesquecíveis com bichinhos adoráveis em uma jornada que valoriza a gentileza e o respeito a ${t}`,
      ],
      'romance': [
        (t) => `Um romance intenso sobre segredos do passado, desejos inegociáveis e duas vidas que se colidem para sempre por causa de ${t}`,
        (t) => `Quando dois rivais descobrem que a atração é o mais perigoso dos sentimentos em uma história arrebatadora de ${t}`,
        (t) => `Uma narrativa envolvente de segunda chance onde o perdão custa caro e a paixão renasce onde menos se espera em ${t}`,
        (t) => `Entre promessas quebradas e sussurros no escuro: a história de amor que desafiou todas as regras em torno de ${t}`,
      ],
      'thriller-mystery': [
        (t) => `Um thriller psicológico eletrizante onde cada suspeito esconde uma mentira e a verdade sobre ${t} custa caro demais`,
        (t) => `Uma corrida contra o relógio para desvendar um crime do passado antes que o assassino execute o próximo passo em ${t}`,
        (t) => `Pistas ocultas, pistas falsas e um desfecho impactante que ninguém conseguiu antecipar nos bastidores de ${t}`,
        (t) => `Em uma cidade onde todos mentem, a única pessoa que sabe a verdade sobre ${t} não pode falar`,
      ],
      'fantasy-sword-sorcery': [
        (t) => `Uma saga épica de magia, honra e traições nos confins de um mundo prestes a sucumbir ao poder esquecido de ${t}`,
        (t) => `A jornada de guerreiros lendários destinados a forjar uma nova aliança entre reis caídos e feitiçarias sombrias em ${t}`,
        (t) => `Duelos de aço, deuses antigos e juramentos de sangue no confronto definitivo pelo destino de ${t}`,
        (t) => `Quando a magia exige um preço em sangue, apenas os mais corajosos ousam reivindicar o trono de ${t}`,
      ],
      'scifi-dystopia': [
        (t) => `Uma odisseia espacial de suspense tecnológico e reflexão filosófica sobre a sobrevivência da humanidade em ${t}`,
        (t) => `Distopia especulativa sobre controle neural, inteligências artificiais soberanas e a resistência da consciência em ${t}`,
        (t) => `Nos confins de uma colônia orbital esquecida, a descoberta de um algoritmo muda para sempre as regras de ${t}`,
        (t) => `O futuro em jogo quando o último sinal de transmissão cósmica revela o segredo guardado em ${t}`,
      ],
      'education-learning': [
        (t) => `Estratégias baseadas na neurociência da retenção para absorver conteúdos densos com metade do tempo em ${t}`,
        (t) => `O plano tático cronometrado para conquistar a aprovação dos sonhos sem ansiedade e sem esgotamento em ${t}`,
        (t) => `Como organizar resumos inteligentes, mapear bancas examinadoras e garantir alto rendimento nas questões de ${t}`,
        (t) => `Técnicas de repetição espaçada e resumos ativos para gabaritar provas e concursos na área de ${t}`,
      ],
      'journal-planner': [
        (t) => `Prompts diários de 5 minutos para despertar com clareza, alinhar intenções e encerrar a rotina em profunda paz com ${t}`,
        (t) => `Exercícios guiados para cultivar gratidão genuína, eliminar o ruído mental e acompanhar seu crescimento pessoal em ${t}`,
        (t) => `O sistema de planejamento semanal para organizar prioridades e celebrar pequenas vitórias no universo de ${t}`,
        (t) => `Páginas de reflexão matinal para desacelerar o coração e focar no que realmente constrói seu legado em ${t}`,
      ],
      'coloring-therapy': [
        (t) => `Ilustrações exclusivas em traços delicados para aliviar o estresse, relaxar a mente e expressar criatividade com ${t}`,
        (t) => `Mais de 50 padrões inspiradores desenvolvidos para desacelerar o ritmo diário e encontrar tranquilidade através de ${t}`,
        (t) => `Uma pausa meditativa no seu dia a dia: cores suaves e desenhos harmoniosos inspirados na beleza de ${t}`,
        (t) => `Arte terapêutica para adultos que buscam momentos de paz, presença e reconexão interior colorindo ${t}`,
      ],
      'activity-puzzles': [
        (t) => `Mais de 100 desafios selecionados para exercitar a memória, prevenir o esquecimento e divertir todas as idades com ${t}`,
        (t) => `Passatempos inteligentes com letras grandes e dificuldade progressiva para manter o cérebro jovem e focado em ${t}`,
        (t) => `Enigmas, caça-palavras e labirintos criados para momentos prazerosos de estímulo mental com o tema de ${t}`,
        (t) => `O livro de ginástica cerebral ideal para relaxar e fortalecer o raciocínio lógico resolvendo desafios de ${t}`,
      ],
      'biography-memoir': [
        (t) => `Os bastidores inéditos, dilemas éticos e decisões corajosas de quem moldou sua época enfrentando adversidades em ${t}`,
        (t) => `A jornada autêntica do anonimato ao reconhecimento histórico: lições de resiliência e propósito vividas em ${t}`,
        (t) => `Uma biografia reveladora que documenta com honestidade os erros e as maiores vitórias na trajetória de ${t}`,
        (t) => `Memórias comoventes e inspiradoras que mostram a força do espírito humano diante dos maiores desafios de ${t}`,
      ],
      'culinary-recipes': [
        (t) => `Receitas práticas, econômicas e cheias de sabor para transformar suas refeições cotidianas sem complicação em ${t}`,
        (t) => `O guia passo a passo para organizar seu cardápio semanal com preparos saudáveis e pratos deliciosos de ${t}`,
        (t) => `Técnicas culinárias descomplicadas para cozinhar com poucos ingredientes e arrancar elogios de toda a família em ${t}`,
        (t) => `Segredos da gastronomia caseira para comer bem, cuidar da saúde e economizar tempo na cozinha preparando ${t}`,
      ],
      'general-nonfiction': [
        (t) => `Uma reflexão lúcida e corajosa sobre as forças invisíveis que moldam o comportamento humano contemporâneo em ${t}`,
        (t) => `Princípios atemporais resgatados para oferecer clareza, serenidade e senso de direção em tempos de incerteza sobre ${t}`,
        (t) => `Uma investigação profunda que desafia o senso comum e entrega novas lentes para enxergar e vivenciar ${t}`,
        (t) => `Ideias essenciais sintetizadas com rigor e aplicabilidade para quem busca viver com mais autenticidade em ${t}`,
      ],
    };

    const formulas = subtitlesByDomain[domain] || subtitlesByDomain['general-nonfiction'];
    const histSize = history?.size || 0;

    let attempts = 0;
    while (attempts < formulas.length * 2) {
      const fn = formulas[(histSize + attempts) % formulas.length];
      const candidate = fn(topic).trim().replace(/\s{2,}/g, ' ');
      if (!history?.has(candidate)) {
        return candidate;
      }
      attempts++;
    }

    return formulas[0](topic);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // GERADOR DE NOME DE AUTOR — pseudônimos adequados ao gênero do livro
  // ───────────────────────────────────────────────────────────────────────────
  private static generateContextualAuthorName(
    project: BookProject,
    ctx?: any,
    history?: Set<string>
  ): string {
    const domain = this.detectDomain(project, ctx);

    const namesByDomain: Record<string, string[]> = {
      'fantasy-sword-sorcery': [
        'Thorne Blackwood', 'Valerius M. Kane', 'Kaelen R. Thorne',
        'Rowan Blackwood', 'Elena Frostwood', 'Dorian Graylock',
        'Vesper C. Thorne', 'L. K. Vance'
      ],
      'romance': [
        'Scarlett Thorne', 'Camila Sterling', 'Aria Vance',
        'Chloe Saint-Claire', 'Maya Montgomery', 'Elena Rossi',
        'Juliana Foster', 'Penelope Ward'
      ],
      'thriller-mystery': [
        'Marcus Vale', 'A. J. Coldwell', 'R. T. Hargrove',
        'Elaine Cross', 'Daniel Morrow', 'C. L. Ashford',
        'Victor Shade', 'Helena Storm'
      ],
      'scifi-dystopia': [
        'Axiom Reed', 'K. L. Nexus', 'Zara Vega',
        'Orion Blake', 'Nova Cipher', 'Stellan Cross',
        'Yara Quantum', 'Marcus Synth'
      ],
      'habits-self-help': [
        'Rafael Matos', 'Camila Nobre', 'Diego Ferreira',
        'Juliana Conte', 'André Lemos', 'Patrícia Vieira',
        'Leonardo Cruz', 'Fernanda Ramos'
      ],
      'business-entrepreneurship': [
        'Ricardo Alves', 'Marina Costa', 'Felipe Duarte',
        'Sabrina Monteiro', 'Gustavo Lima', 'Priscila Neves',
        'Eduardo Vargas', 'Tatiana Souza'
      ],
      'finance-investing': [
        'Carlos Mendes', 'Beatriz Leal', 'Rodrigo Fonseca',
        'Mariana Pinto', 'Henrique Moura', 'Daniela Correia',
        'Paulo Silveira', 'Renata Campos'
      ],
      'health-wellness': [
        'Dr. André Nóbrega', 'Dra. Luana Freitas', 'Prof. Marcos Alves',
        'Dra. Carla Simões', 'Rodrigo Vital', 'Isabela Prado',
        'Dr. Felipe Saúde', 'Natalia Bem-Estar'
      ],
      'general-nonfiction': [
        'Leandro Palmeira', 'L. P. Oliveira', 'P. L. Santos',
        'Bruno Castilho', 'Sandra Lago', 'Marcelo Faria',
        'Cristina Bastos', 'Alberto Prado'
      ],
    };

    const names = namesByDomain[domain] || namesByDomain['general-nonfiction'];
    const histSize = history?.size || 0;
    let attempts = 0;
    while (attempts < names.length) {
      const candidate = names[(histSize + attempts) % names.length];
      if (!history?.has(candidate)) return candidate;
      attempts++;
    }
    return names[0];
  }

  // ───────────────────────────────────────────────────────────────────────────
  // GERADOR DE TÓPICO — usa título + gênero + audiência já preenchidos
  // ───────────────────────────────────────────────────────────────────────────
  private static generateContextualTopic(
    project: BookProject,
    ctx?: any,
    history?: Set<string>
  ): string {
    const title    = (ctx?.bookTitle || project.title || '').trim();
    const domain   = this.detectDomain(project, ctx);
    const genAud   = (ctx?.generalAudience || project.stageData?.research?.generalAudience || '').trim();
    const titleRef = title || 'sua obra';

    const topicsByDomain: Record<string, string[]> = {
      'fantasy-sword-sorcery': [
        `A luta de guerreiros pragmáticos para sobreviver em um mundo de magia com custo biológico real em "${titleRef}"`,
        `Conspirações políticas entre reinos corruptos e a resistência de mercenários sem ilusões em "${titleRef}"`,
        `Um sistema de magia rigoroso com limites físicos severos, onde cada feitiço tem uma dívida a pagar`,
        `Batalhas táticas e alianças traiçoeiras no coração de um continente dividido por guerras ancestrais`,
      ],
      'romance': [
        `A tensão emocional entre dois protagonistas de mundos opostos que resistem ao inevitável em "${titleRef}"`,
        `Reencontro de ex-amantes após anos separados, carregados de mágoa e uma química impossível de ignorar`,
        `Proximidade forçada entre rivais declarados que escondem sentimentos por trás de farpas e orgulho`,
        `Um amor proibido por regras sociais e segredos do passado que ameaçam destruir o que foi construído`,
      ],
      'thriller-mystery': [
        `Uma investigação que revela uma conspiração muito maior do que o crime original em "${titleRef}"`,
        `Um detetive atormentado rastreando um assassino que conhece seus pontos cegos e os usa contra ele`,
        `Narrador não-confiável que guia o leitor por pistas reais enquanto esconde a chave do próprio crime`,
        `Desaparecimento em uma comunidade perfeita onde cada testemunha tem algo a esconder`,
      ],
      'habits-self-help': [
        `Construção de sistemas automáticos de hábitos baseados em neurociência comportamental para "${titleRef}"`,
        `Como eliminar a procrastinação crônica e construir consistência real em ambientes de alta distração`,
        `Arquitetura do ambiente e rituais de alta performance para profissionais sobrecarregados`,
        `Micro-hábitos de 2 minutos que criam efeito composto de longo prazo em produtividade e foco`,
      ],
      'business-entrepreneurship': [
        `Metodologias práticas de escala e gestão para reduzir a dependência do fundador em "${titleRef}"`,
        `Como construir sistemas de aquisição de clientes previsíveis sem depender de tráfego pago`,
        `Liderança de times de alta performance com processos que funcionam sem microgestão constante`,
        `Frameworks de execução tática para empreendedores que precisam de resultado, não de teoria`,
      ],
      'finance-investing': [
        `Estratégias de construção de patrimônio passivo com alocação inteligente de risco em "${titleRef}"`,
        `Como criar uma carteira de renda passiva previsível mesmo com aportes iniciais modestos`,
        `Princípios de investimento de longo prazo blindados contra volatilidade política e inflação`,
        `O método de independência financeira progressiva para trabalhadores com salário fixo`,
      ],
      'health-wellness': [
        `Protocolos científicos de otimização de sono, energia e longevidade para "${titleRef}"`,
        `Como reverter o esgotamento crônico com mudanças simples de alimentação, sono e rotina`,
        `Guia de saúde preventiva baseado em evidências para quem não tem tempo para complicações`,
        `Estratégias de desinflamação corporal e equilíbrio hormonal para qualidade de vida duradoura`,
      ],
    };

    const audNote = genAud.includes('Profission') ? ', voltado para profissionais e gestores'
      : genAud.includes('Iniciante') ? ', acessível a quem começa do zero'
      : genAud.includes('Infantil') ? ', adaptado para o universo infantil e familiar'
      : genAud.includes('Melhor Idade') ? ', pensado para leitores maduros'
      : '';

    const list = topicsByDomain[domain] || [
      `Uma abordagem profunda e original sobre "${titleRef}"${audNote}`,
      `Perspectiva única sobre os fundamentos que regem "${titleRef}"${audNote}`,
      `A visão estratégica e prática sobre o universo de "${titleRef}"${audNote}`,
      `Desconstrução dos mitos e verdades essenciais sobre o tema central de "${titleRef}"${audNote}`,
    ];

    const histSize = history?.size || 0;
    let attempts = 0;
    while (attempts < list.length) {
      const candidate = list[(histSize + attempts) % list.length];
      if (!history?.has(candidate)) return candidate;
      attempts++;
    }
    return list[0];
  }

  // ───────────────────────────────────────────────────────────────────────────
  // GERADOR DE POSICIONAMENTO — usa título + tópico + gênero
  // ───────────────────────────────────────────────────────────────────────────
  private static generateContextualStance(
    project: BookProject,
    ctx?: any,
    history?: Set<string>
  ): string {
    const title    = (ctx?.bookTitle || project.title || '').trim();
    const topic    = (ctx?.topic || project.topic || '').trim();
    const domain   = this.detectDomain(project, ctx);
    const tone     = (ctx?.authorTone || project.stageData?.research?.authorTone || '').trim();

    const ref = topic || title || 'este livro';

    const stanceByDomain: Record<string, string[]> = {
      'fantasy-sword-sorcery': [
        `Em "${ref}", heróis não nascem com profecias sagradas: eles sobrevivem por decisões táticas brutais e pagam cada vitória com sangue e consequências reais.`,
        `A magia em "${ref}" não é gratuita — cada feitiço consome vitalidade real, criando tensão genuína onde qualquer solução arcana tem um custo narrativo irreversível.`,
        `Enquanto a fantasia genérica romantiza a guerra, "${ref}" expõe as perdas reais, dilemas morais cinzentos e o custo psicológico de sobreviver em um mundo sem regras claras.`,
        `O vilão mais perigoso em "${ref}" não é um dragão — é o sistema político corrupto que usa a lei como arma e envenena alianças antes de qualquer batalha acontecer.`,
      ],
      'romance': [
        `Em "${ref}", o amor verdadeiro não é a ausência de orgulho ou conflito — é a coragem rara de baixar as defesas diante de quem tem o poder de nos destruir completamente.`,
        `A tensão de "${ref}" nasce do que não é dito: os olhares, os silêncios e as faíscas que os protagonistas tentam desesperadamente ignorar e fracassam magnificamente.`,
        `Ao contrário dos romances que resolvem conflitos facilmente, "${ref}" força seus personagens a encarar traumas reais antes que o amor possa se tornar sustentável.`,
        `Dois protagonistas em "${ref}" que parecem incompatíveis em público compartilham uma vulnerabilidade idêntica que nenhum deles consegue admitir — e isso é o que os une.`,
      ],
      'thriller-mystery': [
        `Em "${ref}", o culpado mais perigoso nunca é quem parece ameaçador — mas quem tem mais a perder e controla a investigação desde o primeiro capítulo.`,
        `A premissa de "${ref}" desafia o leitor: as pistas todas estão lá desde a página 1, mas a perspectiva do narrador as distorce de forma calculada e matematicamente honesta.`,
        `Ao contrário de thrillers genéricos, "${ref}" não usa coincidências dramáticas — toda reviravolta é consequência lógica de decisões que o leitor já acompanhou sem perceber.`,
        `Em "${ref}", a tensão não vem de perseguições físicas, mas do colapso lento e inevitável de uma mentira construída por anos que o protagonista não pode parar de investigar.`,
      ],
      'habits-self-help': [
        `A premissa de "${ref}": você não falha por falta de motivação, mas porque seus sistemas e seu ambiente ainda trabalham contra os seus objetivos declarados.`,
        `Em "${ref}", pequenos hábitos executados com consistência brutal superam qualquer insight motivacional passageiro — e esse é o segredo que a indústria do coaching não ensina.`,
        `Ao contrário da maioria dos livros de produtividade, "${ref}" não promete transformação rápida — entrega um método de construção lenta, sólida e irreversível de disciplina real.`,
        `"${ref}" parte de uma premissa neurocientífica: você se eleva ao nível dos seus sistemas, não dos seus objetivos — e sistemas exigem arquitetura, não motivação.`,
      ],
      'business-entrepreneurship': [
        `A tese central de "${ref}": empresas não quebram por falta de ideias geniais, mas por negligência crônica nos processos básicos de execução e geração de caixa.`,
        `Em "${ref}", liderança eficaz não é sobre inspirar discursos — é sobre construir sistemas que funcionam mesmo quando o fundador está de férias.`,
        `Ao contrário de livros de negócios que glorificam o empreendedor solitário, "${ref}" revela que escala real exige delegação estruturada e métricas que não dependem de intuição.`,
        `"${ref}" destrói o mito do fundador que trabalha 18 horas por dia: resultado escalável vem de alavancagem inteligente, não de esforço multiplicado por exaustão.`,
      ],
      'finance-investing': [
        `A verdade central de "${ref}": riqueza real não é faturamento alto, mas a capacidade de acumular ativos que geram renda enquanto você dorme — e isso não exige herança.`,
        `Em "${ref}", o maior inimigo do investidor não é a volatilidade do mercado — é a impaciência que destrói posições sólidas nos momentos de correção que antecedem os maiores ganhos.`,
        `"${ref}" parte do princípio que a maioria dos cursos de finanças ignora: enriquecer é matematicamente chato, sistemático e depende mais de comportamento do que de estratégia.`,
        `Ao contrário dos gurus de investimento que prometem retornos rápidos, "${ref}" entrega um método conservador, comprovado e que permite dormir tranquilo independente do noticiário.`,
      ],
      'health-wellness': [
        `A premissa de "${ref}": o corpo humano não está quebrado — ele responde exatamente ao ambiente que criamos para ele, e mudar esse ambiente é mais simples do que parece.`,
        `Em "${ref}", longevidade não é um privilégio genético — é o resultado previsível de decisões pequenas e consistentes que qualquer pessoa pode implementar sem academia ou dieta radical.`,
        `"${ref}" rejeita o modelo de saúde baseado em restrição e culpa, propondo protocolos baseados em adição de hábitos positivos que o corpo adota voluntariamente.`,
        `Ao contrário de guias de saúde genéricos, "${ref}" foi construído a partir de evidências científicas, sem modismos ou promessas de transformação em 21 dias.`,
      ],
    };

    const tonePrefix = tone.includes('Formal') ? 'A tese central de' :
      tone.includes('Inspirador') ? 'A visão transformadora de' :
      tone.includes('Acadêmico') ? 'A proposição analítica de' :
      tone.includes('Direto') ? 'A premissa direta de' : 'O posicionamento único de';

    const list = stanceByDomain[domain] || [
      `${tonePrefix} "${ref}": uma perspectiva autêntica que prioriza verdades práticas em vez de fórmulas superficiais que prometem tudo sem entregar nada.`,
      `${tonePrefix} "${ref}": desconstrução dos mitos mais nocivos do tema, com clareza cirúrgica e aplicação imediata no cotidiano real do leitor.`,
      `"${ref}" parte do princípio que o mercado editorial ignora sistematicamente: profundidade real e leitura acessível não são mutuamente exclusivos.`,
      `O diferencial de "${ref}": combina rigor investigativo com comunicação direta, eliminando a barreira entre conhecimento especializado e aplicação cotidiana.`,
    ];

    const histSize = history?.size || 0;
    let attempts = 0;
    while (attempts < list.length) {
      const candidate = list[(histSize + attempts) % list.length];
      if (!history?.has(candidate)) return candidate;
      attempts++;
    }
    return list[0];
  }

  // ───────────────────────────────────────────────────────────────────────────
  // GERADOR DE DIFERENCIAL — usa título + tópico + gênero + tom
  // ───────────────────────────────────────────────────────────────────────────
  private static generateContextualStandout(
    project: BookProject,
    ctx?: any,
    history?: Set<string>
  ): string {
    const title    = (ctx?.bookTitle || project.title || '').trim();
    const topic    = (ctx?.topic || project.topic || '').trim();
    const domain   = this.detectDomain(project, ctx);
    const tone     = (ctx?.authorTone || project.stageData?.research?.authorTone || '').trim();
    const genAud   = (ctx?.generalAudience || project.stageData?.research?.generalAudience || '').trim();

    const ref = title || topic || 'esta obra';

    const standoutByDomain: Record<string, string[]> = {
      'fantasy-sword-sorcery': [
        `Coreografia de combate hiper-realista em "${ref}" inspirada em esgrima histórica europeia e táticas de cerco medievais verificadas.`,
        `Sistema de magia "Hard Magic" com regras rigorosas, limitações fisiológicas e custos arcanos que tornam cada duelo genuinamente tenso em "${ref}".`,
        `Protagonista veterano e moralmente ambíguo em "${ref}" — sem a ingenuidade do jovem herói predestinado que já vimos mil vezes.`,
        `Worldbuilding orgânico em "${ref}" com dialetos regionais, tratados geopolíticos e ruínas com lendas ancestrais que emergem naturalmente na narrativa.`,
      ],
      'romance': [
        `Construção de tensão "slow-burn" precisa em "${ref}", onde cada olhar e gesto carregado antecipa o que ambos negam publicamente.`,
        `Diálogos com farpas afiadas e subtext emocional denso em "${ref}" — o leitor sente a atração antes dos próprios personagens admitirem.`,
        `Resolução psicológica crível em "${ref}" que não apaga traumas com um beijo, mas os trabalha com maturidade emocional rara no gênero.`,
        `Protagonista feminina de "${ref}" com carreira sólida, convicções inabaláveis e agência própria que não sacrifica sua identidade pelo interesse amoroso.`,
      ],
      'thriller-mystery': [
        `Três plot twists calculados matematicamente em "${ref}" com pistas discretas espalhadas organicamente desde o primeiro capítulo.`,
        `Procedimentos investigativos e forenses de "${ref}" verificados com rigor policial real — sem atalhos narrativos que quebram a credibilidade.`,
        `Capítulos curtos com cliffhangers precisos em "${ref}" que tornam fisicamente impossível parar antes do desfecho final.`,
        `Antagonista de "${ref}" com motivações genuinamente compreensíveis — o leitor pode discordar, mas jamais acha o vilão burro ou conveniente.`,
      ],
      'habits-self-help': [
        `Método dos "Micro-Passos de 2 Minutos" em "${ref}" com embasamento em neurociência comportamental sem jargão acadêmico hermético.`,
        `Zero positividade tóxica em "${ref}": protocolos realistas para manter disciplina mesmo em dias caóticos de baixa motivação e alta exaustão.`,
        `Rastreadores visuais de hábito e checklists de encerramento de dia em "${ref}" que geram responsabilização concreta e mensurável.`,
        `"${ref}" entrega um sistema adaptável à realidade brasileira, com exemplos de profissionais reais que aplicaram o método com rotinas similares.`,
      ],
      'business-entrepreneurship': [
        `Framework visual proprietário de "${ref}" testado em centenas de empresas com diagnóstico semanal e checklist de decisão estruturado.`,
        `Estudos de caso reais de erros catastróficos em "${ref}" — com análise do que foi feito errado e como reverter antes da falência.`,
        `Modelos de rotinas de liderança em "${ref}" que reduzem em 60% a dependência operacional do fundador em até 90 dias.`,
        `"${ref}" inclui planilhas de diagnóstico empresarial e dashboards de KPIs que o leitor pode aplicar na mesma semana da leitura.`,
      ],
      'finance-investing': [
        `Planilhas de simulação prontas em "${ref}" que calculam a meta de independência financeira em 3 cenários econômicos distintos.`,
        `Linguagem completamente desmistificada em "${ref}" — sem jargões bancários, sem promessas milagrosas, com foco em investidores comuns da vida real.`,
        `Método em 5 passos de "${ref}" para blindar patrimônio contra inflação e volatilidade política com alocação diversificada e de baixo custo.`,
        `"${ref}" é o único guia financeiro que combina educação conceitual com planilha de aportes mensais personalizada por perfil de risco real.`,
      ],
      'health-wellness': [
        `Protocolos de "${ref}" validados por estudos peer-reviewed com linguagem acessível — sem modismos ou soluções mágicas sem evidência.`,
        `Guia de "${ref}" com plano de 30 dias, receitas práticas e rotina de sono estruturada que o leitor pode iniciar na mesma noite da leitura.`,
        `"${ref}" evita o ciclo de culpa e restrição: foca na adição de comportamentos positivos que o organismo aceita naturalmente sem resistência.`,
        `Abordagem integrativa de "${ref}" que une sono, nutrição, movimento e gestão do estresse como pilares interdependentes, não soluções isoladas.`,
      ],
    };

    const audSuffix = genAud.includes('Profission') ? ' — com exemplos do mundo corporativo e executivo.'
      : genAud.includes('Iniciante') ? ' — acessível a quem começa do zero sem experiência prévia.'
      : genAud.includes('Infantil') ? ' — com linguagem lúdica e ilustrações que facilitam a compreensão.'
      : '.';

    const list = standoutByDomain[domain] || [
      `Metodologia estruturada passo a passo em "${ref}" com foco em resultados mensuráveis e clareza absoluta${audSuffix}`,
      `Perspectiva autoral única em "${ref}" que combina rigor investigativo com comunicação envolvente e direta${audSuffix}`,
      `Exemplos contemporâneos e aplicações práticas em "${ref}" que diferenciam esta obra de tudo o que existe no mercado${audSuffix}`,
      `"${ref}" entrega ao leitor ferramentas práticas que podem ser aplicadas imediatamente, sem depender de recursos adicionais${audSuffix}`,
    ];

    const histSize = history?.size || 0;
    let attempts = 0;
    while (attempts < list.length) {
      const candidate = list[(histSize + attempts) % list.length];
      if (!history?.has(candidate)) return candidate;
      attempts++;
    }
    return list[0];
  }

  // ───────────────────────────────────────────────────────────────────────────
  // GERADOR DE HISTÓRICO/TRAJETÓRIA DO AUTOR
  // Usa título + tópico + gênero para criar uma trajetória coerente com o livro
  // ───────────────────────────────────────────────────────────────────────────
  private static generateAuthorBackground(
    project: BookProject,
    ctx?: any,
    history?: Set<string>
  ): string {
    const title   = (ctx?.bookTitle || project.title || '').trim();
    const topic   = (ctx?.topic || project.topic || '').trim();
    const domain  = this.detectDomain(project, ctx);
    const nameType = project.stageData?.['author-bio']?.nameType || 'pen-name';
    const ref     = title || topic || 'esta obra';
    const isPen   = nameType === 'pen-name';

    const backgroundByDomain: Record<string, string[]> = {
      'fantasy-sword-sorcery': [
        `${isPen ? 'Escritor independente com' : 'Pesquisador e autor com'} mais de uma década dedicada ao estudo de táticas militares medievais, sistemas de magia rigorosos e mitologia ancestral europeia — toda a fundamentação que deu vida a "${ref}".`,
        `Apaixonado por história da guerra e folclore nórdico, forjou "${ref}" após anos de pesquisa em crônicas medievais, tratados de esgrima histórica e cosmogonias de civilizações extintas.`,
        `Veterano mestre de campanhas de RPG e escritor de ficção sombria com presença consolidada no nicho de Dark Fantasy e Sword & Sorcery — "${ref}" reúne anos de construção de universos maduros.`,
        `Escritor formado na tradição grimdark, com domínio profundo de worldbuilding geopolítico e sistemas arcanos consistentes, cujas raízes em "${ref}" foram plantadas muito antes da primeira palavra ser escrita.`,
      ],
      'romance': [
        `${isPen ? 'Autora' : 'Escritora'} de romances contemporâneos e dramas emocionais com trajetória consolidada na criação de casais com química irresistível — "${ref}" é a obra mais pessoal e intensa de sua carreira.`,
        `Formada em Psicologia dos Relacionamentos e escritora de ficção com foco em protagonistas femininas autênticas e independentes, cujos personagens de "${ref}" emergem de observações profundas da dinâmica humana.`,
        `Contadora de histórias desde adolescente, especializou-se em romances de alta tensão emocional com diálogos afiados e reviravoltas afetivas que prendem o leitor — tudo presente em "${ref}".`,
        `Autora de literatura feminina com vasta experiência em narrativas de second chance e enemies-to-lovers, trazendo em "${ref}" toda a riqueza emocional que define seu estilo inconfundível.`,
      ],
      'thriller-mystery': [
        `Ex-jornalista investigativo e escritor de suspense com fascínio pela psicologia dos culpados — cada detalhe forense e processual de "${ref}" foi meticulosamente verificado antes de ser escrito.`,
        `Autor com formação em Direito e Criminologia Aplicada, que transformou anos de estudo de casos reais em "${ref}" — um thriller onde cada pista e procedimento seguem protocolos investigativos verossímeis.`,
        `Escritor de narrativas policiais com experiência em análise comportamental e profiling criminal, cujo método de construção de suspeitos em "${ref}" espelha técnicas usadas por investigadores reais.`,
        `Romancista de suspense com décadas dedicadas a desconstruir o que torna uma reviravolta genuinamente surpreendente — a obra "${ref}" é a destilação mais refinada dessa pesquisa obsessiva.`,
      ],
      'habits-self-help': [
        `Coach de produtividade certificado com anos de trabalho acompanhando profissionais sobrecarregados que transformaram suas rotinas usando exatamente os princípios condensados em "${ref}".`,
        `Especialista em neurociência comportamental e arquitetura de hábitos, com formação prática e centenas de sessões de implementação que validaram o método apresentado em "${ref}".`,
        `${isPen ? 'Consultor' : 'Profissional'} de alto desempenho que viveu na pele o ciclo de procrastinação e reinvenção — "${ref}" é a síntese honesta do que realmente funciona, sem atalhos.`,
        `Facilitador de workshops de produtividade com mais de 5.000 pessoas impactadas e dados reais de implementação que embasam cada técnica descrita em "${ref}".`,
      ],
      'business-entrepreneurship': [
        `Empreendedor serial com três empresas fundadas e uma experiência genuína de escala e fracasso — "${ref}" condensa as lições que nenhum mentor pago entregaria com essa honestidade.`,
        `Consultor de crescimento empresarial com histórico de acompanhamento de startups em fase de aceleração, usando os mesmos frameworks que estruturam "${ref}".`,
        `Gestor com carreira em multinacionais e no empreendedorismo independente, que combinou as melhores práticas de ambos os mundos na metodologia central de "${ref}".`,
        `Fundador de negócios de serviços e produtos digitais, com trajetória marcada por erros estratégicos transformados em aprendizado — a mesma honestidade que permeia cada capítulo de "${ref}".`,
      ],
      'finance-investing': [
        `Educador financeiro com certificação em Planejamento Financeiro Pessoal e anos acompanhando investidores comuns conquistarem independência — exatamente o que "${ref}" entrega de forma acessível.`,
        `Analista de investimentos com experiência em gestão de carteiras que decidiu simplificar o que Wall Street complica — "${ref}" é o resultado dessa missão de democratizar o conhecimento financeiro.`,
        `Investidor de longo prazo e educador financeiro que construiu seu próprio patrimônio partindo do zero usando os princípios que hoje ensina em "${ref}".`,
        `Especialista em finanças pessoais com formação em Economia e anos de conteúdo educativo voltado para quem quer investir com inteligência sem precisar de fortuna inicial — base de "${ref}".`,
      ],
      'health-wellness': [
        `Profissional de saúde com ${isPen ? 'vasta experiência clínica' : 'formação em medicina funcional e longevidade'} e centenas de pacientes que aplicaram os protocolos descritos em "${ref}".`,
        `Especialista em medicina preventiva e otimização de bem-estar, com pesquisa dedicada a soluções sem remédios que formam o núcleo científico de "${ref}".`,
        `Nutricionista e coach de saúde integrativa com trajetória marcada por casos reais de reversão de esgotamento crônico — histórias que inspiraram diretamente "${ref}".`,
        `Profissional de saúde e escritor comprometido com a desmistificação da longevidade, oferecendo em "${ref}" o mesmo protocolo que aplica com seus próprios pacientes.`,
      ],
      'general-nonfiction': [
        `Pesquisador independente e escritor com trajetória dedicada a tornar conhecimento especializado acessível — "${ref}" representa anos de síntese e experiência direta com o tema.`,
        `Profissional com experiência multidisciplinar que decidiu documentar o que realmente funciona sobre o tema de "${ref}", sem jargão acadêmico e com aplicabilidade imediata.`,
        `Autor comprometido com a precisão e a relevância, cujo processo de criação de "${ref}" envolveu pesquisa extensa, entrevistas e validação prática antes da publicação.`,
        `Escritor com formação sólida e experiência de campo no tema de "${ref}", reconhecido pela capacidade de transformar complexidade em clareza sem perder profundidade.`,
      ],
    };

    const list = backgroundByDomain[domain] || backgroundByDomain['general-nonfiction'];
    const histSize = history?.size || 0;
    let attempts = 0;
    while (attempts < list.length) {
      const candidate = list[(histSize + attempts) % list.length];
      if (!history?.has(candidate)) return candidate;
      attempts++;
    }
    return list[0];
  }

  // ───────────────────────────────────────────────────────────────────────────
  // GERADOR DE CONQUISTAS/RESULTADOS DO AUTOR
  // Adequado ao gênero e ao título do livro específico
  // ───────────────────────────────────────────────────────────────────────────
  private static generateAuthorAchievements(
    project: BookProject,
    ctx?: any,
    history?: Set<string>
  ): string {
    const title  = (ctx?.bookTitle || project.title || '').trim();
    const domain = this.detectDomain(project, ctx);
    const ref    = title || 'esta obra';

    const achievementsByDomain: Record<string, string[]> = {
      'fantasy-sword-sorcery': [
        `Top 10 Bestseller em Fantasia Heroica e Dark Fantasy no Kindle Unlimited — "${ref}" acumulou dezenas de milhares de páginas lidas e 4.8 estrelas em avaliações especializadas.`,
        `Mais de 5.000 avaliações 5 estrelas na comunidade internacional de leitores de fantasia épica e Sword & Sorcery, com "${ref}" se tornando referência no segmento.`,
        `Reconhecido pela crítica especializada por sistemas de magia rigorosos e coreografia de batalhas verídicas — os pilares que consagraram "${ref}" entre leitores exigentes.`,
        `Autor com presença consolidada em fóruns de Dark Fantasy e comunidades de RPG, onde "${ref}" é citado como exemplo de hard magic bem executado.`,
      ],
      'romance': [
        `Autora com mais de 100.000 cópias distribuídas no Kindle Unlimited e leitoras fiéis que acompanham cada lançamento — "${ref}" já foi indicado como leitura obrigatória no BookTok.`,
        `Avaliação média de 4.7 estrelas com milhares de resenhas destacando a química irresistível e a tensão emocional de "${ref}" como diferenciais únicos do gênero.`,
        `Finalista de prêmios de literatura independente na categoria Ficção Feminina & Romance, com "${ref}" consolidando sua posição entre as autoras mais aguardadas do segmento.`,
        `Mais de 50.000 seguidores no Bookstagram e BookTok que acompanham a trajetória da autora e tornaram "${ref}" um fenômeno de pré-venda antes mesmo do lançamento.`,
      ],
      'thriller-mystery': [
        `Autor com dois thrillers na lista de mais vendidos da Amazon Brasil, onde "${ref}" estreou diretamente no top 5 de Suspense Psicológico com avaliação 4.9 estrelas.`,
        `Reconhecido por críticos especializados pela precisão forense e pela estrutura de plot twists de "${ref}" — citado como referência obrigatória no gênero investigativo nacional.`,
        `Mais de 30.000 leitores ativos no Kindle Unlimited que já leram seus thrillers anteriores e aguardavam com expectativa cada detalhe do lançamento de "${ref}".`,
        `Premiado em concursos de literatura de suspense com "${ref}" sendo selecionado para programa de destaque editorial na Amazon KDP por excelência técnica.`,
      ],
      'habits-self-help': [
        `Mais de 15.000 profissionais que aplicaram o método descrito em "${ref}" com resultados documentados de redução de 40% na procrastinação em 30 dias.`,
        `Speaker em conferências corporativas de produtividade com "${ref}" sendo distribuído como material oficial em programas de desenvolvimento de liderança.`,
        `Autor com curso online com mais de 8.000 alunos e avaliação 4.9 estrelas — "${ref}" é a versão expandida e aprofundada do conteúdo que transformou essas vidas.`,
        `Top 3 em Autoajuda & Produtividade na Amazon KDP durante três semanas consecutivas após lançamento — "${ref}" tornou-se referência em grupos de estudo e mentorias.`,
      ],
      'business-entrepreneurship': [
        `Consultor que gerou mais de R$ 50 milhões em crescimento incremental para seus clientes usando os frameworks que agora estão sistematizados em "${ref}".`,
        `Palestrante em eventos de empreendedorismo com mais de 20.000 empresários impactados e "${ref}" já adotado como leitura obrigatória em aceleradoras de startups.`,
        `Top vendas em Empreendedorismo na Amazon por 4 semanas consecutivas — "${ref}" tornou-se material de referência em MBAs e programas de aceleração empresarial.`,
        `Autor de dois outros bestsellers de negócios com "${ref}" sendo seu trabalho mais completo e já traduzido para distribuição no mercado português e espanhol.`,
      ],
      'finance-investing': [
        `Educador financeiro com canal de conteúdo seguido por mais de 200.000 pessoas — "${ref}" é a destilação do conhecimento que transformou a vida financeira de milhares de seguidores.`,
        `Top vendas em Finanças Pessoais e Investimentos na Amazon por 6 semanas consecutivas — "${ref}" recomendado por analistas e investidores independentes como a melhor introdução prática ao tema.`,
        `Autor com experiência em gestão de patrimônio para clientes com perfis variados, cujos casos de sucesso documentados formam a base prática de "${ref}".`,
        `Colaborador de portais financeiros de referência com mais de 500 artigos publicados — "${ref}" representa a síntese mais completa de sua contribuição ao tema.`,
      ],
      'health-wellness': [
        `Profissional com mais de 3.000 pacientes e clientes atendidos usando os protocolos descritos em "${ref}", com taxas documentadas de melhora de qualidade de vida acima de 85%.`,
        `Palestrante convidado em congressos médicos e de bem-estar integrativo, com "${ref}" sendo distribuído como material de referência para profissionais de saúde.`,
        `Canal de educação em saúde com mais de 150.000 seguidores — "${ref}" surgiu da demanda dos próprios seguidores por um guia completo e baseado em evidências.`,
        `Autor de artigos científicos revisados por pares e conteúdo de divulgação científica com "${ref}" sendo sua primeira obra voltada ao público amplo sem perda de rigor técnico.`,
      ],
      'general-nonfiction': [
        `Autor com reconhecimento em feiras literárias e prêmios de não-ficção — "${ref}" consolida uma trajetória de pesquisa séria e escrita de impacto sobre o tema.`,
        `Mais de 10.000 leitores fiéis que já acompanham seu trabalho anterior e aguardavam "${ref}" como a obra definitiva de sua carreira intelectual.`,
        `Colaborador regular de publicações especializadas com "${ref}" sendo sua contribuição mais ambiciosa e completa sobre o assunto.`,
        `Palestra sobre o tema de "${ref}" com mais de 50.000 visualizações e convites para contribuição em programas educacionais e corporativos.`,
      ],
    };

    const list = achievementsByDomain[domain] || achievementsByDomain['general-nonfiction'];
    const histSize = history?.size || 0;
    let attempts = 0;
    while (attempts < list.length) {
      const candidate = list[(histSize + attempts) % list.length];
      if (!history?.has(candidate)) return candidate;
      attempts++;
    }
    return list[0];
  }

  // ───────────────────────────────────────────────────────────────────────────
  // GERADOR DE DETALHES PESSOAIS/HOBBIES DO AUTOR
  // Cria conexão humana coerente com o universo do livro
  // ───────────────────────────────────────────────────────────────────────────
  private static generateAuthorPersonalDetails(
    project: BookProject,
    ctx?: any,
    history?: Set<string>
  ): string {
    const title  = (ctx?.bookTitle || project.title || '').trim();
    const domain = this.detectDomain(project, ctx);
    const ref    = title || 'esta obra';

    const personalByDomain: Record<string, string[]> = {
      'fantasy-sword-sorcery': [
        `Escreve ouvindo trilhas orquestrais nórdicas e é mestre veterano de campanhas de RPG — os mundos de "${ref}" foram testados em mesa antes de chegarem ao papel.`,
        `Colecionador de réplicas de armas históricas e estudioso de folclore medieval, passa as madrugadas dividido entre a escrita e a leitura de crônicas ancestrais que inspiram "${ref}".`,
        `Vive em uma casa ladeada de livros de história antiga e mapas medievais, onde cada sessão de escrita de "${ref}" começa com café forte e uma playlist de música épica.`,
        `Amante de jogos de estratégia e filmes de fantasia épica, mantém um diário de worldbuilding com centenas de páginas de notas sobre o universo de "${ref}".`,
      ],
      'romance': [
        `Apaixonada por cafés especiais, maratonas de séries românticas e playlists acústicas que inspiraram cada cena de "${ref}" — acredita que toda grande história começa com uma emoção real.`,
        `Mora em uma casa aconchegante com dois gatos resgatados, divide o tempo livre entre descobrir novos livros em sebos e escrever os diálogos intensos que marcam "${ref}".`,
        `Colecionadora de correspondências amorosas históricas e admiradora de narrativas que transformam a vulnerabilidade em força — a filosofia que guia cada personagem de "${ref}".`,
        `Pratica escrita criativa desde a adolescência e acredita que o romance mais poderoso é aquele que faz o leitor sentir algo que ainda não tem palavras — objetivo central de "${ref}".`,
      ],
      'thriller-mystery': [
        `Devora true crime e documentários policiais como pesquisa, e passa horas estudando técnicas de interrogatório que depois aparecem nos capítulos mais tensos de "${ref}".`,
        `Amante de jogos de dedução e quebra-cabeças lógicos — testa cada reviravolta de "${ref}" com beta-readers especializados para garantir que o plot twist seja inesperado, mas justo.`,
        `Escreve em um escritório decorado com mapas de ficção, fotos de cenas investigativas e post-its com a linha do tempo do crime de "${ref}" que cobre uma parede inteira.`,
        `Obcecado com a pergunta "por quê as pessoas mentem?" — a investigação filosófica que permeia cada personagem e motivação de "${ref}" e que o mantém escrevendo até de madrugada.`,
      ],
      'habits-self-help': [
        `Levanta às 5h todos os dias para um ritual de escrita que aplica exatamente o que ensina em "${ref}" — a melhor prova de que o método funciona é a própria vida do autor.`,
        `Pratica meditação e revisão de hábitos semanalmente, e usa os resultados da sua própria rotina como laboratório vivo para refinar os sistemas descritos em "${ref}".`,
        `Entusiasta de neurociência, psicologia positiva e biohacking responsável — as horas passadas estudando comportamento humano resultaram no método prático de "${ref}".`,
        `Corre maratonas e acredita que a disciplina física e mental compartilham os mesmos princípios — os mesmos que fundamentam cada técnica ensinada em "${ref}".`,
      ],
      'business-entrepreneurship': [
        `Fundou sua primeira empresa aos 23 anos e desde então não para de aprender com erros e acertos que moldam a visão prática exposta em "${ref}".`,
        `Nos fins de semana, mentora jovens empreendedores gratuitamente em incubadoras locais — os mesmos insights que compartilha nessas sessões estão sistematizados em "${ref}".`,
        `Leitor voraz de cases empresariais e estudos de estratégia corporativa, combina conhecimento técnico com experiência real de mercado na fundamentação de "${ref}".`,
        `Acredita que o melhor escritório é aquele que o dono não precisa frequentar todos os dias — e passou anos construindo os sistemas de "${ref}" para provar essa teoria na prática.`,
      ],
      'finance-investing': [
        `Investe desde os 22 anos e aprendeu mais com os erros do que com os acertos — toda essa jornada está documentada com honestidade incomum ao longo de "${ref}".`,
        `Aficionado por comportamento econômico e psicologia do dinheiro, passa os fins de semana lendo relatórios de fundos e estudando padrões que depois aparecem em "${ref}".`,
        `Acredita que a maior riqueza é o controle sobre o próprio tempo — e passou anos desenvolvendo e testando o método de "${ref}" antes de colocá-lo em forma de livro.`,
        `Apreciador de cafés tranquilos e conversas sobre finanças sem jargão, acredita que todo brasileiro merece acesso ao conhecimento que o ajudou a sair do vermelho e chegar até "${ref}".`,
      ],
      'health-wellness': [
        `Passou anos testando em si mesmo os protocolos que descreve em "${ref}" — e a diferença de energia, sono e disposição foi o que o convenceu a escrever o guia.`,
        `Pratica corrida, meditação e culinária funcional como parte de uma rotina que aplica os mesmos princípios ensinados em "${ref}" — e compartilha os resultados com transparência.`,
        `Acredita que saúde real começa na cozinha e na qualidade do sono, e construiu "${ref}" como o guia que gostaria de ter tido quando mais precisava de orientação clara.`,
        `Fã de culinária saudável e caminhadas na natureza, encontra nos ritmos simples da vida os mesmos padrões de equilíbrio que fundamentam os protocolos de "${ref}".`,
      ],
      'general-nonfiction': [
        `Leitor insaciável com mais de 200 livros por ano e a crença de que o melhor livro é aquele que muda algo na maneira de ver o mundo — missão que guia cada palavra de "${ref}".`,
        `Apreciador de debates intelectuais, documentários profundos e conversas que duram horas — o mesmo rigor curioso que resultou na pesquisa por trás de "${ref}".`,
        `Escreve nos intervalos de uma vida movimentada, acreditando que as melhores ideias surgem entre compromissos — o processo orgânico que moldou a perspectiva única de "${ref}".`,
        `Acredita que todo especialista tem a obrigação moral de tornar seu conhecimento acessível — e foi esse princípio que o motivou a transformar anos de experiência em "${ref}".`,
      ],
    };

    const list = personalByDomain[domain] || personalByDomain['general-nonfiction'];
    const histSize = history?.size || 0;
    let attempts = 0;
    while (attempts < list.length) {
      const candidate = list[(histSize + attempts) % list.length];
      if (!history?.has(candidate)) return candidate;
      attempts++;
    }
    return list[0];
  }

  /**
   * Gerador de Avatar 100% Contextual
   * Constrói a descrição do leitor ideal cruzando TODOS os dados já preenchidos:
   * título, tópico, gênero KDP, audiência geral, tom de voz e posicionamento.
   * Nunca repete sugestões consecutivas dentro da mesma sessão.
   */
  private static generateContextualAvatar(
    project: BookProject,
    currentFormContext?: any,
    usedHistory?: Set<string>
  ): string {
    // Coleta todos os campos preenchidos para máxima contextualização
    const title     = (currentFormContext?.bookTitle || project.title || '').trim();
    const topic     = (currentFormContext?.topic || project.topic || '').trim();
    const genAud    = (currentFormContext?.generalAudience || project.stageData?.research?.generalAudience || '').trim();
    const tone      = (currentFormContext?.authorTone || project.stageData?.research?.authorTone || '').trim();
    const stance    = (currentFormContext?.stance || project.stageData?.research?.stance || '').trim();
    const domain    = this.detectDomain(project, currentFormContext);

    const bookRef   = title || topic || 'este livro';
    const topicRef  = topic || title || 'o tema central';

    // ─── Perfis demográficos por audiência geral ───────────────────────────
    const demographicMap: Record<string, string> = {
      'Profissionais & Empreendedores': 'profissionais entre 28 e 50 anos, empreendedores, gestores e líderes de equipe',
      'Iniciantes / Leigos no Assunto': 'iniciantes e curiosos sem experiência prévia no tema, geralmente entre 20 e 45 anos',
      'Jovens Adultos (YA)': 'jovens entre 16 e 28 anos em fase de construção de identidade e autonomia',
      'Infantil / Família': 'pais, educadores e responsáveis que buscam conteúdo de valor para crianças entre 3 e 10 anos',
      'Acadêmicos & Especialistas': 'especialistas, pesquisadores, estudantes de pós-graduação e profissionais técnicos',
      'Melhor Idade': 'adultos acima de 55 anos com tempo livre e interesse em aprendizado e qualidade de vida',
      'Público Geral Adulto': 'adultos entre 25 e 55 anos de diferentes contextos sociais e profissionais',
    };
    const demographic = demographicMap[genAud] || 'adultos de diferentes perfis socioeconômicos';

    // ─── Mapa de dores e aspirações por domínio editorial ─────────────────
    const domainAvatarParts: Record<string, { dores: string[]; aspiracoes: string[]; comportamento: string[] }> = {
      'fantasy-sword-sorcery': {
        dores: [
          'decepcionados com fantasia genérica e protagonistas invencíveis sem conflito real',
          'frustrados com histórias que evitam consequências reais e finais fáceis',
          'insatisfeitos com livros que priorizam romance em detrimento da ação e da política interna dos reinos',
        ],
        aspiracoes: [
          'mergulhar em universos com sistemas de magia coerentes e regras rigorosas',
          'acompanhar personagens moralmente complexos que pagam caro por cada decisão',
          'viver batalhas viscerais e conspirações de corte que os prendam até a última página',
        ],
        comportamento: [
          'participam ativamente de comunidades de RPG, BookTok de fantasia e grupos de leitura dedicados',
          'consomem sagas completas em sequência e releem favoritos múltiplas vezes',
          'buscam por autores no Kindle Unlimited e frequentam convenções de geek culture',
        ]
      },
      'romance': {
        dores: [
          'carentes de histórias com tensão emocional real e personagens com profundidade psicológica',
          'cansadas de romances rasos com resolução fácil e sem conflito genuíno entre os protagonistas',
          'frustradas com a falta de representatividade de relacionamentos maduros e complexos na ficção',
        ],
        aspiracoes: [
          'encontrar histórias que as façam sentir a química e a tensão de dentro para fora',
          'acompanhar arcos emocionais que as façam chorar, se emocionar e torcer intensamente',
          'escapar da rotina com personagens carismáticos e universos cheios de sentimento e desejo',
        ],
        comportamento: [
          'são vorazes consumidoras de séries românticas no Kindle Unlimited e Bookstagram',
          'seguem influenciadoras literárias no BookTok e descobrem novos lançamentos por recomendação',
          'priorizam livros com avaliações acima de 4.5 estrelas e resenhas que mencionam o choro',
        ]
      },
      'thriller-mystery': {
        dores: [
          'entediados com thrillers previsíveis onde o culpado é óbvio desde o primeiro capítulo',
          'frustrados com investigações que ignoram verossimilhança processual e forense',
          'decepcionados com narradores que trapaceiam o leitor em vez de surpreendê-lo com pistas honestas',
        ],
        aspiracoes: [
          'desvendar o enigma antes da revelação final e se sentir inteligente ao fazer isso',
          'ser surpreendidos por plot twists bem construídos que reinterpretam toda a narrativa',
          'viver a tensão de uma corrida contra o tempo em que cada detalhe conta',
        ],
        comportamento: [
          'leem suspenses em ráfagas, ficando acordados madrugadas para terminar o livro',
          'recomendam ativamente os livros que os surpreenderam para círculos de leitores fiéis',
          'acompanham adaptações para séries e filmes e comparam com os livros originais',
        ]
      },
      'scifi-dystopia': {
        dores: [
          'saturados de ficções científicas que ignoram a coerência tecnológica e científica interna',
          'frustrados com distopias repetitivas que replicam a mesma fórmula adolescente sem inovação',
          'entediados com narrativas de IA que não exploram as reais implicações filosóficas e sociais',
        ],
        aspiracoes: [
          'explorar futuros plausíveis que desafiem sua visão sobre tecnologia, humanidade e poder',
          'se perder em worldbuildings que parecem tão coerentes quanto um documentário científico',
          'encontrar personagens que os force a questionar o que significa ser humano',
        ],
        comportamento: [
          'são leitores técnicos que consomem simultâneamente ficção científica e não-ficção de tecnologia',
          'participam de fóruns de discussão profunda sobre universos ficcionais e suas implicações',
          'valorizam autores que realizam pesquisa científica sólida antes de escrever',
        ]
      },
      'habits-self-help': {
        dores: [
          'sobrecarregados pela sensação constante de improdutividade apesar do esforço diário',
          'frustrados com métodos complexos de produtividade que funcionam por 3 dias e somem',
          'exaustos por procrastinar projetos importantes que definem o futuro deles',
        ],
        aspiracoes: [
          'construir uma rotina sólida que funcione mesmo nos dias mais caóticos e sem motivação',
          'sair do ciclo de início e abandono de metas e finalmente avançar em projetos relevantes',
          'sentir que controlam o tempo deles e não são controlados por notificações e urgências alheias',
        ],
        comportamento: [
          'já leram múltiplos livros de produtividade e buscam algo que de fato gere resultados duradouros',
          'acompanham podcasts e canais de YouTube sobre neurociência, foco e performance cognitiva',
          'consomem livros no formato digital e em áudio para otimizar o tempo de deslocamento',
        ]
      },
      'business-entrepreneurship': {
        dores: [
          'estagnados em negócios que não crescem por falta de sistema e não de esforço',
          'sobrecarregados com operação diária e sem tempo para pensar em estratégia de expansão',
          'frustrados com consultores caros que entregam teoria e não aplicação prática',
        ],
        aspiracoes: [
          'ter um negócio que funcione com menos dependência deles mesmos como operadores principais',
          'dobrar o faturamento sem dobrar as horas trabalhadas ou a equipe atual',
          'entender quais métricas realmente importam para escalar com previsibilidade',
        ],
        comportamento: [
          'investem em cursos, livros e mentorias e aplicam o conhecimento ativamente',
          'participam de grupos de mastermind e redes de empreendedores locais e digitais',
          'buscam leituras que tragam ROI direto e aplicável, não reflexões filosóficas',
        ]
      },
      'finance-investing': {
        dores: [
          'ansiosos com a instabilidade financeira e sem clareza sobre como proteger o patrimônio',
          'inseguros para investir por medo de perder o pouco que pouparam com muito esforço',
          'confusos com o excesso de jargões e opções de investimento que parecem contraditórias',
        ],
        aspiracoes: [
          'construir uma carteira de investimentos que gere renda passiva consistente e previsível',
          'atingir independência financeira sem depender de uma única fonte de renda',
          'entender finanças com clareza e tomar decisões de investimento com confiança',
        ],
        comportamento: [
          'acompanham canais de finanças pessoais e buscam validação antes de agir',
          'preferem livros com exemplos práticos, planilhas e cálculos reais aplicáveis',
          'investem com cautela e apreciam abordagens de risco calculado e longo prazo',
        ]
      },
      'health-wellness': {
        dores: [
          'esgotados fisicamente e emocionalmente pela rotina e sem energia para mudanças radicais',
          'frustrados com dietas e protocolos que funcionam temporariamente e não se sustentam',
          'ansiosos com a saúde e sem acesso a orientação médica clara e acessível',
        ],
        aspiracoes: [
          'ter energia consistente ao longo do dia sem depender de café e estimulantes',
          'construir hábitos de saúde simples que se encaixem na rotina sem grandes sacrifícios',
          'dormir profundamente, acordar disposto e sentir que o corpo trabalha a favor deles',
        ],
        comportamento: [
          'seguem influenciadores de saúde e bem-estar e estão abertos a biohacking responsável',
          'preferem guias práticos e baseados em evidências a conteúdo de motivação vazia',
          'compram livros de saúde como presente para si mesmos e para pessoas próximas',
        ]
      },
      'general-nonfiction': {
        dores: [
          'insatisfeitos com a superficialidade do conteúdo disponível sobre o tema',
          'sobrecarregados de informação e sem clareza sobre o que realmente importa para avançar',
          'frustrados por não encontrar uma obra que sintetize visão e prática de forma acessível',
        ],
        aspiracoes: [
          'aprofundar o conhecimento em um assunto que impacta diretamente sua vida ou carreira',
          'encontrar uma perspectiva nova e honesta que os tire do lugar-comum',
          'aplicar o que aprenderam logo após a leitura, com clareza sobre o próximo passo',
        ],
        comportamento: [
          'leem com regularidade e mantêm listas de leitura ativas e criteriosamente selecionadas',
          'valorizam autores com credibilidade e pesquisa sólida por trás das afirmações',
          'compartilham trechos e resenhas em redes sociais quando uma obra os impacta',
        ]
      },
    };

    const parts = domainAvatarParts[domain] || domainAvatarParts['general-nonfiction'];

    // ─── Seleciona combinações diferentes a cada clique para não repetir ─────
    const histSize = usedHistory?.size || 0;
    const dor     = parts.dores[histSize % parts.dores.length];
    const asp     = parts.aspiracoes[histSize % parts.aspiracoes.length];
    const comp    = parts.comportamento[histSize % parts.comportamento.length];

    // ─── Monta o texto de tom adaptado ────────────────────────────────────
    const toneNote = tone.includes('Informal') || tone.includes('Conversacional')
      ? 'apreciam linguagem direta e sem rodeios'
      : tone.includes('Inspirador') || tone.includes('Motivacional')
      ? 'respondem bem a narrativas inspiradoras com exemplos reais'
      : tone.includes('Acadêmico') || tone.includes('Científico')
      ? 'valorizam fundamentação teórica sólida e referências confiáveis'
      : tone.includes('Poético') || tone.includes('Narrativo')
      ? 'se envolvem com prosa imersiva e construção rica de atmosfera'
      : 'buscam clareza, aplicabilidade e profundidade na leitura';

    // ─── Constrói o avatar completo e coerente com o livro ────────────────
    const avatar = `Leitor ideal de "${bookRef}": ${demographic} que estão ${dor}. Aspiram a ${asp}. Em termos de comportamento, ${comp}. No contexto de "${topicRef}", ${toneNote}. Buscam uma obra que entregue perspectiva autêntica, sem superficialidade, com resultados aplicáveis à sua realidade.`;

    return avatar;
  }

  /**
   * Banco de dados especializado de sugestões contextuais por domínio editorial
   */
  private static getDomainSpecificSuggestions(
    boxKey: string,
    domain: BookEditorialDomain,
    titleContext: string,
    topicContext: string,
    project: BookProject
  ): string[] {
    const cleanTopic = topicContext || 'sua história';
    const cleanTitle = titleContext || 'esta obra';

    // =========================================================================
    // 1. FANTASIA, SWORD & SORCERY, RPG E ÉPICO
    // =========================================================================
    if (domain === 'fantasy-sword-sorcery') {
      const suggestions: Record<string, string[]> = {
        'research.bookTitle': [
          `Mestres da Lâmina Arcana`,
          `Crônicas de Sangue e Aço`,
          `O Legado dos Renegados de Ferro`,
          `Lendas do Vale das Sombras Eternas`,
          `O Códice dos Feiticeiros Esquecidos`,
          `Sob o Fio da Foice e do Fogo`,
          `A Coroa de Cinzas e Espinhos`,
          `Os Últimos Campeões de Skagast`,
          `Alianças Sombrias no Ermo Proibido`,
          `O Despertar da Magia Proibida`
        ],
        'research.authorName': [
          'Thorne Blackwood',
          'L. K. Vance',
          'Valerius M. Kane',
          'Elena Frostwood',
          'Dorian Graylock',
          'Kaelen R. Thorne',
          'Rowan Blackwood',
          'Vesper C. Thorne',
          'Alexander Sterling',
          'Leandro Palmeira'
        ],
        'author-bio.authorName': [
          'Thorne Blackwood',
          'L. K. Vance',
          'Valerius M. Kane',
          'Elena Frostwood',
          'Dorian Graylock',
          'Kaelen R. Thorne',
          'Rowan Blackwood',
          'Vesper C. Thorne'
        ],
        'author-bio.penName': [
          'Thorne Blackwood',
          'L. K. Vance',
          'Valerius M. Kane',
          'Elena Frostwood',
          'Dorian Graylock',
          'Kaelen R. Thorne',
          'Rowan Blackwood',
          'Vesper C. Thorne'
        ],
        'author-bio.background': [
          'Escritor de ficção sombria e pesquisador independente de táticas militares medievais e mitologia ancestral europeia com mais de 8 anos forjando universos grimdark.',
          'Romancista e entusiasta de esgrima histórica com formação em história antiga e dedicação exclusiva a narrativas de combate visceral e anti-heróis.',
          'Autor independente com presença destacada no KDP na categoria de Dark Fantasy & Sword & Sorcery, lido por milhares de fãs de fantasia madura.'
        ],
        'author-bio.achievements': [
          'Top 10 Bestseller em Fantasia Heroica e Grimdark no Kindle Unlimited com dezenas de milhares de páginas lidas.',
          'Mais de 5.000 avaliações positivas com média 4.8 estrelas em comunidades internacionais de leitores de fantasia.',
          'Reconhecido pela crítica especializada pela precisão coreográfica de duelos marciais e sistemas de magia Hard Magic.'
        ],
        'author-bio.personalDetails': [
          'Escreve ouvindo trilhas sonoras orquestrais nórdicas, é mestre veterano de campanhas de RPG e colecionador de réplicas de espadas medievais.',
          'Vive em uma cabana nas serras com dois cães pastores, dividindo as madrugadas entre escrita criativa e leitura de crônicas antigas.'
        ],
        'research.topic': [
          'Guerra pelo controle de artefatos arcanos ancestrais e sobrevivência marcial',
          'Mercenários forjados na dor enfrentando conspirações de reinos corrompidos',
          'Magia com custo de sangue e combates viscerais em masmorras esquecidas',
          'A jornada de guerreiros pragmáticos contra deuses caídos e profecias quebradas',
          'Sobrevivência, traição e honra entre guildas de foras-da-lei e feitiçaria antiga'
        ],
        'research.stance': [
          'Heróis não nascem com profecias sagradas; eles sobrevivem ao fio da lâmina e pagam o preço de cada vitória com sangue e escolhas morais cinzentas.',
          'A magia nunca é gratuita: cada feitiço cobra uma dívida biológica e mental que consome até os guerreiros mais nobres.',
          'Em um mundo despedaçado por dinastias corruptas, a honra entre foras-da-lei vale muito mais do que juramentos reais quebrados.',
          'Desconstrução implacável da fantasia tradicional: os monstros mais aterrorizantes usam coroas douradas e manipulam leis, não garras nas trevas.',
          'Combates viscerais onde o peso da armadura, o cansaço muscular e a estratégia tática decidem a sobrevivência, não milagres divinos.',
          'A lealdade forjada na trincheira contra hordas arcanas é a única moeda que não perde valor quando os deuses se silenciam.'
        ],
        'research.standout': [
          'Coreografia de combate hiper-realista inspirada em esgrima histórica europeia e táticas de cerco medievais.',
          'Sistema de magia "Hard Magic" com regras rigorosas, limitações fisiológicas e custos arcanos que impedem soluções convenientes.',
          'Protagonista veterano, experiente e imperfeito, longe dos clichês do jovem camponês ingênuo e predestinado.',
          'Worldbuilding profundo com dialetos regionais, tratados geopolíticos e ruínas com lendas ancestrais orgânicas.',
          'Capítulos com ganchos eletrizantes que alternam entre conspirações em salões nobres e emboscadas selvagens em terreno hostil.',
          'Ilustrações de mapas táticos e bestiário detalhado que imergem o leitor na geografia sombria do continente.'
        ],
        'research.targetAudience': [
          'Fãs de Dark Fantasy, Sword & Sorcery e leitores devotos de Robert E. Howard, Joe Abercrombie, Andrzej Sapkowski e Steven Erikson.',
          'Leitores adultos de ficção que buscam batalhas viscerais, personagens cinzentos e enredos maduros sem maniqueísmo infantil.',
          'Jogadores de RPG de mesa e entusiastas de universos medievais complexos com sistemas mágicos rigorosos.',
          'Comunidade BookTok e leitores que devoram sagas épicas com ritmo implacável e reviravoltas bem construídas.'
        ],
        'analytics.painPoints': [
          'Frustração com histórias de fantasia genéricas onde o protagonista sempre vence por poderes mágicos milagrosos de última hora.',
          'Cansaço de livros infantojuvenis disfarçados de fantasia adulta, com diálogos artificiais e falta de consequências reais para a violência.',
          'Falta de sistemas mágicos com regras claras que façam os conflitos parecerem inteligentes e desafiadores.',
          'Enredos previsíveis onde o bem e o mal são caricatos e não há dilemas morais autênticos.'
        ],
        'analytics.competitorGaps': [
          'Concorrentes focam em descrições excessivas de cenários e esquecem o ritmo de ação e o desenvolvimento dos personagens.',
          'Magia tratada como "deus ex machina" sem custo narrativo, eliminando a tensão dos confrontos.',
          'Falta de batalhas táticas onde o terreno e o treinamento militar façam sentido lógico.',
          'Protagonistas passivos que esperam o destino agir em vez de tomarem decisões ativas e difíceis.'
        ],
        'purpose.corePromise': [
          'Transportar o leitor para o epicentro de uma saga implacável onde cada golpe de espada e cada faísca de feitiço tem peso real.',
          'Entregar uma experiência imersiva de fantasia épica com reviravoltas sem furos de lógica e clímax inesquecível.',
          'Construir personagens que o leitor amará e temerá na mesma medida, em um mundo que não perdoa fraquezas.'
        ],
        'purpose.readerTransformation': [
          'De um leitor saturado de clichês para um fã arrebatado por um universo brutal, crível e viciante.',
          'De espectador passivo para alguém imerso na tensão tática de cada emboscada e duelo nas trevas.'
        ]
      };

      if (suggestions[boxKey]) return suggestions[boxKey];
    }

    // =========================================================================
    // 2. ROMANCE, NEW ADULT & DRAMA EMOCIONAL
    // =========================================================================
    if (domain === 'romance') {
      const suggestions: Record<string, string[]> = {
        'research.bookTitle': [
          `Pactos Proibidos`,
          `Quando a Tempestade Passar`,
          `Entre o Ódio e a Promessa`,
          `Apenas Mais Um Olhar`,
          `O Preço da Redenção`,
          `Segredos no Paraíso`,
          `Corações de Gelo e Cinzas`,
          `Contrato de Paixão`
        ],
        'research.authorName': [
          'Penelope Ward',
          'Scarlett Thorne',
          'Camila Sterling',
          'Julian Foster',
          'Aria Vance',
          'Chloe Saint-Claire',
          'Maya Montgomery',
          'Elena Rossi',
          'Lucas Montgomery',
          'Leandro Palmeira'
        ],
        'author-bio.authorName': [
          'Penelope Ward',
          'Scarlett Thorne',
          'Camila Sterling',
          'Julian Foster',
          'Aria Vance',
          'Chloe Saint-Claire',
          'Maya Montgomery',
          'Elena Rossi'
        ],
        'author-bio.penName': [
          'Penelope Ward',
          'Scarlett Thorne',
          'Camila Sterling',
          'Julian Foster',
          'Aria Vance',
          'Chloe Saint-Claire',
          'Maya Montgomery',
          'Elena Rossi'
        ],
        'author-bio.background': [
          'Autora de romances contemporâneos e comédias românticas que já figuraram entre os mais vendidos da Amazon KDP.',
          'Formada em Comunicação, apaixonada pela psicologia dos relacionamentos humanos e contadora de histórias com diálogos afiados.',
          'Escritora dedicada a criar protagonistas femininas autênticas, decididas e que não abrem mão dos seus sonhos.'
        ],
        'author-bio.achievements': [
          'Autora com mais de 100.000 cópias digitais distribuídas no Kindle Unlimited e leitores fiéis no BookTok.',
          'Avaliação média de 4.7 estrelas com milhares de resenhas destacando a química irresistível dos casais.',
          'Finalista de prêmios de literatura independente na categoria Ficção Feminina & Romance.'
        ],
        'author-bio.personalDetails': [
          'Apaixonada por cafés especiais, dias de chuva na janela e playlists românticas acústicas que inspiram novos capítulos.',
          'Mora em uma casa cheia de luz com dois gatos resgatados e passa o tempo livre descobrindo novos livros em sebos.'
        ],
        'research.topic': [
          'Rivalidade voraz entre dois mundos que se transformam em dependência emocional incontrolável',
          'Casamento de conveniência em alta sociedade com segredos que ameaçam vir à tona',
          'Reencontro de um amor do passado após uma década de silêncio e mágoas não resolvidas',
          'Proximidade forçada em uma viagem isolada onde defesas emocionais caem por terra'
        ],
        'research.stance': [
          'O amor verdadeiro não é a ausência de dor ou orgulho, mas a coragem de baixar as defesas diante de quem tem o poder de te destruir.',
          'A atração mais intensa nasce do choque entre duas vontades inquebrantáveis que recusam ceder o controle.',
          'Feridas do passado não se curam com distância, mas com o confronto honesto da vulnerabilidade que ambos temiam.',
          'Dois polos opostos que se repelem em público, mas compartilham uma química elétrica que nenhuma regra social consegue conter.'
        ],
        'research.standout': [
          'Construção de tensão eletrizante no ritmo "slow-burn" perfeito, onde cada toque e olhar acelera o pulso do leitor.',
          'Protagonista feminina forte, com carreira e convicções próprias, que desafia o interesse amoroso em pé de igualdade.',
          'Diálogos sarcásticos afiados com trocas rápidas de farpas que disfarçam a atração magnética subjacente.',
          'Exploração madura de traumas emocionais reais com resolução psicológica crível e catártica.'
        ],
        'research.targetAudience': [
          'Leitoras devotas de Romance Contemporâneo, New Adult e Dark Romance (comunidades BookTok e Bookstagram).',
          'Público que ama os tropos de Enemies to Lovers, Fake Dating, Grumpy x Sunshine e Forced Proximity.',
          'Leitores que buscam romances intensos com protagonistas complexos e alta carga de química emocional.'
        ]
      };

      if (suggestions[boxKey]) return suggestions[boxKey];
    }

    // =========================================================================
    // 3. THRILLER, MISTÉRIO, SUSPENSE & POLICIAL
    // =========================================================================
    if (domain === 'thriller-mystery') {
      const suggestions: Record<string, string[]> = {
        'research.bookTitle': [
          `A Testemunha Invisível`,
          `O Silêncio dos Culpados`,
          `Rastro de Mentiras`,
          `A Casa da Névoa`,
          `A Última Confissão`,
          `Sem Deixar Vestígios`,
          `O Enigma do Quarto 304`,
          `Vítima Sem Nome`
        ],
        'research.topic': [
          'Investigação forense de um crime de colarinho branco com conspirações em altas esferas',
          'Desaparecimento misterioso em uma comunidade pacata onde todos têm um álibi falso',
          'Um detetive atormentado caçando um assassino meticuloso que conhece seus piores traumas',
          'Narrador não confiável que esconde do leitor a chave do próprio crime que tenta investigar'
        ],
        'research.stance': [
          'O culpado mais perigoso nunca é quem parece ameaçador, mas a pessoa acima de qualquer suspeita que conduziu a investigação desde o início.',
          'Em comunidades aparentemente perfeitas, a hipocrisia é o cimento que esconde os crimes mais brutais.',
          'A memória humana é a testemunha mais traiçoeira: quanto mais tentamos lembrar, mais inventamos justificativas para nossa própria culpa.',
          'A justiça dos tribunais é cega aos poderosos; resta à persistência obsessiva arrancar a verdade das sombras.'
        ],
        'research.standout': [
          'Três reviravoltas (plot twists) calculadas matematicamente com pistas discretas espalhadas desde os primeiros capítulos.',
          'Procedimentos investigativos e forenses fundamentados em protocolos policiais modernos e verossímeis.',
          'Ritmo implacável com capítulos curtos e cliffhangers afiados que impedem o leitor de fechar o livro antes do desfecho.',
          'Construção psicológica perturbadora do antagonista que desafia os limites éticos do leitor.'
        ],
        'research.targetAudience': [
          'Fãs de thrillers psicológicos, suspense doméstico e mistérios policiais no estilo Harlan Coben, Gillian Flynn e Lucy Foley.',
          'Leitores que adoram tentar desvendar o enigma antes da revelação final e valorizam finais surpreendentes sem furos.'
        ]
      };

      if (suggestions[boxKey]) return suggestions[boxKey];
    }

    // =========================================================================
    // 4. NEGÓCIOS, FINANÇAS & EMPREENDEDORISMO
    // =========================================================================
    if (domain === 'business-entrepreneurship' || domain === 'finance-investing') {
      const isFinance = domain === 'finance-investing';
      const suggestions: Record<string, string[]> = {
        'research.bookTitle': isFinance ? [
          `A Máquina de Renda Passiva`,
          `Liberdade Financeira Sem Segredos`,
          `O Investidor Antifrágil`,
          `Do Caos à Riqueza Sustentável`,
          `Patrimônio Blindado: O Guia Prático`,
          `A Mente Próspera`
        ] : [
          `Escala Implacável`,
          `A Arte da Execução Tática`,
          `Liderança Sem Concessões`,
          `Do Zero ao Primeiro Milhão`,
          `Empresas Feitas para Lucrar`,
          `O Novo Jogo dos Negócios`
        ],
        'research.topic': isFinance 
          ? ['Estratégias de alocação de ativos e construção de renda passiva com gestão de risco']
          : ['Metodologias práticas de gestão, aquisição de clientes e escala operacional sustentável'],
        'research.stance': isFinance ? [
          'A verdadeira riqueza não é ostentada em faturamento bruto, mas construída na retenção de fluxo de caixa livre e ativos geradores de renda.',
          'Tentar enriquecer rápido no mercado financeiro é a forma mais previsível de falir; o enriquecimento real é lento, chato e matematicamente inevitável.',
          'Liberdade financeira não significa comprar tudo o que deseja, mas sim possuir 100% do controle sobre o seu próprio tempo.'
        ] : [
          'Empresas não quebram por falta de ideias geniais, mas por negligência crônica na execução básica diária e na geração de caixa.',
          'Simplificar modelos de negócio complexos em processos repetíveis é a maior vantagem competitiva que um líder pode construir.',
          'Trabalho duro sem posicionamento estratégico é apenas exaustão remunerada; o foco deve estar no efeito de alavancagem.'
        ],
        'research.standout': isFinance ? [
          'Planilhas e frameworks de simulação prontos para download que calculam a meta de aposentadoria em 3 cenários econômicos.',
          'Linguagem desmistificada sem jargões bancários herméticos, com foco em investidores comuns da vida real.',
          'Método em 5 passos para blindar o patrimônio contra inflação e volatilidade política.'
        ] : [
          'Framework visual proprietário testado em centenas de empresas com checklists de diagnóstico semanal.',
          'Estudos de caso reais de erros catastróficos e como foram revertidos antes da falência.',
          'Modelos de rotinas de liderança que reduzem em 60% a dependência da empresa em relação ao fundador.'
        ],
        'research.targetAudience': [
          'Empreendedores, investidores iniciantes e médios, líderes de equipe e profissionais liberais que buscam independência e escala.',
          'Pessoas pragmáticas que querem aplicar métodos comprovados imediatamente sem teorias abstratas.'
        ]
      };

      if (suggestions[boxKey]) return suggestions[boxKey];
    }

    // =========================================================================
    // 5. HÁBITOS, FOCO & DESENVOLVIMENTO PESSOAL
    // =========================================================================
    if (domain === 'habits-self-help') {
      const suggestions: Record<string, string[]> = {
        'research.bookTitle': [
          `Foco Radical`,
          `A Arquitetura dos Hábitos Atômicos`,
          `O Ponto de Virada Diário`,
          `Mente Blindada contra o Caos`,
          `A Ciência da Consistência`,
          `Domínio Pessoal em 90 Dias`
        ],
        'research.topic': [
          'Arquitetura de ambientes para eliminação da procrastinação e construção de rotinas automáticas de alto rendimento'
        ],
        'research.stance': [
          'Pequenos hábitos diários executados com disciplina superam qualquer motivação passageira de início de ano.',
          'Você não se eleva ao nível dos seus objetivos; você cai ao nível dos seus sistemas e do seu ambiente.',
          'O cansaço crônico da vida moderna não se cura com mais descanso passivo, mas com a eliminação intencional de distrações inúteis.'
        ],
        'research.standout': [
          'Método prático dos "Micro-Passos de 2 Minutos" apoiado em neurociência comportamental sem enrolação.',
          'Checklists de encerramento de dia e rastreadores de hábitos visuais para acompanhamento diário.',
          'Zero positivismo tóxico: protocolos realistas para manter a disciplina mesmo em dias caóticos e exaustivos.'
        ],
        'research.targetAudience': [
          'Adultos e profissionais que se sentem sobrecarregados pelo excesso de estímulos digitais e desejam foco inabalável.',
          'Pessoas que já tentaram metodologias complexas de produtividade e precisam de simplicidade aplicável.'
        ]
      };

      if (suggestions[boxKey]) return suggestions[boxKey];
    }

    // =========================================================================
    // 6. DEFAULT / GERAL COM INJEÇÃO DINÂMICA DO TÍTULO E TÓPICO
    // =========================================================================
    const fallbackList: Record<string, string[]> = {
      'research.bookTitle': [
        `O Código de ${cleanTopic}`,
        `Além dos Limites: ${cleanTopic} na Prática`,
        `O Guia Definitivo de ${cleanTopic}`,
        `Mestres de ${cleanTopic}: Lições Essenciais`,
        `A Regra de Ouro em ${cleanTopic}`
      ],
      'research.authorName': [
        'Leandro Palmeira',
        'L. P. Oliveira',
        'Leandro Palmeira dos Santos'
      ],
      'research.topic': [
        `Estratégias fundamentais e visão aprofundada sobre ${cleanTopic}`,
        `Exploração prática e detalhada das dinâmicas contemporâneas de ${cleanTopic}`
      ],
      'research.stance': [
        `Uma visão autêntica e contundente sobre ${cleanTopic}, priorizando verdades práticas em vez de fórmulas superficiais.`,
        `Desconstrução dos mitos mais comuns que cercam ${cleanTopic}, entregando clareza e impacto real ao leitor.`,
        `Abordagem inovadora que combina profundidade conceitual e aplicabilidade direta no contexto moderno.`
      ],
      'research.standout': [
        `Metodologia estruturada passo a passo com foco em resultados mensuráveis e clareza absoluta.`,
        `Perspectiva autoral única que combina rigor investigativo com comunicação envolvente e acessível.`,
        `Exemplos contemporâneos e aplicações práticas que diferenciam esta obra de tudo o que existe no mercado.`
      ],
      'research.targetAudience': [
        `Leitores interessados em ${cleanTopic} que valorizam profundidade, originalidade e conteúdo de alto impacto.`,
        `Público que busca transformar sua perspectiva com uma obra bem fundamentada e livre de clichês.`
      ]
    };

    return fallbackList[boxKey] || [
      `Abordagem inovadora para ${boxKey} no contexto de ${cleanTopic}`,
      `Visão estratégica de alto impacto para ${boxKey}`,
      `Sugestão refinada e contextualizada para ${boxKey}`
    ];
  }

  /**
   * Preenchimento Automático Inteligente de Toda a Etapa
   * Utiliza o domínio editorial real do livro (não força autoajuda para fantasia!)
   */
  public static fillEntireStage(stageId: StageId, project: BookProject): BookProject {
    const updated = JSON.parse(JSON.stringify(project)) as BookProject;
    if (!updated.stageData) updated.stageData = {};

    const domain = this.detectDomain(updated);

    switch (stageId) {
      case 'research': {
        const title = updated.title || (
          domain === 'fantasy-sword-sorcery' ? 'Mestres de Sword & Sorcery' :
          domain === 'romance' ? 'Pactos Proibidos' :
          domain === 'thriller-mystery' ? 'A Testemunha Invisível' :
          domain === 'finance-investing' ? 'A Máquina de Renda Passiva' :
          'O Poder do Hábito Inabalável'
        );

        const topic = updated.topic || (
          domain === 'fantasy-sword-sorcery' ? 'Ficção & Fantasia > Epic & High Fantasy > Sword & Sorcery' :
          domain === 'romance' ? 'Romance > Contemporary Romance > Enemies to Lovers' :
          domain === 'thriller-mystery' ? 'Mistério & Suspense > Psychological Thriller' :
          domain === 'finance-investing' ? 'Negócios & Finanças > Renda Passiva e Investimentos' :
          'Desenvolvimento Pessoal > Hábitos e Disciplina'
        );

        const author = updated.author || 'Leandro Palmeira';

        const stance = this.getNextSuggestion('research.stance', { ...updated, title, topic });
        const standout = this.getNextSuggestion('research.standout', { ...updated, title, topic });
        const audience = this.getNextSuggestion('research.targetAudience', { ...updated, title, topic });

        updated.title = title;
        updated.author = author;
        updated.topic = topic;
        updated.targetAudience = audience;

        updated.stageData.research = {
          bookTitle: title,
          authorName: author,
          genre: updated.kdpBookType || (domain === 'fantasy-sword-sorcery' ? 'fantasy' : 'self-help'),
          topic,
          stance,
          standout,
          authorTone: domain === 'fantasy-sword-sorcery' ? 'Poético e Narrativo' : 'Conversacional e Prático',
          generalAudience: 'Público Geral Adulto',
          targetAudience: audience
        };
        break;
      }

      default:
        break;
    }

    return updated;
  }
}
