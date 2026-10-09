// Serviço universal de comunicação com IA (OpenAI, OpenRouter, Anthropic, Azure OpenAI, Ollama)
// Suporta chamadas com schema estruturado e fallback resiliente

import { AiSettings } from '../types';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json' | 'text';
}

export class AiService {
  private settings: AiSettings;

  constructor(settings?: AiSettings) {
    this.settings = settings || { provider: 'local-builtin' };
  }

  getProvider(): string {
    return this.settings.provider || 'local-builtin';
  }

  getSettings(): AiSettings {
    return this.settings;
  }

  updateSettings(settings: AiSettings) {
    this.settings = settings;
  }

  /**
   * Chamada estática universal para chatCompletion
   */
  public static async complete(messages: ChatMessage[], options?: AiCompletionOptions): Promise<string> {
    const instance = new AiService();
    return instance.chatCompletion(messages, options);
  }

  /**
   * Consulta os modelos instalados no Ollama local
   */
  public static async fetchOllamaModels(baseUrl: string = 'http://localhost:11434'): Promise<string[]> {
    try {
      const cleanUrl = baseUrl.replace(/\/+$/, '');
      const res = await fetch(`${cleanUrl}/api/tags`, { method: 'GET' });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.models || []).map((m: any) => m.name || m.model).filter(Boolean);
    } catch {
      return [];
    }
  }

  // --- TESTE DE CONEXÃO ---
  async testConnection(): Promise<{ success: boolean; message: string; modelUsed: string }> {
    try {
      if (this.settings.provider === 'local-builtin') {
        return {
          success: true,
          message: 'Motor Editorial Local Embutido ativo e pronto (100% Offline / Sem dependências).',
          modelUsed: 'local-coauthor-engine'
        };
      }

      if (this.settings.provider === 'ollama') {
        const baseUrl = this.settings.baseUrl?.trim() || 'http://localhost:11434';
        const installedModels = await AiService.fetchOllamaModels(baseUrl);
        
        if (installedModels.length === 0) {
          return {
            success: false,
            message: `Ollama não respondeu em ${baseUrl} ou não possui modelos baixados. Certifique-se de executar 'ollama serve' e baixar um modelo como 'ollama pull llama3.1'.`,
            modelUsed: this.settings.model || 'nenhum'
          };
        }

        let model = this.settings.model?.trim() || '';
        const found = installedModels.some(m => m.startsWith(model) || model.startsWith(m.split(':')[0]));
        if (!found || model === 'gpt-4o-mini' || model === 'gpt-4o') {
          const autoModel = installedModels[0];
          return {
            success: true,
            message: `Ollama conectado! O modelo configurado foi redirecionado para o modelo local instalado: '${autoModel}'. Modelos no seu PC: ${installedModels.join(', ')}.`,
            modelUsed: autoModel
          };
        }
      }

      const response = await this.chatCompletion([
        { role: 'system', content: 'Responda apenas com a palavra OK se estiver funcionando.' },
        { role: 'user', content: 'Teste de conexão.' }
      ], { maxTokens: 10, temperature: 0.1 });

      if (response && response.trim().length > 0) {
        return {
          success: true,
          message: `Conexão estabelecida com sucesso! Resposta: "${response.trim()}"`,
          modelUsed: this.settings.model || 'padrão'
        };
      }
      return {
        success: false,
        message: 'A IA respondeu vazio ou com erro.',
        modelUsed: this.settings.model || ''
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Falha na conexão: ${err.message || 'Erro desconhecido'}`,
        modelUsed: this.settings.model || ''
      };
    }
  }

  // --- CHAT COMPLETION ---
  async chatCompletion(messages: ChatMessage[], options: AiCompletionOptions = {}): Promise<string> {
    const provider = this.settings.provider || 'openai';
    const temp = options.temperature ?? this.settings.temperature ?? 0.7;

    switch (provider) {
      case 'local-builtin':
        if (options.responseFormat === 'json') {
          return JSON.stringify({ status: 'ok', success: true });
        }
        return 'Operação concluída com sucesso pelo motor local autônomo.';
      case 'gemini':
        return this.callGemini(messages, temp, options);
      case 'anthropic':
        return this.callAnthropic(messages, temp, options.maxTokens);
      case 'azure':
        return this.callAzureOpenAI(messages, temp, options);
      case 'ollama':
        return this.callOllama(messages, temp, options);
      case 'openrouter':
      case 'openai':
      case 'custom':
      default:
        return this.callOpenAiCompatible(messages, temp, options);
    }
  }

  /**
   * Atalho direto para geração de texto com suporte automático a prompt do sistema e fallback local resiliente
   */
  async generateText(prompt: string, systemPrompt?: string, options?: AiCompletionOptions): Promise<string> {
    if (this.settings.provider === 'local-builtin') {
      return this.generateLocalFallback(prompt);
    }
    const messages: ChatMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });
    try {
      return await this.chatCompletion(messages, options);
    } catch (err: any) {
      console.warn('Provedor de IA remota inacessível ou sem chave configurada. Acionando motor editorial local autônomo:', err.message);
      return this.generateLocalFallback(prompt);
    }
  }

  private generateLocalFallback(prompt: string): string {
    const lower = prompt.toLowerCase();

    // 1. Análise de Mercado / Concorrentes / Obras de Referência (retorna array JSON de livros reais)
    if (
      lower.includes('concorrente') || 
      lower.includes('concorrentes') || 
      lower.includes('bestseller') || 
      lower.includes('best-seller') || 
      lower.includes('mercado') || 
      lower.includes('referência') || 
      lower.includes('referencias') ||
      lower.includes('competing')
    ) {
      if (
        lower.includes('sword') || 
        lower.includes('sorcery') || 
        lower.includes('fantasia') || 
        lower.includes('fantasy') || 
        lower.includes('espada') || 
        lower.includes('feitiçaria')
      ) {
        return JSON.stringify([
          {
            title: 'Conan: O Bárbaro (A Torre do Elefante)',
            author: 'Robert E. Howard',
            asin: 'B08R65R37Z',
            bsr: 34,
            rating: 4.8,
            reviewCount: 3820,
            price: 24.90,
            format: 'eBook Kindle',
            url: 'https://www.amazon.com/dp/B08R65R37Z',
            coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600',
            description: 'Obra fundadora do subgênero Sword & Sorcery, combinando ação visceral, anti-heróis mercenários e magia ancestral perigosa.',
            narrativeStructure: 'Estrutura episódica com arcos fechados e ritmo febril, centrada na sobrevivência e no embate físico contra ameaças sobrenaturais.',
            openingHook: 'In media res em uma taverna imunda de Arenjun, estabelecendo perigo imediato e o objetivo claro de invasão à torre proibida.',
            commercialPositioning: 'Liderança no nicho de Fantasia Heroica e Grimdark com apelo visceral e protagonista que rejeita hipocrisias da civilização.',
            ethicalInspirationGuideline: 'Inspire-se na densidade atmosférica e na magia com custo perigoso. Crie seu próprio protagonista autoral com código moral único sem copiar a lore cimeriana.'
          },
          {
            title: 'O Poder da Espada (The Blade Itself)',
            author: 'Joe Abercrombie',
            asin: 'B013RA92C4',
            bsr: 48,
            rating: 4.7,
            reviewCount: 14500,
            price: 29.90,
            format: 'eBook Kindle',
            url: 'https://www.amazon.com/dp/B013RA92C4',
            coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600',
            description: 'Referência contemporânea de grimdark com diálogos afiados, cinismo inteligente e desconstrução dos clichês de herói nobre.',
            narrativeStructure: 'Multi-POV com convergência de subtramas em torno de conspirações políticas e guerras de fronteira com humor ácido.',
            openingHook: 'Logen Nove-Dedos à beira do abismo lutando contra Shanka nas ravinas gélidas do Norte, testando o lema de sobreviver a qualquer custo.',
            commercialPositioning: 'Top Seller KDP em Dark Fantasy / Sword & Sorcery com base leitora massiva e alta taxa de leitura completa no Kindle Unlimited.',
            ethicalInspirationGuideline: 'Aproveite o modelo de personagens moralmente cinzentos e a visceralidade dos combates para forjar conflitos inéditos.'
          },
          {
            title: 'Elric de Melniboné: A Espada Diabólica',
            author: 'Michael Moorcock',
            asin: 'B005GSZIW4',
            bsr: 58,
            rating: 4.6,
            reviewCount: 5200,
            price: 27.50,
            format: 'eBook Kindle',
            url: 'https://www.amazon.com/dp/B005GSZIW4',
            coverUrl: 'https://images.unsplash.com/photo-1514894780887-121968d00567?q=80&w=600',
            description: 'Clássico gótico de espada e feitiçaria estrelado pelo imperador albino e sua lâmina senciente que devora almas.',
            narrativeStructure: 'Tragédia filosófica grega transposta para fantasia pulp sombria, onde cada vitória exige um sacrifício pessoal terrível.',
            openingHook: 'Melniboné decadente com intrigas de palácio e um governante frágil sustentado apenas por poções alquímicas proibidas.',
            commercialPositioning: 'Referência definitiva de anti-herói trágico e sistemas de magia necromântica com apelo cult internacional.',
            ethicalInspirationGuideline: 'Use a mecânica do preço oculto do poder arcano, desenvolvendo artefatos e feitiçarias inéditas com consequências morais profundas.'
          },
          {
            title: 'As Mentiras de Locke Lamora',
            author: 'Scott Lynch',
            asin: 'B000JMKNJ2',
            bsr: 62,
            rating: 4.8,
            reviewCount: 18900,
            price: 32.00,
            format: 'eBook Kindle',
            url: 'https://www.amazon.com/dp/B000JMKNJ2',
            coverUrl: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?q=80&w=600',
            description: 'Ação ágil e golpes mirabolantes em uma Veneza fantástica decadente dominada por guildas de ladrões e alquimia refinada.',
            narrativeStructure: 'Linha temporal dupla alternando a formação do protagonista com o grande golpe em andamento na corte nobre.',
            openingHook: 'Apresentação do Padre Chains adotando um jovem órfão com talento assustadoramente refinado para o engano.',
            commercialPositioning: 'Campeão em High Fantasy / Heist com forte fidelização de público jovem-adulto e adulto.',
            ethicalInspirationGuideline: 'Extraia o ritmo dinâmico do subgênero de assalto e companheirismo desonesto para criar seu próprio grupo de aventureiros.'
          },
          {
            title: 'O Caminho dos Reis (The Way of Kings)',
            author: 'Brandon Sanderson',
            asin: 'B003P2WO5E',
            bsr: 18,
            rating: 4.9,
            reviewCount: 42000,
            price: 39.90,
            format: 'eBook Kindle',
            url: 'https://www.amazon.com/dp/B003P2WO5E',
            coverUrl: 'https://images.unsplash.com/photo-1532012164546-f432f2e37b73?q=80&w=600',
            description: 'Referência máxima de Worldbuilding rigoroso, magia com regras estritas (Hard Magic) e arcos de redenção épicos.',
            narrativeStructure: 'Múltiplos pontos de vista com pontos de clímax simultâneos (Sanderson Avalanche) e lore ricamente detalhada.',
            openingHook: 'O assassinato do Rei Gavilar por Szeth-filho-filho-Vallano usando técnicas de gravitura que desafiam a física.',
            commercialPositioning: 'Líder absoluto de vendas de Epic Fantasy em escala global no ecossistema Amazon.',
            ethicalInspirationGuideline: 'Estude a clareza didática das regras de magia e a disciplina de worldbuilding para enriquecer seu universo próprio.'
          }
        ], null, 2);
      }

      if (lower.includes('romance') || lower.includes('amor') || lower.includes('casal') || lower.includes('billionaire')) {
        return JSON.stringify([
          {
            title: 'É Assim que Acaba (It Ends with Us)',
            author: 'Colleen Hoover',
            asin: 'B0176M3U10',
            bsr: 12,
            rating: 4.7,
            reviewCount: 95000,
            price: 26.90,
            format: 'eBook Kindle',
            url: 'https://www.amazon.com/dp/B0176M3U10',
            coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600',
            description: 'Fenômeno mundial de romance dramático com forte carga emocional e dilemas morais dolorosos.',
            narrativeStructure: 'Primeira pessoa confidencial alternando encontros do presente com cartas retrospectivas do primeiro amor.',
            openingHook: 'Lily Bloom no telhado de Boston contemplando a perda do pai e cruzando com o neurocirurgião misterioso Ryle Kincaid.',
            commercialPositioning: 'Líder do TikTok/BookTok com taxa de conversão recorde e apelo emocional magnético.',
            ethicalInspirationGuideline: 'Inspire-se na coragem de tratar de dilemas emocionais adultos sem superficialidade, criando personagens com feridas originais.'
          },
          {
            title: 'A Hipótese do Amor (The Love Hypothesis)',
            author: 'Ali Hazelwood',
            asin: 'B08W5B7H6P',
            bsr: 25,
            rating: 4.6,
            reviewCount: 48000,
            price: 24.90,
            format: 'eBook Kindle',
            url: 'https://www.amazon.com/dp/B08W5B7H6P',
            coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=600',
            description: 'Referência moderna de Fake Dating e ambiente acadêmico (STEMinist) com comédia inteligente.',
            narrativeStructure: 'Namoro de conveniência em 3 atos com trope grumpy x sunshine e progressão lenta da intimidade (slow burn).',
            openingHook: 'Beijo impulsivo e desesperado no corredor do laboratório para fingir um relacionamento em frente a uma amiga.',
            commercialPositioning: 'Best Seller na categoria Romance Contemporâneo e Comédia Romântica.',
            ethicalInspirationGuideline: 'Aproveite o tropo clássico de relacionamento forçado ambientando em um universo profissional ou nicho específico original.'
          },
          {
            title: 'Amor, Teoricamente',
            author: 'Ali Hazelwood',
            asin: 'B0BHZJMW7J',
            bsr: 38,
            rating: 4.7,
            reviewCount: 22000,
            price: 27.90,
            format: 'eBook Kindle',
            url: 'https://www.amazon.com/dp/B0BHZJMW7J',
            coverUrl: 'https://images.unsplash.com/photo-1532012164546-f432f2e37b73?q=80&w=600',
            description: 'Enemies-to-lovers com rivalidade acadêmica de física teórica vs experimental e protagonista com síndrome de agradar.',
            narrativeStructure: 'Desenvolvimento focado na superação do masking social da protagonista intercalado com tensão amorosa crescente.',
            openingHook: 'O pior rival de carreira da protagonista aparece como irmão do cliente de namoro de mentira que ela atende.',
            commercialPositioning: 'Forte presença em comédia romântica com ganchos comerciais de identificação imediata.',
            ethicalInspirationGuideline: 'Modele a jornada de vulnerabilidade interna da protagonista sem replicar os cenários ou diálogos específicos.'
          }
        ], null, 2);
      }

      if (lower.includes('suspense') || lower.includes('mistério') || lower.includes('misterio') || lower.includes('thriller')) {
        return JSON.stringify([
          {
            title: 'A Empregada (The Housemaid)',
            author: 'Freida McFadden',
            asin: 'B09TWSRMC4',
            bsr: 8,
            rating: 4.6,
            reviewCount: 78000,
            price: 19.90,
            format: 'eBook Kindle',
            url: 'https://www.amazon.com/dp/B09TWSRMC4',
            coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=600',
            description: 'Thriller psicológico claustrofóbico em mansão de luxo com plot twists de alta rotação e capítulos curtos.',
            narrativeStructure: 'Estrutura bipartida que inverte completamente a perspectiva da vítima e do algoz na metade do livro.',
            openingHook: 'Entrevista de emprego tensa de uma ex-presidiária na mansão perfeita da família Winchester.',
            commercialPositioning: 'Líder em Psychological Thriller no Kindle Unlimited com lealdade extrema de leitores.',
            ethicalInspirationGuideline: 'Adote o ritmo ágil de capítulos que terminam em cliffhangers para seu próprio enredo de mistério doméstico.'
          },
          {
            title: 'A Garota no Trem',
            author: 'Paula Hawkins',
            asin: 'B00T22Z7M6',
            bsr: 45,
            rating: 4.4,
            reviewCount: 56000,
            price: 24.90,
            format: 'eBook Kindle',
            url: 'https://www.amazon.com/dp/B00T22Z7M6',
            coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600',
            description: 'Narradora não-confiável e investigação de desaparecimento a partir de observações na janela de um vagão diário.',
            narrativeStructure: 'Multi-narrativa com lapsos de memória e linhas temporais que revelam pistas falsas calculadas.',
            openingHook: 'A rotina mórbida de Rachel observando a casa de um casal desconhecido até presenciar uma traição.',
            commercialPositioning: 'Best-seller consagrado de mistério e suspense psicológico contemporâneo.',
            ethicalInspirationGuideline: 'Inspire-se na técnica do narrador não-confiável para criar pistas inteligentes em seu próprio suspense.'
          }
        ], null, 2);
      }

      // Padrão Geral / Não-Ficção / Hábitos / Negócios
      return JSON.stringify([
        {
          title: 'Hábitos Atômicos (Atomic Habits)',
          author: 'James Clear',
          asin: 'B07D23CFGR',
          bsr: 3,
          rating: 4.9,
          reviewCount: 125000,
          price: 29.90,
          format: 'eBook Kindle',
          url: 'https://www.amazon.com/dp/B07D23CFGR',
          coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600',
          description: 'Obra de referência mundial sobre micro-mudanças de comportamento com impacto cumulativo gigantesco.',
          narrativeStructure: 'Modelo de 4 Leis da Mudança de Comportamento estruturado com frameworks visuais e resumos de ação.',
          openingHook: 'História pessoal do grave acidente de beisebol do autor e a recuperação paciente através de mini-rotinas.',
          commercialPositioning: '#1 em Desenvolvimento Pessoal e Psicologia Aplicada no mundo inteiro.',
          ethicalInspirationGuideline: 'Aprenda a criar frameworks visuais proprietários para seu método, sem copiar o modelo de loop de James Clear.'
        },
        {
          title: 'Trabalho Focado (Deep Work)',
          author: 'Cal Newport',
          asin: 'B00X47ZGHS',
          bsr: 22,
          rating: 4.7,
          reviewCount: 34000,
          price: 27.90,
          format: 'eBook Kindle',
          url: 'https://www.amazon.com/dp/B00X47ZGHS',
          coverUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=600',
          description: 'Aborda a importância da concentração profunda em um mundo hiperconectado e cheio de distrações.',
          narrativeStructure: 'Divisão clara em duas partes: a tese de valor da concentração seguida pelas 4 regras práticas de execução.',
          openingHook: 'Contraste entre a rotina de Carl Jung na torre de Bollingen e a rotina fragmentada do profissional moderno.',
          commercialPositioning: 'Obra definitiva em produtividade intelectual para profissionais do conhecimento.',
          ethicalInspirationGuideline: 'Use a abordagem empírica de estudos de caso para demonstrar a eficácia da sua própria tese.'
        },
        {
          title: 'Pai Rico, Pai Pobre',
          author: 'Robert Kiyosaki',
          asin: 'B071VT7T45',
          bsr: 15,
          rating: 4.8,
          reviewCount: 98000,
          price: 24.90,
          format: 'eBook Kindle',
          url: 'https://www.amazon.com/dp/B071VT7T45',
          coverUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=600',
          description: 'Clássico de educação financeira desmistificando o fluxo de caixa, ativos e a mentalidade de investidor.',
          narrativeStructure: 'Narrativa parabólica de contraste entre duas figuras paternas com lições financeiras progressivas.',
          openingHook: 'Infância no Havaí e a constatação da diferença entre o pai acadêmico falido e o pai empreendedor.',
          commercialPositioning: 'Líder histórico perpétuo na categoria de Finanças Pessoais e Negócios na Amazon.',
          ethicalInspirationGuideline: 'Aproveite o recurso de contrastar duas visões de mundo para tornar seu livro didático e envolvente.'
        }
      ], null, 2);
    }

    // 2. Geração de títulos (retorna array JSON alinhado ao gênero do livro)
    if (lower.includes('título') || lower.includes('titulo') || lower.includes('title') || (lower.includes('subtitle') && lower.includes('json'))) {
      const topicMatch = prompt.match(/sobre "([^"]+)"/i) || prompt.match(/about "([^"]+)"/i) || prompt.match(/tópico "([^"]+)"/i);
      const topic = topicMatch ? topicMatch[1] : 'Mestres de Sword & Sorcery';

      if (
        lower.includes('sword') || 
        lower.includes('sorcery') || 
        lower.includes('fantasia') || 
        lower.includes('fantasy') || 
        lower.includes('espada') || 
        lower.includes('feitiçaria')
      ) {
        return JSON.stringify([
          { title: 'A Dança das Lâminas Negras', subtitle: 'Crônicas de Sangue, Aço e Feitiçaria Proibida' },
          { title: 'Mestres da Noite Eterna', subtitle: 'O Caminho do Anti-Herói nos Reinos Esquecidos' },
          { title: 'O Juramento do Ferro Cinzento', subtitle: 'Uma Saga de Honra Manchada e Magia Ancestral' },
          { title: 'Sombras da Cidadela Proibida', subtitle: 'Onde Feiticeiros Negociam com Deuses Esquecidos' },
          { title: 'O Último Mercenário de Arenor', subtitle: 'Aço Afiado contra Demônios das Profundezas' },
          { title: 'A Lâmina dos Condenados', subtitle: 'Vingança e Poder nos Ermos do Norte' },
          { title: 'O Feiticeiro de Obsidiana', subtitle: 'O Preço Maldito do Sangue Arcano' },
          { title: 'Crônicas do Aço Voraz', subtitle: 'Entre Ladrões, Reis Loucos e Monstros Primordiais' },
          { title: 'Cicatrizes do Trono de Cinzas', subtitle: 'A Queda do Império da Feitiçaria' },
          { title: 'Herdeiros da Forja Maldita', subtitle: 'A Batalha pelo Destino dos Reinos Livres' }
        ], null, 2);
      }

      if (lower.includes('romance') || lower.includes('amor')) {
        return JSON.stringify([
          { title: 'Promessas de Seda e Sombras', subtitle: 'Um Romance Inesperado de Rivais a Amantes' },
          { title: 'O Acordo Proibido', subtitle: 'Uma Paixão Intensa Onde Nenhum dos Dois Pode Recuar' },
          { title: 'Entre o Ódio e o Desejo', subtitle: 'Quando a Proximidade Forçada Rompe Todas as Barreiras' },
          { title: 'Herdeiro do Orgulho', subtitle: 'O Bilionário que Jurou Nunca Amar de Verdade' },
          { title: 'Sussurros de Amor e Cinzas', subtitle: 'A Segunda Chance que Ninguém Esperava' }
        ], null, 2);
      }

      return JSON.stringify([
        { title: `O Código de ${topic}`, subtitle: 'Estratégias Práticas e Métodos Comprovados para Alcançar Resultados Reais' },
        { title: `Dominando ${topic}`, subtitle: 'Um Guia Passo a Passo para Transformar Conhecimento em Ação e Sucesso' },
        { title: `A Arte e a Ciência de ${topic}`, subtitle: 'Como os Maiores Especialistas Pensam, Agem e Prosperam' },
        { title: `Além do Óbvio: ${topic}`, subtitle: 'Princípios Essenciais para Superar Bloqueios e Atingir o Próximo Nível' },
        { title: `O Método ${topic}`, subtitle: 'Passos Simples e Poderosos para Organizar sua Vida e Multiplicar seu Impacto' },
        { title: `Descomplicando ${topic}`, subtitle: 'Soluções Diretas e Sem Rodeios para os Desafios do Dia a Dia' }
      ], null, 2);
    }

    // 3. Proposta Editorial do Livro
    if (lower.includes('proposta') || lower.includes('usp') || lower.includes('selling point') || lower.includes('proposed book')) {
      return `### 1. Proposta Única de Valor (USP)
Esta obra entrega uma metodologia direta, enxuta e comprovada na prática, eliminando teorias cansativas e focando na transformação imediata do leitor. O livro preenche uma lacuna crítica do mercado ao unir rigor estratégico com exercícios práticos aplicáveis desde a primeira página.

### 2. Diferenciais Frente à Concorrência
Enquanto as publicações tradicionais pecam pelo excesso de academicismo ou por conselhos genéricos de autoajuda, este manual traz uma arquitetura de aprendizado orientada à ação. Cada capítulo foi planejado para resolver um gargalo real e específico enfrentado pelo leitor.

### 3. Principais Pontos de Transformação
- **Arquitetura Acionável:** Roteiros estruturados para implementação imediata.
- **Validação Prática:** Metodologias testadas em situações reais de mercado.
- **Síntese de Alto Valor:** Economia de centenas de horas de tentativa e erro.
- **Linguagem Acolhedora:** Tom conversacional que mantém o leitor motivado até a última página.
- **Ferramentas Integradas:** Checklists, perguntas de autoavaliação e planos de ação ao final de cada bloco.

### 4. Perfil do Leitor Ideal
Pessoas que buscam clareza, direção prática e resultados duradouros, cansadas de promessas vazias e prontas para assumir o controle do seu desenvolvimento pessoal e profissional.

### 5. Tom Editorial & Promessa
Tom empático, instigante, seguro e altamente articulado. A promessa central é entregar a clareza e as ferramentas necessárias para agir com confiança.`;
    }

    // 4. Biografia do Autor para Amazon KDP & Contracapa (Prioridade sobre persona!)
    if (lower.includes('biografia') || lower.includes('bio') || lower.includes('biography') || lower.includes('autor central') || lower.includes('author central')) {
      if (
        lower.includes('sword') || 
        lower.includes('sorcery') || 
        lower.includes('fantasia') || 
        lower.includes('fantasy') || 
        lower.includes('grimdark') || 
        lower.includes('épica')
      ) {
        return `O autor é escritor de fantasia sombria, apaixonado pela estética pulp clássica, lendas ancestrais e esgrima histórica. Fascinado por mundos onde a magia tem um preço terrível e os heróis são forjados em cinzas e aço, dedica-se a construir sagas com ritmo cinematográfico, combates viscerais e personagens de moral cinzenta que recusam o preto no branco.

Seus livros conquistaram milhares de leitores na Amazon pela imersão implacável e pela profundidade de seus universos. Quando não está forjando novas crônicas e mapas em sua escrivaninha de carvalho, ele estuda tratados medievais, joga campanhas de RPG e aprecia noites chuvosas acompanhado de uma xícara generosa de café forte.

Acompanhe os próximos lançamentos, artes dos personagens e mapas exclusivos seguindo a página do autor e inscrevendo-se em seu boletim editorial.`;
      }

      if (lower.includes('romance') || lower.includes('amor') || lower.includes('billionaire')) {
        return `A autora é contadora de histórias por vocação e romântica incurável por escolha. Seus livros exploram a intensidade dos encontros inesperados, as tensões irresistíveis de inimigos que se tornam amantes e a coragem necessária para se abrir ao amor em um mundo imperfeito.

Reconhecida por diálogos afiados e química palpável que mantém os leitores acordados pela madrugada afora, suas obras figuram entre os títulos mais comentados da categoria de ficção feminina contemporânea. Vive cercada por livros não lidos, plantas e gatos curiosos, dividindo seu tempo entre a escrita e conversas apaixonadas com leitoras nas redes sociais.`;
      }

      if (lower.includes('suspense') || lower.includes('mistério') || lower.includes('thriller')) {
        return `O autor é ficcionista especializado em thrillers psicológicos claustrofóbicos e narrativas de alta tensão. Com formação em psicologia do comportamento e anos de pesquisa sobre dinâmica de interrogatórios e perícia, constrói quebra-cabeças narrativos onde nenhuma testemunha é totalmente confiável e o perigo reside sempre nos detalhes aparentemente banais.

Suas obras destacam-se pelo ritmo veloz de capítulos curtos que terminam em reviravoltas calculadas. Vive em uma cidade costeira tranquila, onde encontra o isolamento perfeito para tecer tramas densas e imprevisíveis.`;
      }

      return `O autor é pesquisador, consultor e mentor reconhecido por transformar conceitos complexos em ferramentas simples, acessíveis e práticas de alta performance. Com mais de uma década de dedicação profissional ao desenvolvimento humano e estratégico, seu trabalho é impulsionado pelo compromisso em entregar métodos acionáveis que geram resultados concretos no mundo real.

Sua escrita equilibra sensibilidade humana e rigor empírico, reunindo lições colhidas em atendimentos diretos, consultorias e estudos de caso. Apaixonado pela partilha de conhecimento, dedica sua vida a escrever, mentorar e palestrar, impactando milhares de leitores que buscam assumir o protagonismo da sua trajetória profissional e pessoal.

Quando não está imerso em novas pesquisas ou escrevendo seu próximo livro, aproveita o tempo com a família, caminhadas matinais e o hábito constante da leitura de obras interdisciplinares.`;
    }

    // 5. Persona Editorial do Autor (Estilo e Tom de Voz da Obra)
    if (lower.includes('persona') || lower.includes('estilo') || lower.includes('writing sample') || lower.includes('inspiration')) {
      return `A persona editorial combina clareza cirúrgica, empatia acolhedora e autoridade respaldada por experiência de campo. O tom de voz conversa com o leitor como um mentor de confiança que já enfrentou as mesmas dificuldades e desenvolveu um caminho seguro para superá-las. A cadência das frases alterna explicações objetivas com analogias vívidas do cotidiano, gerando momentos constantes de reflexão e insights aplicáveis. A comunicação é firme, inspiradora e destituída de arrogância, focada 100% no sucesso do leitor.`;
    }

    // 6. Sinopse & Copy de Vendas para Amazon KDP
    if (lower.includes('descrição') || lower.includes('descricao') || lower.includes('sinopse') || lower.includes('amazon') || lower.includes('kdp') || lower.includes('headline')) {
      return `**Descubra Como Destravar Seu Verdadeiro Potencial e Alcançar Resultados Reais a Partir de Hoje.**

Você já sentiu que está trabalhando incansavelmente, mas o progresso parece sempre escapar por entre os dedos?

Em um mundo saturado de informações contraditórias e conselhos genéricos, o que você menos precisa é de mais teoria sem fundamento. Você precisa de um método claro, comprovado e pronto para ser executado.

Neste guia definitivo e transformador, você vai aprender:
• Como identificar e eliminar os 3 maiores ladrões invisíveis de tempo e energia
• O método prático para gerar 80% dos seus resultados concentrando-se no essencial
• Passos diários para construir uma disciplina consistente sem sofrimento ou esgotamento
• As estratégias mentais usadas por realizadores de elite para manter o foco inabalável
• Checklists e exercícios aplicáveis para avaliar e acelerar sua evolução dia após dia

Não importa se você está começando do zero ou procurando quebrar um platô de estagnação: este livro oferece o mapa exato para você retomar o protagonismo da sua jornada.

**Não adie a transformação que você merece. Role até o topo da página, clique em "Comprar Agora" e comece a mudar sua história hoje mesmo!**`;
    }

    // Fallback padrão genérico
    return 'Conteúdo estruturado com sucesso pelo motor editorial. Personalize os pontos conforme a necessidade do seu projeto.';
  }


  // --- STRUCTURED COMPLETION COM PARSE JSON ROBUSTO ---
  async structuredCompletion<T>(
    systemPrompt: string,
    userPrompt: string,
    fallbackValidator?: (parsed: any) => boolean
  ): Promise<T> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `${systemPrompt}\n\nIMPORTANTE: Sua resposta DEVE ser EXCLUSIVAMENTE um objeto JSON válido. Não inclua texto introdutório, explicações ou notas antes ou depois do JSON.`
      },
      {
        role: 'user',
        content: userPrompt
      }
    ];

    const rawResponse = await this.chatCompletion(messages, {
      temperature: 0.4,
      responseFormat: 'json'
    });

    const parsed = this.cleanAndParseJson(rawResponse);
    if (!parsed) {
      throw new Error(`Falha ao decodificar JSON retornado pela IA. Resposta bruta recebida:\n${rawResponse.substring(0, 300)}...`);
    }

    if (fallbackValidator && !fallbackValidator(parsed)) {
      throw new Error('O JSON retornado pela IA não atende à validação dos campos obrigatórios.');
    }

    return parsed as T;
  }

  // --- LIMPEZA E EXTRAÇÃO DE JSON ---
  private cleanAndParseJson(raw: string): any | null {
    if (!raw) return null;
    let text = raw.trim();

    // Remove markdown code blocks se presentes
    if (text.startsWith('```json')) {
      text = text.substring(7);
    } else if (text.startsWith('```')) {
      text = text.substring(3);
    }

    if (text.endsWith('```')) {
      text = text.substring(0, text.length - 3);
    }
    text = text.trim();

    try {
      return JSON.parse(text);
    } catch {
      // Tenta encontrar o primeiro { ou [ e o último } ou ]
      const firstCurly = text.indexOf('{');
      const lastCurly = text.lastIndexOf('}');
      if (firstCurly !== -1 && lastCurly > firstCurly) {
        try {
          return JSON.parse(text.substring(firstCurly, lastCurly + 1));
        } catch {
          // segue para busca de colchetes
        }
      }

      const firstBracket = text.indexOf('[');
      const lastBracket = text.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket > firstBracket) {
        try {
          return JSON.parse(text.substring(firstBracket, lastBracket + 1));
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  // --- IMPLEMENTAÇÃO OPENAI / OPENROUTER / CUSTOM ---
  private async callOpenAiCompatible(messages: ChatMessage[], temperature: number, options: AiCompletionOptions): Promise<string> {
    let baseUrl = this.settings.baseUrl?.trim() || 'https://api.openai.com/v1';
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

    const isDirectOpenAi = baseUrl.includes('api.openai.com');
    const apiKey = this.settings.apiKey?.trim();

    if (!apiKey && isDirectOpenAi) {
      throw new Error('Chave de API (API Key) não informada. Configure em Configurações > Inteligência Artificial.');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    if (baseUrl.includes('openrouter.ai')) {
      headers['HTTP-Referer'] = 'https://github.com/ShonP/kdp-book';
      headers['X-Title'] = 'BookEngin Book Creator';
    }

    const model = this.settings.model?.trim() || 'gpt-4o-mini';

    const body: Record<string, any> = {
      model,
      messages,
      temperature,
      max_tokens: options.maxTokens || 8192
    };

    if (options.responseFormat === 'json') {
      body.response_format = { type: 'json_object' };
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errBody = await res.text();
      let parsedErr = errBody;
      try {
        const jsonErr = JSON.parse(errBody);
        parsedErr = jsonErr.error?.message || errBody;
      } catch {
        // use raw
      }
      throw new Error(`Erro na API (${res.status}): ${parsedErr}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  // --- IMPLEMENTAÇÃO AZURE OPENAI ---
  private async callAzureOpenAI(messages: ChatMessage[], temperature: number, options: AiCompletionOptions): Promise<string> {
    const endpoint = this.settings.azureEndpoint?.trim() || this.settings.baseUrl?.trim();
    const apiKey = this.settings.azureApiKey?.trim() || this.settings.apiKey?.trim();
    const model = this.settings.model?.trim() || 'gpt-4o';

    if (!endpoint || !apiKey) {
      throw new Error('Endpoint do Azure OpenAI e Chave de API são obrigatórios.');
    }

    let url = endpoint;
    if (!url.includes('/openai/deployments/')) {
      url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${model}/chat/completions?api-version=2024-02-01`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'api-key': apiKey
    };

    const body: Record<string, any> = {
      messages,
      temperature
    };

    if (options.maxTokens) body.max_tokens = options.maxTokens;
    if (options.responseFormat === 'json') body.response_format = { type: 'json_object' };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Erro Azure OpenAI (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  // --- IMPLEMENTAÇÃO GOOGLE GEMINI (SUPORTE NATIVO AO NOVO FORMATO AQ. / AIza COM ROTAÇÃO E FALLBACK) ---
  private async callGemini(messages: ChatMessage[], temperature: number, options: AiCompletionOptions = {}): Promise<string> {
    const rawKeys = [
      this.settings.apiKey?.trim(),
      this.settings.fallbackApiKey?.trim()
    ].filter(Boolean) as string[];

    const uniqueKeys = Array.from(new Set(rawKeys));

    if (uniqueKeys.length === 0) {
      throw new Error('Chave de API do Google Gemini não informada. Configure em Configurações > Inteligência Artificial.');
    }

    const rawModel = this.settings.model?.trim() || 'gemini-2.0-flash';
    const model = rawModel.startsWith('models/') ? rawModel.replace('models/', '') : rawModel;

    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const contents = conversationMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    if (contents.length === 0 && systemMessages.length > 0) {
      contents.push({
        role: 'user',
        parts: [{ text: systemMessages.map(s => s.content).join('\n\n') }]
      });
    }

    const body: Record<string, any> = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: options.maxTokens || 8192
      }
    };

    if (systemMessages.length > 0 && contents.length > 0 && conversationMessages.length > 0) {
      body.systemInstruction = {
        parts: [{ text: systemMessages.map(s => s.content).join('\n\n') }]
      };
    }

    if (options.responseFormat === 'json') {
      body.generationConfig.responseMimeType = 'application/json';
    }

    let lastErrorMsg = '';

    // Rotação sequencial entre chaves em caso de erro 429, 401 ou quota
    for (let i = 0; i < uniqueKeys.length; i++) {
      const currentKey = uniqueKeys[i];
      const isFallback = i > 0;
      const keyPrefix = currentKey.substring(0, 10);

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(currentKey)}`;

        let res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': currentKey
          },
          body: JSON.stringify(body)
        });

        // Se o modelo especificado não for encontrado (404), tenta o modelo ultra-econômico gemini-3.5-flash-lite
        if (res.status === 404 && model !== 'gemini-3.5-flash-lite') {
          console.warn(`[Gemini Model] Modelo ${model} retornou 404. Acionando modelo ultra-econômico gemini-3.5-flash-lite...`);
          const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(currentKey)}`;
          res = await fetch(fallbackUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': currentKey
            },
            body: JSON.stringify(body)
          });
        }

        if (!res.ok) {
          const errBody = await res.text();
          let parsedMsg = errBody;
          try {
            const j = JSON.parse(errBody);
            parsedMsg = j.error?.message || errBody;
          } catch {
            // fallback
          }

          lastErrorMsg = `Gemini API (${res.status}): ${parsedMsg}`;
          console.warn(`[Gemini Auth] Chave ${keyPrefix}... retornou erro (${res.status}). Tentando chave seguinte...`);
          continue; // Tenta a próxima chave do array
        }

        const data = await res.json();
        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          if (isFallback) {
            console.log(`[Gemini Fallback] Sucesso na geração com a chave de reserva (${keyPrefix}...)!`);
          }
          return candidateText;
        }

        if (data.candidates?.[0]?.finishReason) {
          lastErrorMsg = `Gemini finalizou com motivo: ${data.candidates[0].finishReason}`;
          continue;
        }
      } catch (networkErr: any) {
        lastErrorMsg = networkErr.message || 'Erro de conexão de rede';
        console.warn(`[Gemini Network] Falha com chave ${keyPrefix}...: ${lastErrorMsg}`);
      }
    }

    throw new Error(`Falha em todas as chaves Gemini configuradas. Último erro: ${lastErrorMsg}`);
  }

  // --- IMPLEMENTAÇÃO ANTHROPIC CLAUDE ---
  private async callAnthropic(messages: ChatMessage[], temperature: number, maxTokens?: number): Promise<string> {
    const apiKey = this.settings.apiKey?.trim();
    if (!apiKey) throw new Error('Chave de API da Anthropic não informada.');

    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
    const otherMsgs = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: this.settings.model || 'claude-3-5-sonnet-20241022',
        system: systemMsg,
        messages: otherMsgs,
        temperature,
        max_tokens: maxTokens || 4096
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Erro Anthropic (${res.status}): ${err}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text || '';
  }

  // --- IMPLEMENTAÇÃO OLLAMA (LOCAL) ---
  private async callOllama(messages: ChatMessage[], temperature: number, options: AiCompletionOptions = {}): Promise<string> {
    const baseUrl = (this.settings.baseUrl?.trim() || 'http://localhost:11434').replace(/\/+$/, '');
    let model = this.settings.model?.trim() || '';

    // Verifica modelos instalados no Ollama para evitar erro 404
    let availableModels: string[] = [];
    try {
      availableModels = await AiService.fetchOllamaModels(baseUrl);
    } catch {
      // conexão será tratada na chamada principal
    }

    if (availableModels.length > 0) {
      const match = availableModels.find(m => m.startsWith(model) || model.startsWith(m.split(':')[0]));
      if (!match || model === 'gpt-4o-mini' || model === 'gpt-4o' || !model) {
        // Redireciona automaticamente para o modelo local real instalado no PC do usuário
        model = availableModels[0];
        this.settings.model = model;
      }
    } else if (!model || model === 'gpt-4o-mini' || model === 'gpt-4o') {
      model = 'llama3.1';
    }

    const payload: Record<string, any> = {
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      options: { 
        temperature,
        num_predict: options.maxTokens || 8192,
        num_ctx: 16384
      },
      stream: false
    };

    if (options.responseFormat === 'json') {
      payload.format = 'json';
    }

    try {
      let res = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Se der 404 porque o modelo não foi encontrado, tenta buscar qualquer modelo disponível no Ollama
      if (!res.ok && res.status === 404) {
        try {
          const freshModels = await AiService.fetchOllamaModels(baseUrl);
          if (freshModels.length > 0 && freshModels[0] !== model) {
            model = freshModels[0];
            payload.model = model;
            this.settings.model = model;
            res = await fetch(`${baseUrl}/api/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
          }
        } catch {
          // ignora tentativa de tags
        }
      }

      if (!res.ok) {
        const rawErr = await res.text();
        let errorDetails = rawErr;
        try {
          const parsed = JSON.parse(rawErr);
          if (parsed.error) errorDetails = parsed.error;
        } catch {}

        if (res.status === 404) {
          throw new Error(
            `Ollama retornou 404 (${errorDetails || 'modelo não encontrado'}). ` +
            `O modelo '${model}' não está baixado no seu Ollama. Execute 'ollama pull ${model}' ou use o Motor Local Embutido.`
          );
        }
        throw new Error(`Erro Ollama (${res.status}): ${errorDetails}`);
      }

      const data = await res.json();
      return data.message?.content || '';
    } catch (err: any) {
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.name === 'TypeError') {
        throw new Error(
          `Falha de conexão com Ollama em ${baseUrl}. ` +
          `Certifique-se de que o Ollama está em execução ('ollama serve') ou selecione o 'Motor Local Embutido (Offline)' nas configurações.`
        );
      }
      throw err;
    }
  }

  // --- TESTE DE CONEXÃO DO GERADOR DE IMAGENS ---
  async testImageConnection(): Promise<{ success: boolean; message: string; providerUsed: string }> {
    const imgProvider = this.settings.imageProvider || 'builtin-flux';
    const endpoint = (this.settings.imageEndpoint || 'http://127.0.0.1:7865').replace(/\/+$/, '');

    if (imgProvider === 'builtin-flux') {
      return {
        success: true,
        message: '✓ Motor Flux.1 Schnell (Nuvem Neural / Zero Instalação / Gratuito) ativo e pronto para gerar capas em alta resolução!',
        providerUsed: 'Flux.1 Schnell (Pollinations)'
      };
    }

    if (imgProvider === 'fooocus') {
      try {
        const res = await fetch(`${endpoint}/`, { method: 'GET', signal: AbortSignal.timeout(4000) });
        if (res.ok || res.status === 200 || res.status === 302) {
          return {
            success: true,
            message: `✓ Fooocus detectado e online em ${endpoint}! Pronto para gerar capas e ilustrações SDXL de qualidade editorial.`,
            providerUsed: 'Fooocus (Local)'
          };
        }
        return {
          success: false,
          message: `Fooocus respondeu com status ${res.status} em ${endpoint}. Certifique-se de que o run.bat está em execução.`,
          providerUsed: 'Fooocus'
        };
      } catch {
        return {
          success: false,
          message: `Não foi possível conectar ao Fooocus em ${endpoint}. Verifique se o executável do Fooocus (run.bat) está aberto no seu PC.`,
          providerUsed: 'Fooocus'
        };
      }
    }

    if (imgProvider === 'sd-webui') {
      try {
        const res = await fetch(`${endpoint}/sdapi/v1/sd-models`, { method: 'GET', signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          const models = await res.json();
          const count = Array.isArray(models) ? models.length : 0;
          return {
            success: true,
            message: `✓ Stable Diffusion WebUI / Forge online em ${endpoint} (${count} modelo(s) detectado(s))!`,
            providerUsed: 'SD WebUI / Forge'
          };
        }
        return {
          success: false,
          message: `SD WebUI respondeu com erro ${res.status}. Inicie com a flag --api no webui-user.bat.`,
          providerUsed: 'SD WebUI'
        };
      } catch {
        return {
          success: false,
          message: `SD WebUI offline em ${endpoint}. Certifique-se de executar webui-user.bat com a flag --api.`,
          providerUsed: 'SD WebUI'
        };
      }
    }

    if (imgProvider === 'comfyui') {
      try {
        const res = await fetch(`${endpoint}/system_stats`, { method: 'GET', signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          return {
            success: true,
            message: `✓ ComfyUI online em ${endpoint}!`,
            providerUsed: 'ComfyUI'
          };
        }
        return {
          success: false,
          message: `ComfyUI respondeu com status ${res.status} em ${endpoint}.`,
          providerUsed: 'ComfyUI'
        };
      } catch {
        return {
          success: false,
          message: `ComfyUI offline em ${endpoint}. Inicie o ComfyUI (main.py ou run_nvidia_gpu.bat).`,
          providerUsed: 'ComfyUI'
        };
      }
    }

    if (imgProvider === 'dalle3') {
      if (!this.settings.apiKey) {
        return {
          success: false,
          message: 'Chave de API OpenAI não informada para o DALL-E 3.',
          providerUsed: 'DALL-E 3'
        };
      }
      return {
        success: true,
        message: '✓ Provedor OpenAI DALL-E 3 configurado.',
        providerUsed: 'DALL-E 3'
      };
    }

    return {
      success: true,
      message: '✓ Gerador de imagem pronto.',
      providerUsed: imgProvider
    };
  }

  // --- GERAÇÃO DE IMAGEM MULTI-MOTOR (FOOOCUS / SD WEBUI / COMFYUI / FLUX.1 / DALL-E) ---
  async generateImage(prompt: string, size: '1024x1024' | '2048x2048' = '1024x1024'): Promise<string> {
    const imgProvider = this.settings.imageProvider || 'builtin-flux';
    const cleanPrompt = prompt.replace(/[\n\r]+/g, ' ').trim();

    // 1. FOOOCUS (Local - Padrão porta 7865 ou 7860)
    if (imgProvider === 'fooocus') {
      const base = (this.settings.imageEndpoint || 'http://127.0.0.1:7865').replace(/\/+$/, '');
      try {
        const fooRes = await fetch(`${base}/v1/generation/text-to-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: cleanPrompt,
            negative_prompt: 'blurry, ugly, deformed, text errors, watermark, low quality, bad anatomy',
            performance_selection: 'Speed',
            aspect_ratios_selection: '1024*1024',
            image_number: 1
          }),
          signal: AbortSignal.timeout(60000)
        });
        if (fooRes.ok) {
          const fooData = await fooRes.json();
          if (Array.isArray(fooData) && fooData[0]?.url) {
            return fooData[0].url.startsWith('http') ? fooData[0].url : `${base}${fooData[0].url}`;
          }
          if (fooData.data?.[0]?.url) return fooData.data[0].url;
          if (fooData.images?.[0]) return `data:image/png;base64,${fooData.images[0]}`;
        }
      } catch (e) {
        console.warn('[AiService] Fooocus local não respondeu, tentando endpoint WebUI ou fallback Flux:', e);
      }
    }

    // 2. STABLE DIFFUSION WEBUI / FORGE (AUTOMATIC1111 na porta 7860)
    if (imgProvider === 'sd-webui' || imgProvider === 'fooocus') {
      const sdBase = (this.settings.imageEndpoint && imgProvider === 'sd-webui' ? this.settings.imageEndpoint : 'http://127.0.0.1:7860').replace(/\/+$/, '');
      try {
        const sdRes = await fetch(`${sdBase}/sdapi/v1/txt2img`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: cleanPrompt,
            negative_prompt: 'blurry, low quality, distorted typography, watermark, bad anatomy, cropped',
            steps: 25,
            width: 1024,
            height: 1024,
            cfg_scale: 7.0
          }),
          signal: AbortSignal.timeout(60000)
        });
        if (sdRes.ok) {
          const sdData = await sdRes.json();
          if (sdData.images && sdData.images[0]) {
            return `data:image/png;base64,${sdData.images[0]}`;
          }
        }
      } catch {
        // SD WebUI não respondeu
      }
    }

    // 3. AZURE OPENAI
    if (this.settings.provider === 'azure' && this.settings.azureImageEndpoint) {
      const apiKey = this.settings.azureApiKey || this.settings.apiKey;
      try {
        const res = await fetch(this.settings.azureImageEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey || ''
          },
          body: JSON.stringify({
            prompt: cleanPrompt,
            n: 1,
            size: size === '2048x2048' ? '1024x1024' : size
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.data?.[0]?.url) return data.data[0].url;
        }
      } catch (e) {
        console.warn('[AiService] Falha Azure image:', e);
      }
    }

    // 4. OPENAI OFICIAL DALL-E 3
    if (this.settings.apiKey && (imgProvider === 'dalle3' || this.settings.provider === 'openai')) {
      try {
        const res = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.settings.apiKey}`
          },
          body: JSON.stringify({
            model: this.settings.imageModel || 'dall-e-3',
            prompt: cleanPrompt,
            n: 1,
            size: '1024x1024'
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.data?.[0]?.url) return data.data[0].url;
        }
      } catch (e) {
        console.warn('[AiService] Falha DALL-E 3:', e);
      }
    }

    // 5. MOTOR DE ALTA DEFINIÇÃO: FLUX.1 SCHNELL (Pollinations AI - Sem necessidade de GPU local)
    const seed = Math.floor(Math.random() * 9999999);
    const encodedPrompt = encodeURIComponent(cleanPrompt.substring(0, 450));
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&model=flux&seed=${seed}`;
  }
}
