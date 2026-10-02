export interface AmazonBestSellerReference {
  id: string;
  asin: string;
  title: string;
  subtitle?: string;
  author: string;
  rankBadge: string;
  categoryTag: string;
  rating: number;
  reviewCount: number;
  price: number;
  format: 'Paperback' | 'Kindle' | 'Hardcover';
  successFormula: string;
  suggestedProjectHook: string;
  suggestedTitle: string;
  suggestedSubtitle: string;
  targetAudience: string;
  narrativeStructure: string;
  competitiveEdge: string;
}

export const AMAZON_BESTSELLERS_BY_SEGMENT: Record<string, AmazonBestSellerReference[]> = {
  // 1. NEGÓCIOS & GESTÃO
  business: [
    {
      id: 'biz-1',
      asin: 'B0058DRUV6',
      title: 'Good to Great (Empresas Feitas para Vencer)',
      author: 'Jim Collins',
      rankBadge: '#1 Bestseller em Gestão',
      categoryTag: 'Liderança & Estratégia',
      rating: 4.8,
      reviewCount: 48000,
      price: 13.99,
      format: 'Hardcover',
      successFormula: 'Framework Flywheel e Liderança Nível 5: dados empíricos rigorosos que mostram a transição de empresas médias para gigantes duradouras.',
      suggestedProjectHook: 'Construído para Escalar: Princípios Empíricos de Liderança e Processos para Empresas de Alta Performance',
      suggestedTitle: 'Construído para Escalar',
      suggestedSubtitle: 'Princípios Práticos para Transformar Operações Frágeis em Negócios Sólidos e Autônomos',
      targetAudience: 'Empreendedores, diretores e gestores de pequenas e médias empresas buscando previsibilidade operacional.',
      narrativeStructure: 'Diagnóstico da armadilha do bom -> O conceito do Porco-Espinho -> A cultura da disciplina -> Aceleradores de tecnologia -> O efeito volante.',
      competitiveEdge: 'Foco em ferramentas de execução imediata sem o jargão corporativo excessivo.'
    },
    {
      id: 'biz-2',
      asin: 'B00J6YBOFQ',
      title: 'Zero to One (De Zero a Um)',
      author: 'Peter Thiel',
      rankBadge: 'Top 10 Amazon BSR Inovação',
      categoryTag: 'Startups & Monopólios Criativos',
      rating: 4.6,
      reviewCount: 62000,
      price: 12.99,
      format: 'Paperback',
      successFormula: 'Tese contraintuitiva de que progresso vertical (tecnologia) cria valor sustentável ao construir segredos que ninguém mais enxerga.',
      suggestedProjectHook: 'O Código da Tração Exponencial: Como Criar Valor Insubstituível em Mercados Saturados',
      suggestedTitle: 'A Lógica da Insubstituibilidade',
      suggestedSubtitle: 'Como Encontrar Segredos de Mercado e Construir Vantagens Competitivas Impossíveis de Copiar',
      targetAudience: 'Fundadores de startups, inovadores corporativos e investidores de risco.',
      narrativeStructure: 'O desafio do futuro -> Ideias heréticas -> Os 4 pilares do monopólio criativo -> Distribuição como chave invisível.',
      competitiveEdge: 'Metodologia acionável para validação de hipóteses com baixo custo inicial.'
    },
    {
      id: 'biz-3',
      asin: 'B00O92T536',
      title: 'Tração: Domine os 19 Canais para Crescimento',
      author: 'Gabriel Weinberg & Justin Mares',
      rankBadge: '#1 em Marketing e Crescimento',
      categoryTag: 'Crescimento Acelerado (Growth)',
      rating: 4.7,
      reviewCount: 31000,
      price: 11.99,
      format: 'Paperback',
      successFormula: 'Framework Bullseye para testar sistematicamente canais de distribuição antes de queimar orçamento publicitário.',
      suggestedProjectHook: 'Tração Real: Estratégias Enxutas para Multiplicar Vendas e Clientes B2B sem Desperdício',
      suggestedTitle: 'Tração Real',
      suggestedSubtitle: 'O Método de 5 Fases para Validar Canais de Venda e Gerar Receita Previsível em 90 Dias',
      targetAudience: 'Times comerciais B2B, consultores de crescimento e donos de e-commerce.',
      narrativeStructure: 'O funil de três anéis -> Matriz de testes rápidos -> Otimização de CAC e LTV -> Escala focada.',
      competitiveEdge: 'Passo a passo com planilhas mentais e casos reais adaptáveis ao contexto local.'
    },
    {
      id: 'biz-4',
      asin: 'B097Z77M2K',
      title: '$100M Offers (Ofertas de 100 Milhões)',
      author: 'Alex Hormozi',
      rankBadge: '#1 Global Amazon Books',
      categoryTag: 'Vendas & Precificação de Valor',
      rating: 4.9,
      reviewCount: 75000,
      price: 9.99,
      format: 'Kindle',
      successFormula: 'Equação de Valor: como criar ofertas tão vantajosas e sem atrito que o cliente se sinta tolo ao recusar.',
      suggestedProjectHook: 'Engenharia de Ofertas Irrecusáveis: Como Precificar pelo Valor Percebido e Dobrar Margens',
      suggestedTitle: 'A Oferta Magnética',
      suggestedSubtitle: 'Como Estruturar Pacotes de Alto Ticket com Garantias Reversas e Vender com Margem Máxima',
      targetAudience: 'Profissionais autônomos, agências e prestadores de serviços de alto padrão.',
      narrativeStructure: 'A ilusão da comoditização -> A equação do valor -> O empilhamento de bônus -> Aversão ao risco.',
      competitiveEdge: 'Modelos de script de vendas e precificação sem descontos prejudiciais.'
    }
  ],

  // 2. FINANÇAS & RENDA PASSIVA
  finance: [
    {
      id: 'fin-1',
      asin: 'B084HJSJZ2',
      title: 'The Psychology of Money (A Psicologia Financeira)',
      author: 'Morgan Housel',
      rankBadge: '#1 Bestseller Global Finanças',
      categoryTag: 'Comportamento & Liberdade Financeira',
      rating: 4.8,
      reviewCount: 89000,
      price: 10.99,
      format: 'Paperback',
      successFormula: 'Narrativas curtas e envolventes provando que a gestão do ego e do tempo supera o conhecimento técnico na construção de riqueza duradoura.',
      suggestedProjectHook: 'A Mente Racional do Investidor: Princípios Comportamentais para Proteger e Multiplicar Patrimônio',
      suggestedTitle: 'Riqueza Silenciosa',
      suggestedSubtitle: 'Princípios Atemporais sobre Paciência, Decisão e Preservação de Capital para Viver com Tranquilidade',
      targetAudience: 'Pessoas de qualquer renda que desejam segurança mental e patrimonial sem ansiedade de mercado.',
      narrativeStructure: 'Ninguém é louco com dinheiro -> Sorte e risco -> Nunca é o suficiente -> O poder dos juros compostos da paciência.',
      competitiveEdge: 'Enfoque humanizado e prático que desmistifica fórmulas mágicas de enriquecimento rápido.'
    },
    {
      id: 'fin-2',
      asin: 'B071VT7T45',
      title: 'Rich Dad Poor Dad (Pai Rico, Pai Pobre)',
      author: 'Robert T. Kiyosaki',
      rankBadge: '#1 Finanças Pessoais de Todos os Tempos',
      categoryTag: 'Ativos vs Passivos',
      rating: 4.8,
      reviewCount: 185000,
      price: 11.99,
      format: 'Paperback',
      successFormula: 'Contraste narrativo polarizado que redefine ativos como tudo que coloca dinheiro no bolso e passivos como o que tira.',
      suggestedProjectHook: 'A Máquina de Ativos: Como Gerar Fluxo de Caixa Passivo e Sair da Corrida dos Ratos',
      suggestedTitle: 'O Código dos Ativos',
      suggestedSubtitle: 'Como Construir Múltiplas Fontes de Renda e Conquistar a Independência Financeira Definitiva',
      targetAudience: 'Jovens profissionais e assalariados buscando transição para investidores proprietários.',
      narrativeStructure: 'A armadilha do salário -> A diferença entre ricos e classe média -> Como o dinheiro trabalha para você -> Gestão de risco.',
      competitiveEdge: 'Exemplos contemporâneos adaptados à realidade dos novos negócios digitais e fundos imobiliários.'
    },
    {
      id: 'fin-3',
      asin: 'B01H97OQY2',
      title: 'The Simple Path to Wealth (O Caminho Simples para a Riqueza)',
      author: 'JL Collins',
      rankBadge: 'Top 3 BSR Independência Financeira (F.I.R.E.)',
      categoryTag: 'Investimento em Índices & Aportes',
      rating: 4.9,
      reviewCount: 52000,
      price: 9.99,
      format: 'Kindle',
      successFormula: 'Clareza brutal sobre o poder de viver abaixo das possibilidades e alocar consistentemente em fundos de índice amplos de baixo custo.',
      suggestedProjectHook: 'O Caminho Previsível da Riqueza: Estratégia de Aportes Automáticos para Aposentadoria Antecipada',
      suggestedTitle: 'Independência Financeira sem Segredos',
      suggestedSubtitle: 'O Método Direto para Acumular Patrimônio, Eliminar Dívidas e Aposentar-se com Dignidade',
      targetAudience: 'Iniciantes em investimentos que não têm tempo para acompanhar o sobe-desce diário da bolsa.',
      narrativeStructure: 'Por que o mercado sempre sobe no longo prazo -> F.U. Money -> A simplicidade dos aportes -> Fase de acumulação vs preservação.',
      competitiveEdge: 'Linguagem descontraída e acolhedora como uma conversa entre mentor e aprendiz.'
    },
    {
      id: 'fin-4',
      asin: 'B074MBNWXP',
      title: 'O Homem Mais Rico da Babilônia',
      author: 'George S. Clason',
      rankBadge: 'Clássico Imortal (+110k reviews)',
      categoryTag: 'Educação Financeira Básica',
      rating: 4.8,
      reviewCount: 110000,
      price: 6.99,
      format: 'Paperback',
      successFormula: 'Parábolas históricas envolventes que ensinam as 7 leis do ouro: pague a si mesmo primeiro e faça cada moeda trabalhar como um servo.',
      suggestedProjectHook: 'As Leis do Ouro Moderno: Lições Atemporais de Economia e Prosperidade Aplicadas ao Século 21',
      suggestedTitle: 'As Sete Leis da Prosperidade',
      suggestedSubtitle: 'Princípios Clássicos para Encher a Carteira Vazia e Fazer o Dinheiro Trabalhar por Você',
      targetAudience: 'Famílias e jovens que precisam de disciplina e reeducação na gestão do orçamento doméstico.',
      narrativeStructure: 'O ouro procura quem o respeita -> Faça o ouro gerar ouro -> Proteja o capital das perdas -> Aumente sua capacidade de ganho.',
      competitiveEdge: 'Tom inspirador, de leitura rápida e altamente memorável.'
    }
  ],

  // 3. DESENVOLVIMENTO & HÁBITOS
  'self-help': [
    {
      id: 'hab-1',
      asin: 'B07D23CFGR',
      title: 'Atomic Habits (Hábitos Atômicos)',
      author: 'James Clear',
      rankBadge: '#1 Bestseller Absoluto Amazon Books',
      categoryTag: 'Ciência Comportamental & Hábitos',
      rating: 4.8,
      reviewCount: 198000,
      price: 11.99,
      format: 'Paperback',
      successFormula: 'As 4 Leis da Mudança de Comportamento: tornar claro, atraente, fácil e satisfatório, com ênfase na identidade em vez de metas abstratas.',
      suggestedProjectHook: 'Arquitetura de Hábitos Inabaláveis: Sistemas Diários de 1% para Foco, Disciplina e Produtividade Contínua',
      suggestedTitle: 'O Poder da Consistência Diária',
      suggestedSubtitle: 'Como Micro-Ajustes de 5 Minutos Podem Reprogramar sua Rotina e Eliminar a Procrastinação sem Esforço',
      targetAudience: 'Pessoas com rotina corrida que falham em manter metas anuais e precisam de sustentabilidade prática.',
      narrativeStructure: 'Por que metas não funcionam mas sistemas sim -> Como sua identidade molda hábitos -> As 4 regras de implementação -> O perigo dos pequenos deslizes.',
      competitiveEdge: 'Exercícios práticos de implementação com folhas de rastreamento de hábitos no final de cada capítulo.'
    },
    {
      id: 'hab-2',
      asin: 'B00X47ZWXM',
      title: 'Deep Work (Foco Profundo)',
      author: 'Cal Newport',
      rankBadge: '#1 em Gestão do Tempo e Foco',
      categoryTag: 'Produtividade Cognitiva',
      rating: 4.6,
      reviewCount: 45000,
      price: 8.99,
      format: 'Paperback',
      successFormula: 'A habilidade de se concentrar intensamente sem distrações como o superpoder mais valioso da economia moderna.',
      suggestedProjectHook: 'Foco Profundo na Era do Ruído: Estratégias para Blindar sua Mente e Multiplicar Resultados',
      suggestedTitle: 'Mente Blindada',
      suggestedSubtitle: 'Como Retomar o Controle da sua Atenção, Eliminar Distrações Digitais e Produzir com Excelência',
      targetAudience: 'Estudantes, escritores, programadores e profissionais que sofrem com notificações e fragmentação mental.',
      narrativeStructure: 'A hipótese do trabalho focado -> As 4 filosofias de agendamento -> Como abraçar o tédio -> Dizer adeus às redes desnecessárias.',
      competitiveEdge: 'Protocolos de 60 minutos de imersão direta aplicáveis hoje mesmo.'
    },
    {
      id: 'hab-3',
      asin: 'B07KKP62FW',
      title: 'Can’t Hurt Me (Nada Pode Me Ferir)',
      author: 'David Goggins',
      rankBadge: 'Top 5 BSR Amazon Biografia & Superação',
      categoryTag: 'Autodisciplina & Resistência Mental',
      rating: 4.8,
      reviewCount: 142000,
      price: 9.99,
      format: 'Paperback',
      successFormula: 'A Regra dos 40%: quando a mente diz que você chegou ao limite, na verdade você usou apenas 40% da sua capacidade real.',
      suggestedProjectHook: 'Além do Limite: A Psicologia da Força Mental Inquebrável para Superar Crises e Desafios Extremos',
      suggestedTitle: 'Resiliência Absoluta',
      suggestedSubtitle: 'Como Forjar uma Mentalidade Inabalável e Vencer as Batalhas Mais Difíceis da sua Vida',
      targetAudience: 'Leitores que buscam inspiração enérgica para sair da inércia, emagrecer, mudar de carreira ou vencer depressão funcional.',
      narrativeStructure: 'O espelho da verdade -> Calejar a mente -> A jarra de biscoitos da coragem -> Vencer sem desculpas.',
      competitiveEdge: 'Tom direto, visceral e sem condescendência, que impulsiona a ação imediata.'
    },
    {
      id: 'hab-4',
      asin: 'B00G1J1D28',
      title: 'Essentialism (Essencialismo)',
      author: 'Greg McKeown',
      rankBadge: '#1 em Tomada de Decisão',
      categoryTag: 'A Disciplinada Busca por Menos',
      rating: 4.6,
      reviewCount: 39000,
      price: 8.99,
      format: 'Paperback',
      successFormula: 'Se você não priorizar sua própria vida, outra pessoa o fará: o foco implacável nas poucas coisas que realmente geram valor.',
      suggestedProjectHook: 'O Filtro do Essencial: A Arte de Dizer Não para o Secundário e Prosperar no que Realmente Importa',
      suggestedTitle: 'A Arte de Simplificar',
      suggestedSubtitle: 'Como Eliminar o Excesso, Reduzir a Sobrecarga e Viver com Foco no que é Vital',
      targetAudience: 'Executivos, mães e pais sobrecarregados e profissionais que se sentem constantemente exaustos.',
      narrativeStructure: 'A essência do essencialista -> Explorar -> Eliminar com elegância -> Executar sem fricção.',
      competitiveEdge: 'Matriz visual de priorização fácil de imprimir e colocar na mesa de trabalho.'
    }
  ],

  // 4. SAÚDE & LONGEVIDADE
  'health-wellness': [
    {
      id: 'hlth-1',
      asin: 'B09TWSC856',
      title: 'Outlive: A Ciência da Longevidade',
      author: 'Peter Attia, MD',
      rankBadge: '#1 Bestseller New York Times & Amazon',
      categoryTag: 'Medicina Preventiva & Longevidade',
      rating: 4.8,
      reviewCount: 54000,
      price: 14.99,
      format: 'Hardcover',
      successFormula: 'Medicina 3.0: focar na extensão da longevidade com saúde ativa (Healthspan) e combate antecipado aos 4 cavaleiros da morte crônica.',
      suggestedProjectHook: 'Longevidade Funcional: Protocolos Validados para Viver Mais com Vitalidade, Força e Lucidez',
      suggestedTitle: 'A Ciência da Longevidade Ativa',
      suggestedSubtitle: 'Como Proteger seu Corpo e Cérebro das Doenças Silenciosas e Manter Energia aos 50, 70 e 90 Anos',
      targetAudience: 'Adultos de 30 a 65 anos preocupados com saúde preventiva, condicionamento metabólico e histórico familiar de doenças.',
      narrativeStructure: 'O conceito de Healthspan -> Exercício como o remédio mais potente -> Nutrição sem ideologias -> Sono e saúde emocional.',
      competitiveEdge: 'Explicação acessível de biomarcadores e rotinas de treino sem complexidade médica excessiva.'
    },
    {
      id: 'hlth-2',
      asin: 'B06ZZ1Y3PF',
      title: 'Por Que Nós Dormimos',
      author: 'Matthew Walker, PhD',
      rankBadge: '#1 Neurociência e Sono',
      categoryTag: 'Sono Restaurador & Energia',
      rating: 4.7,
      reviewCount: 42000,
      price: 9.99,
      format: 'Paperback',
      successFormula: 'Evidências neurocientíficas contundentes de que o sono REM e o sono profundo são o maior multiplicador de imunidade, memória e saúde mental.',
      suggestedProjectHook: 'O Sono Reparador: O Segredo Biológico para Regeneração Celular, Foco Impecável e Controle do Estresse',
      suggestedTitle: 'Sono Profundo & Alta Energia',
      suggestedSubtitle: 'O Manual Prático para Desligar a Mente Ansiosa à Noite e Acordar com Disposição Total',
      targetAudience: 'Insones crônicos, trabalhadores por turno e pessoas dependentes de café para funcionar.',
      narrativeStructure: 'A arquitetura dos ciclos de sono -> Por que seu cérebro precisa sonhar -> O impacto letal da privação -> O protocolo do quarto escuro.',
      competitiveEdge: 'Guia de higiene do sono sem remédios ou substâncias viciantes.'
    },
    {
      id: 'hlth-3',
      asin: 'B09G3B7W2K',
      title: 'A Revolução da Glicose',
      author: 'Jessie Inchauspé',
      rankBadge: 'Top 3 BSR Nutrição & Biohacking',
      categoryTag: 'Controle Metabólico & Disposição',
      rating: 4.8,
      reviewCount: 38000,
      price: 11.99,
      format: 'Paperback',
      successFormula: '10 hacks simples para controlar os picos de glicose (como ordem dos alimentos e vinagre) sem eliminar os pratos favoritos.',
      suggestedProjectHook: 'Equilíbrio Metabólico: Pequenos Hábitos Alimentares para Controlar Desejos, Desinflamar o Corpo e Dobrar a Energia',
      suggestedTitle: 'Metabolismo Inteligente',
      suggestedSubtitle: 'Como Estabilizar sua Energia Diária e Queimar Gordura sem Dietas Restritivas ou Contagem de Calorias',
      targetAudience: 'Pessoas com fadiga pós-almoço, pré-diabetes, compulsão por doces ou inflamação crônica.',
      narrativeStructure: 'O que a glicose faz no sangue -> Os perigos dos picos invisíveis -> Os 10 hacks práticos do dia a dia -> Cardápios sem sofrimento.',
      competitiveEdge: 'Estratégias fáceis de aplicar em restaurantes, reuniões e almoços em família.'
    }
  ],

  // 5. TECNOLOGIA, IA & FERRAMENTAS
  'practical-guide': [
    {
      id: 'tech-1',
      asin: 'B09J5Q525V',
      title: 'Building a Second Brain (Criando um Segundo Cérebro)',
      author: 'Tiago Forte',
      rankBadge: '#1 Bestseller em Gestão da Informação',
      categoryTag: 'Produtividade Pessoal & Conhecimento',
      rating: 4.6,
      reviewCount: 28000,
      price: 11.99,
      format: 'Hardcover',
      successFormula: 'Metodologia C.O.D.E. (Capture, Organize, Distill, Express) e sistema P.A.R.A. para transformar notas digitais em projetos finalizados.',
      suggestedProjectHook: 'O Segundo Cérebro Digital: Como Organizar sua Vida e Multiplicar seu Conhecimento com Ferramentas Modernas',
      suggestedTitle: 'Segundo Cérebro Prático',
      suggestedSubtitle: 'Um Sistema Simples para Organizar Ideias, Salvar Conteúdos Úteis e Nunca Mais Esquecer Nada Importante',
      targetAudience: 'Estudantes, pesquisadores, criadores e profissionais do conhecimento que sofrem com sobrecarga de abas e anotações perdidas.',
      narrativeStructure: 'A ilusão de guardar tudo na memória -> Os 4 estágios do fluxo CODE -> O método PARA -> A expressão rápida de ideias.',
      competitiveEdge: 'Exemplos aplicáveis no Notion, Obsidian, Apple Notes e Google Keep.'
    },
    {
      id: 'tech-2',
      asin: 'B0CHY8Z122',
      title: 'Prompt Engineering for Generative AI',
      author: 'James Phoenix & Mike Taylor',
      rankBadge: '#1 em Inteligência Artificial Prática',
      categoryTag: 'IA Generativa & Automação',
      rating: 4.7,
      reviewCount: 16500,
      price: 12.99,
      format: 'Paperback',
      successFormula: 'Estruturas de comando profissionais (Role, Task, Context, Constraints, Few-Shot) para extrair resultados de nível especialista de LLMs.',
      suggestedProjectHook: 'Engenharia de Prompts na Prática: Como Fazer a IA Trabalhar como sua Equipe de Especialistas de Elite',
      suggestedTitle: 'O Livro Negro dos Prompts',
      suggestedSubtitle: 'Fórmulas Testadas de Engenharia de Prompt para Economizar 20 Horas por Semana com ChatGPT e Ferramentas de IA',
      targetAudience: 'Profissionais de marketing, redatores, consultores e empresários que querem automação sem código.',
      narrativeStructure: 'Como os modelos de linguagem pensam -> A anatomia do prompt perfeito -> Few-Shot e Chain-of-Thought -> Automações e agentes.',
      competitiveEdge: 'Biblioteca com mais de 50 templates prontos para copiar, colar e calibrar.'
    }
  ],

  // 6. ROMANCE & NEW ADULT
  romance: [
    {
      id: 'rom-1',
      asin: 'B0176M3U10',
      title: 'It Ends with Us (É Assim que Acaba)',
      author: 'Colleen Hoover',
      rankBadge: '#1 Bestseller Ficção Mundial Amazon',
      categoryTag: 'Romance Dramático & Resiliência',
      rating: 4.7,
      reviewCount: 312000,
      price: 10.99,
      format: 'Paperback',
      successFormula: 'Dilema emocional profundo e conexão visceral: escolhas corajosas sobre quebrar ciclos geracionais sem abrir mão da esperança de um amor verdadeiro.',
      suggestedProjectHook: 'Corações à Prova de Tempestade: Um Romance Intenso sobre Segundas Chances, Amor Próprio e Romper Ciclos',
      suggestedTitle: 'Onde as Feridas Florescem',
      suggestedSubtitle: 'Um Romance Intenso sobre o Peso das Nossas Escolhas e a Coragem de Amar de Novo',
      targetAudience: 'Leitoras assíduas do BookTok e Kindle Unlimited apaixonadas por drama emocional realista e heroínas fortes.',
      narrativeStructure: 'Encontro magnético no presente -> O refúgio das memórias de juventude -> A quebra da perfeição -> O ato de coragem final.',
      competitiveEdge: 'Diálogos de alta identificação emocional e final catártico inesquecível.'
    },
    {
      id: 'rom-2',
      asin: 'B09594TX3W',
      title: 'Twisted Love',
      author: 'Ana Huang',
      rankBadge: '#1 Enemies to Lovers & Bilionários',
      categoryTag: 'Dark Romance Leve & Suspense',
      rating: 4.4,
      reviewCount: 92300,
      price: 4.99,
      format: 'Kindle',
      successFormula: 'Dinâmica irresistível de Grumpy x Sunshine com herói moralmente cinzento e protetor obsessivo encarregado de cuidar da irmã do melhor amigo.',
      suggestedProjectHook: 'Pacto de Sombras: Um Romance Enemies-to-Lovers de Alta Tensão entre um Protetor Frio e a Mulher que Desperta seu Coração',
      suggestedTitle: 'Jogo de Fogo e Sombras',
      suggestedSubtitle: 'Ele Prometeu Protegê-la do Mundo, mas Acabou se Tornando o Perigo Mais Sedutor',
      targetAudience: 'Comunidade de New Adult que ama tropos de proximidade forçada, bilionários perigosos e química explosiva.',
      narrativeStructure: 'O acordo forçado de convivência -> Faíscas de irritação mútua -> Revelação de vulnerabilidades secretas -> O clímax de redenção.',
      competitiveEdge: 'Banter afiado e ritmo de virar páginas veloz.'
    }
  ],

  // 7. SUSPENSE & THRILLER
  thriller: [
    {
      id: 'thr-1',
      asin: 'B09TWSRMC4',
      title: 'The Housemaid (A Empregada)',
      author: 'Freida McFadden',
      rankBadge: '#1 Suspense Psicológico Amazon',
      categoryTag: 'Reviravoltas Eletrizantes (Plot Twist)',
      rating: 4.5,
      reviewCount: 275000,
      price: 4.99,
      format: 'Kindle',
      successFormula: 'Narrador não-confiável em casa perfeita: uma premissa doméstica que vira completamente de cabeça para baixo no meio da história.',
      suggestedProjectHook: 'A Hóspede Perfeita: Um Thriller Psicológico de Tirar o Fôlego onde Nada Nesta Casa é o que Parece',
      suggestedTitle: 'A Hóspede Silenciosa',
      suggestedSubtitle: 'Ela Precisava de um Recomeço Seguro. Mas a Família Perfeita Escondia Segredos Fatais.',
      targetAudience: 'Fãs de reviravoltas chocantes, ambientes claustrofóbicos e jogos mentais de gato e rato.',
      narrativeStructure: 'A contratação dos sonhos -> Pistas inquietantes no sótão -> A virada de ponto de vista -> O confronto de manipulação.',
      competitiveEdge: 'Ganchos fortes no fim de cada capítulo para prender o leitor de madrugada.'
    },
    {
      id: 'thr-2',
      asin: 'B077R2V3W5',
      title: 'The Silent Patient (A Paciente Silenciosa)',
      author: 'Alex Michaelides',
      rankBadge: 'Top 5 BSR Global Suspense',
      categoryTag: 'Investigação Psiquiátrica & Tragédia Grega',
      rating: 4.5,
      reviewCount: 285000,
      price: 9.99,
      format: 'Paperback',
      successFormula: 'O silêncio como o maior mistério: uma pintora famosa mata o marido e nunca mais diz uma única palavra, desafiando o psicoterapeuta.',
      suggestedProjectHook: 'O Último Retrato: A Obsessão de um Investigador para Fazer Falar a Única Testemunha de um Crime Bizarro',
      suggestedTitle: 'A Testemunha sem Voz',
      suggestedSubtitle: 'Um Enigma Psicológico Obscuro onde a Verdade está Oculta Atrás de um Silêncio Intencional',
      targetAudience: 'Leitores de thrillers intelectuais com toques de arte, psicologia analítica e desfechos magistrais.',
      narrativeStructure: 'O crime em silêncio -> As anotações do diário da suspeita -> A obsessão do terapeuta -> O quebra-cabeça que se fecha com espanto.',
      competitiveEdge: 'Atmosfera densa e pistas plantadas de forma engenhosa ao longo de todo o texto.'
    }
  ],

  // 8. TRUE CRIME & DETETIVES
  mystery: [
    {
      id: 'mys-1',
      asin: 'B07N18L64N',
      title: 'A Good Girl’s Guide to Murder',
      author: 'Holly Jackson',
      rankBadge: '#1 em Mistério Investigativo Jovem/Adulto',
      categoryTag: 'Casos Frios & Investigação Multimídia',
      rating: 4.6,
      reviewCount: 165000,
      price: 7.99,
      format: 'Kindle',
      successFormula: 'Investigação investigativa com registros de áudio, transcrições de entrevistas e anotações manuscritas que fazem o leitor investigar junto.',
      suggestedProjectHook: 'O Caso da Garota do Lago: Um Projeto Escolar que Desenterra o Maior Segredo Obscuro de uma Pequena Cidade',
      suggestedTitle: 'Arquivo 48: Pistas de Gelo',
      suggestedSubtitle: 'Um Mistério Eletrizante onde Cada Testemunha Conta uma Mentira Conveniente',
      targetAudience: 'Leitores que amam podcasts de true crime e histórias com pistas palpáveis para dedução.',
      narrativeStructure: 'O fechamento injusto do caso antigo -> A abertura da investigação independente -> Pistas que apontam para os poderosos -> A revelação da verdade.',
      competitiveEdge: 'Diagramação rica com notas e registros investigativos autênticos.'
    },
    {
      id: 'mys-2',
      asin: 'B0833F8W3D',
      title: 'The Thursday Murder Club',
      author: 'Richard Osman',
      rankBadge: '#1 Cozy Mystery Britânico',
      categoryTag: 'Investigadores Seniores & Humor Fino',
      rating: 4.6,
      reviewCount: 140000,
      price: 9.99,
      format: 'Paperback',
      successFormula: 'Quatro aposentados charmosos e geniais em uma vila pacífica que investigam crimes não resolvidos com café, chá e dedução brilhante.',
      suggestedProjectHook: 'O Clube das Quintas: Quatro Amigos Aposentados e um Crime Insolúvel que a Polícia Não Conseguiu Decifrar',
      suggestedTitle: 'O Enigma do Clube da Tarde',
      suggestedSubtitle: 'Uma História Divertida e Astuta de Investigação Amadora em uma Vizinha Aparentemente Inofensiva',
      targetAudience: 'Público que aprecia mistérios aconchegantes sem violência gratuita, com diálogos memoráveis.',
      narrativeStructure: 'A rotina pacífica dos encontros -> A morte misteriosa na vizinhança -> O uso astuto da invisibilidade da idade -> O xeque-mate nos culpados.',
      competitiveEdge: 'Personagens carismáticos que criam laços afetivos instantâneos com o leitor.'
    }
  ],

  // 9. FANTASIA & SWORD/SORCERY
  fantasy: [
    {
      id: 'fan-1',
      asin: 'B013RA92C4',
      title: 'The Blade Itself (A Lâmina em Si)',
      author: 'Joe Abercrombie',
      rankBadge: '#1 Grimdark Sword & Sorcery',
      categoryTag: 'Fantasia Sombria & Personagens Marcantes',
      rating: 4.7,
      reviewCount: 68400,
      price: 9.99,
      format: 'Paperback',
      successFormula: 'Personagens moralmente complexos, lutas viscerais de aço e diálogo irônico que desconstrói os clichês heroicos tradicionais.',
      suggestedProjectHook: 'A Canção do Aço e da Cinza: Uma Saga Épica de Guerreiros Cansados, Conspirações Reais e Magia Proibida',
      suggestedTitle: 'Pacto de Sangue e Cinzas',
      suggestedSubtitle: 'Em um Império à Beira do Colapso, a Justiça Só Existe na Ponta de uma Lâmina Afiada',
      targetAudience: 'Fãs de fantasia épica madura, Game of Thrones e aventuras de capa e espada crônicas.',
      narrativeStructure: 'Apresentação dos três caminhos opostos -> O encontro na corte decadente -> A expedição perigosa às ruínas antigas -> A traição anunciada.',
      competitiveEdge: 'Cenas de combate com excelente ritmo coreográfico e descrições táteis de impacto.'
    },
    {
      id: 'fan-2',
      asin: 'B003P2WO5E',
      title: 'The Way of Kings (O Caminho dos Reis)',
      author: 'Brandon Sanderson',
      rankBadge: '#1 Alta Fantasia Épica',
      categoryTag: 'Worldbuilding Profundo & Sistemas de Magia',
      rating: 4.9,
      reviewCount: 94000,
      price: 9.99,
      format: 'Paperback',
      successFormula: 'Sistemas de magia rígidos e compreensíveis (Hard Magic), ecologia fantástica rica e o arco heroico de erguer os fracos contra a opressão.',
      suggestedProjectHook: 'Os Guardiões da Luz Arcano: A Jornada de Sobrevivência de um Escravo que Descobre o Código dos Cavaleiros Ancestrais',
      suggestedTitle: 'O Eco dos Titãs',
      suggestedSubtitle: 'Quando os Céus se Quebram em Tormentas, os Antigos Juramentos Devem ser Renovados',
      targetAudience: 'Comunidades apaixonadas por sagas extensas, batalhas estratégicas e mundos construídos com maestria.',
      narrativeStructure: 'O abismo da servidão -> A descoberta da relíquia ancestral -> O treino secreto do batalhão -> O resgate épico no campo de batalha.',
      competitiveEdge: 'Filosofia de liderança ética combinada com cenas de tirar o fôlego.'
    }
  ],

  // 10. FICÇÃO CIENTÍFICA & SCI-FI
  'sci-fi': [
    {
      id: 'scifi-1',
      asin: 'B08FHBV4ZX',
      title: 'Project Hail Mary (Devoradores de Estrelas)',
      author: 'Andy Weir',
      rankBadge: '#1 Bestseller Hard Sci-Fi Amazon',
      categoryTag: 'Sobrevivência Cósmica & Amizade Científica',
      rating: 4.8,
      reviewCount: 160000,
      price: 11.99,
      format: 'Hardcover',
      successFormula: 'Ciência real usada para resolver problemas extremos de vida ou morte no espaço, com humor otimista e primeiro contato inesquecível.',
      suggestedProjectHook: 'Protocolo Última Estrela: A Corrida Solitária de um Cientista para Salvar a Terra do Apagão Solar',
      suggestedTitle: 'Além do Horizonte Quântico',
      suggestedSubtitle: 'Uma Jornada Épica de Sobrevivência Espacial onde a Única Arma Contra a Extinção é a Criatividade Humana',
      targetAudience: 'Fãs de ficção científica fundamentada em física, astronomia, The Martian e Interestelar.',
      narrativeStructure: 'O despertar sem memórias na nave -> O enigma da morte estelar -> O primeiro contato inesperado -> A cooperação científica impossível.',
      competitiveEdge: 'Soluções de engenharia plausíveis explicadas de modo lúdico e empolgante.'
    },
    {
      id: 'scifi-2',
      asin: 'B00B7NPRY8',
      title: 'Dune (Duna)',
      author: 'Frank Herbert',
      rankBadge: '#1 Clássico Eterno Sci-Fi',
      categoryTag: 'Ecologia Planetária & Intriga Feudal Espacial',
      rating: 4.7,
      reviewCount: 125000,
      price: 10.99,
      format: 'Paperback',
      successFormula: 'Mundo árido impiedoso onde a substância mais valiosa do universo controla mentes, impérios e linhagens genéticas secretas.',
      suggestedProjectHook: 'Areias do Destino: Conspirações Interplanetárias, Liderança Profética e a Luta pelo Recurso mais Raro do Cosmos',
      suggestedTitle: 'O Império das Areias Infinitas',
      suggestedSubtitle: 'Em um Planeta Desolado, a Água é Mais Preciosa que o Ouro e o Futuro Pertence a Quem Domina o Deserto',
      targetAudience: 'Leitores que admiram sagas políticas cósmicas, misticismo tecnológico e debates sobre ecologia e poder.',
      narrativeStructure: 'A transferência de feudo estelar -> A emboscada da casa rival -> A fuga para o deserto profundo -> A profecia e a insurreição.',
      competitiveEdge: 'Riqueza de rituais e costumes exóticos com apelo épico de longo alcance.'
    }
  ],

  // 11. LIVROS INFANTIS & FÁBULAS
  'children-picture-book': [
    {
      id: 'kid-1',
      asin: 'B00A8S8V8C',
      title: 'How to Babysit a Grandma',
      author: 'Jean Reagan',
      rankBadge: '#1 Mais Vendido em Infantil / Família',
      categoryTag: 'Afeto Familiar & Humor Amoroso',
      rating: 4.9,
      reviewCount: 38400,
      price: 8.99,
      format: 'Paperback',
      successFormula: 'Inversão lúdica de papéis: a criança é quem cuida da vovó com instruções divertidas para fazer bolos, passear no parque e contar segredos.',
      suggestedProjectHook: 'Como Cuidar do Meu Avô: Um Livro Ilustrado de Ninar Cheio de Carinho, Risadas e Memórias Mágicas',
      suggestedTitle: 'Como Cuidar da Vovó em um Dia Mágico',
      suggestedSubtitle: 'Uma História Divertida e Afetuosa para Ler Antes de Dormir com Quem a Gente Ama',
      targetAudience: 'Crianças de 3 a 7 anos, pais e avós que buscam momentos de conexão e leitura em voz alta antes de dormir.',
      narrativeStructure: 'A chegada na casa dos avós -> O cardápio especial de panquecas -> A caça ao tesouro no quintal -> O abraço quentinho de boa noite.',
      competitiveEdge: 'Textos com ritmo rimado doce e ilustrações full-bleed que encantam os pequenos.'
    },
    {
      id: 'kid-2',
      asin: 'B00T2459V2',
      title: 'The Wonderful Things You Will Be',
      author: 'Emily Winfield Martin',
      rankBadge: 'Top 3 BSR Picture Books (+110k reviews)',
      categoryTag: 'Mensagem Inspiradora & Presente Afetivo',
      rating: 4.9,
      reviewCount: 110000,
      price: 10.99,
      format: 'Hardcover',
      successFormula: 'Carta de amor e encorajamento dos pais para os filhos, celebrando a bondade, a coragem e as infinitas possibilidades do futuro.',
      suggestedProjectHook: 'As Coisas Lindas que Você Vai Ser: Uma Celebração Ilustrada dos Sonhos, Bondade e Coragem de Cada Criança',
      suggestedTitle: 'O Menino que Colecionava Estrelas',
      suggestedSubtitle: 'Um Conto Encantado sobre Ter Coragem de Ser Gentil e Iluminar o Mundo',
      targetAudience: 'Famílias, chás de bebê, professores e primeiros leitores.',
      narrativeStructure: 'O olhar curioso para o céu -> As pequenas boas ações do dia -> O medo que se transforma em luz -> A certeza de ser amado.',
      competitiveEdge: 'Potencial altíssimo de livro de presente e leitura repetida em família.'
    },
    {
      id: 'kid-3',
      asin: 'B07DJ4LKV7',
      title: 'The Invisible String (O Fio Invisível)',
      author: 'Patrice Karst',
      rankBadge: '#1 em Inteligência Emocional Infantil',
      categoryTag: 'Lidando com Ansiedade de Separação & Luto',
      rating: 4.9,
      reviewCount: 67000,
      price: 8.99,
      format: 'Paperback',
      successFormula: 'A metáfora simples do fio de amor inquebrável que conecta corações mesmo à distância, na escola ou diante da perda de alguém querido.',
      suggestedProjectHook: 'O Abraço que Viaja pelo Vento: Uma Fábula Emocionante sobre Amor, Distância e o Laço Invisível da Família',
      suggestedTitle: 'O Laço Invisível do Amor',
      suggestedSubtitle: 'Para Todas as Crianças que Sentem Saudades e Precisam Lembrar que Nunca Estão Sozinhas',
      targetAudience: 'Pais que lidam com adaptação escolar, ansiedade infantil ou perda de entes queridos.',
      narrativeStructure: 'O medo da tempestade à noite -> A explicação do laço que não se arrebenta -> O teste com a mão no coração -> A paz para adormecer.',
      competitiveEdge: 'Recomendado por psicólogos infantis e educadores em todo o mundo.'
    }
  ],

  // 12. ESTUDO, CONCURSOS & MEMÓRIA
  education: [
    {
      id: 'edu-1',
      asin: 'B00J21U3H2',
      title: 'Make It Stick: A Ciência da Aprendizagem',
      author: 'Peter C. Brown',
      rankBadge: '#1 em Pedagogia e Neurociência da Memória',
      categoryTag: 'Retenção Ativa & Prática Espaçada',
      rating: 4.7,
      reviewCount: 22000,
      price: 11.99,
      format: 'Hardcover',
      successFormula: 'Desmistifica a releitura passiva provando que o esforço de recuperação ativa e testes periódicos são o único meio de reter conhecimento a longo prazo.',
      suggestedProjectHook: 'Memória Blindada para Concursos: Métodos Científicos para Reter 3x Mais Conteúdo em Menos Tempo',
      suggestedTitle: 'O Circuito da Memória Blindada',
      suggestedSubtitle: 'Técnicas Comprovadas pela Neurociência para Estudar sem Esquecer e Garantir sua Aprovação',
      targetAudience: 'Concurseiros, vestibulandos e universitários sobrecarregados de matérias densas.',
      narrativeStructure: 'A armadilha da ilusão de competência -> A prática de recuperação espaçada -> Flashcards inteligentes -> Como evitar o esquecimento na hora da prova.',
      competitiveEdge: 'Cronogramas prontos de repetição de 1, 7 e 30 dias.'
    },
    {
      id: 'edu-2',
      asin: 'B07PK1N5V8',
      title: 'Ultralearning (Ultra-Aprendizado)',
      author: 'Scott Young',
      rankBadge: '#1 em Aprendizagem Rápida Autodidata',
      categoryTag: 'Projetos Intensivos de Domínio de Habilidades',
      rating: 4.6,
      reviewCount: 18500,
      price: 10.99,
      format: 'Paperback',
      successFormula: 'Os 9 princípios para dominar matérias difíceis de forma autônoma e acelerada (como o Desafio MIT em 1 ano).',
      suggestedProjectHook: 'Ultra-Aprendizado Estratégico: Como Aprender Qualquer Habilidade Complexa na Metade do Tempo Normal',
      suggestedTitle: 'Ultra-Aprendizado Tático',
      suggestedSubtitle: 'O Método Passo a Passo para Dominar Assuntos Difíceis e Alcançar o Topo do seu Campo Profissional',
      targetAudience: 'Profissionais em transição de carreira, poliglotas e autodidatas ambiciosos.',
      narrativeStructure: 'Metalearning: o mapa do terreno -> Foco direto sem desvios -> Perfuração dos pontos fracos -> A técnica Feynman de ensinar para consolidar.',
      competitiveEdge: 'Planilha de mapeamento de matérias para aplicação imediata.'
    }
  ],

  // 13. PLANNERS & DIÁRIOS GUIADOS
  journal: [
    {
      id: 'jrn-1',
      asin: 'B00FRO3F06',
      title: 'The 5 Minute Journal (O Diário de 5 Minutos)',
      author: 'Intelligent Change',
      rankBadge: '#1 Mais Vendido em Diários Guiados',
      categoryTag: 'Gratidão Matinal & Intenção Diária',
      rating: 4.8,
      reviewCount: 45000,
      price: 12.99,
      format: 'Hardcover',
      successFormula: 'Formato minimalista sem sobrecarga: 3 gratidões matinais, 3 metas prioritárias e 2 reflexões noturnas para manter a mente no presente.',
      suggestedProjectHook: 'Diário de Presença & Gratidão: 5 Minutos pela Manhã para Começar o Dia com Clareza, Paz e Foco',
      suggestedTitle: 'O Diário dos Cinco Minutos de Clareza',
      suggestedSubtitle: 'Um Roteiro Simples e Eficaz de Gratidão, Metas e Reflexão para Transformar seus Próximos 90 Dias',
      targetAudience: 'Pessoas com rotinas agitadas que querem os benefícios do journaling sem precisar escrever páginas longas.',
      narrativeStructure: 'Introdução à neuroquímica da gratidão -> O modelo matinal de intenção -> O modelo noturno de reconhecimento -> Check-in semanal de evolução.',
      competitiveEdge: 'Estrutura limpa, sofisticada e com espaço perfeito para escrita diária rápida.'
    },
    {
      id: 'jrn-2',
      asin: 'B07MGB1K44',
      title: 'The Daily Stoic Journal (Diário Estóico)',
      author: 'Ryan Holiday',
      rankBadge: 'Top Bestseller Diários Filosóficos',
      categoryTag: 'Reflexões Estoicas Diárias',
      rating: 4.7,
      reviewCount: 22000,
      price: 11.99,
      format: 'Hardcover',
      successFormula: 'Um prompt filosófico instigante por dia para responder pela manhã e revisar à noite, ancorado em Marco Aurélio, Sêneca e Epicteto.',
      suggestedProjectHook: 'Caderno de Sabedoria Diária: 365 Dias de Estoicismo Aplicado para Blindar a Mente contra Ansiedades',
      suggestedTitle: 'Diário de Autodomínio & Serenidade',
      suggestedSubtitle: 'Reflexões Guiadas Diárias para Agir com Racionalidade e Vencer o Caos com Postura Inabalável',
      targetAudience: 'Estudantes de filosofia prática, empreendedores e pessoas que buscam inteligência emocional.',
      narrativeStructure: 'O dicotomia do controle -> A meditação matinal sobre os obstáculos -> O exame de consciência noturno -> O fechamento mensal.',
      competitiveEdge: 'Perguntas reflexivas que geram introspecção profunda e aplicável.'
    }
  ],

  // 14. COLORIR & ARTE TERAPÊUTICA
  'coloring-book': [
    {
      id: 'col-1',
      asin: 'B0CZ4L9P6V',
      title: 'Cozy Spaces Coloring Book',
      author: 'Coco Wyo',
      rankBadge: '#1 Absoluto KDP Livros de Colorir',
      categoryTag: 'Estilo Hygge Bold & Easy',
      rating: 4.8,
      reviewCount: 24500,
      price: 8.99,
      format: 'Paperback',
      successFormula: 'Traços grossos e desenhos aconchegantes sem detalhes minúsculos estressantes, permitindo colorir com marcadores com prazer e relaxamento rápido.',
      suggestedProjectHook: 'Cantinhos Aconchegantes: 50 Ilustrações Simples e Relaxantes de Ambientes Cozy para Alívio do Estresse',
      suggestedTitle: 'Refúgio de Paz: Livro de Colorir Anti-Estresse',
      suggestedSubtitle: '50 Desenhos Aconchegantes com Traços Fáceis e Relaxantes para Adultos e Jovens Desacelerarem a Mente',
      targetAudience: 'Adultos de 18 a 60 anos buscando descompressão após o trabalho, fãs do estilo Bobbie Goods e amantes de momentos calmos.',
      narrativeStructure: 'Página de teste de cores -> 50 cenários aconchegantes (cafeterias, poltronas de leitura, janelas chuvosas, jardins de inverno) -> Folhas de proteção contra manchas.',
      competitiveEdge: 'Páginas em uma só face, contornos nítidos e temas acolhedores que vendem o ano todo.'
    },
    {
      id: 'col-2',
      asin: 'B00CO8Y1S4',
      title: 'Secret Garden: An Inky Treasure Hunt',
      author: 'Johanna Basford',
      rankBadge: 'Fenômeno Mundial (+42k reviews)',
      categoryTag: 'Botânica & Mandalas Delicadas',
      rating: 4.7,
      reviewCount: 42000,
      price: 11.99,
      format: 'Paperback',
      successFormula: 'Florestas encantadas, flores exuberantes e pequenos animais ocultos entre os galhos com traços detalhados para lápis de cor.',
      suggestedProjectHook: 'O Jardim Secreto dos Pássaros: Ilustrações Botânicas Ricas em Detalhes para Meditação Ativa e Criatividade',
      suggestedTitle: 'Santuário Botânico: Livro de Colorir Terapêutico',
      suggestedSubtitle: 'Desenhos Harmoniosos de Flores, Folhagens e Natureza para Despertar sua Serenidade Interior',
      targetAudience: 'Público que adora desenhar com lápis de cor com calma, foco artístico e atenção aos detalhes.',
      narrativeStructure: 'O portal do jardim -> As veredas floridas -> As fontes secretas -> Os animais guardiões da floresta.',
      competitiveEdge: 'Elegância visual clássica com apelo de presente sofisticado.'
    }
  ],

  // 15. PASSATEMPOS & CAÇA-PALAVRAS
  'activity-book': [
    {
      id: 'act-1',
      asin: 'B08L7S7V9B',
      title: 'Large Print Word Search for Seniors',
      author: 'Brain Sharpeners',
      rankBadge: '#1 em Caça-Palavras Letra Grande KDP',
      categoryTag: 'Manutenção Cognitiva & Conforto Visual',
      rating: 4.7,
      reviewCount: 31000,
      price: 8.99,
      format: 'Paperback',
      successFormula: 'Fonte grande (18pt+), espaçamento amplo, temas nostálgicos da cultura clássica e soluções completas no final para exercitar o cérebro sem cansar a vista.',
      suggestedProjectHook: 'Caça-Palavras Letra Grande: 100 Desafios Temáticos para Manter o Cérebro Jovem, Lúcido e Ativo',
      suggestedTitle: 'Ginástica Cerebral: Caça-Palavras Letra Grande',
      suggestedSubtitle: '100 Jogos Temáticos com Letras Ampliadas para Relaxar, Estimular a Memória e Exercitar o Raciocínio',
      targetAudience: 'Idosos, aposentados, pessoas que usam óculos de leitura e familiares buscando atividades saudáveis.',
      narrativeStructure: 'Instruções claras e benefícios cognitivos -> 100 grids temáticos (música antiga, viagens, culinária de vó, natureza) -> Gabarito completo com soluções destacadas.',
      competitiveEdge: 'Diagramação otimizada sem erros de impressão ou linhas espremidas.'
    },
    {
      id: 'act-2',
      asin: 'B07M8D61Z1',
      title: 'Sudoku Gradual do Fácil ao Extremo: 300 Desafios',
      author: 'Will Shortz',
      rankBadge: 'Top Bestseller Puzzles Lógicos',
      categoryTag: 'Lógica Numérica & Progressão',
      rating: 4.8,
      reviewCount: 26000,
      price: 7.99,
      format: 'Paperback',
      successFormula: 'Curva de aprendizado suave com 75 jogos em cada nível de dificuldade, com técnicas ensinadas no início de cada seção.',
      suggestedProjectHook: 'Mente Ágil: 300 Puzzles de Sudoku com Progressão Gradual e Guia de Técnicas Avançadas',
      suggestedTitle: 'Desafio Sudoku 300: Da Lógica Básica ao Nível Mestre',
      suggestedSubtitle: 'Exercícios Progressivos para Fortalecer a Concentração e o Raciocínio Lógico Diário',
      targetAudience: 'Estudantes e adultos que adoram desafios numéricos e manter a mente rápida.',
      narrativeStructure: 'O guia das técnicas de exclusão -> Nível Fácil (aquecimento) -> Nível Médio -> Nível Difícil -> Nível Especialista -> Soluções.',
      competitiveEdge: 'Grids amplos e espaço para anotações em lápis.'
    }
  ],

  // 16. BIOGRAFIAS & GRANDES LÍDERES
  biography: [
    {
      id: 'bio-1',
      asin: 'B0151LN88K',
      title: 'Shoe Dog (A Marca da Vitória)',
      author: 'Phil Knight',
      rankBadge: '#1 Bestseller Memórias & Negócios',
      categoryTag: 'Resiliência Pura & Bastidores da Nike',
      rating: 4.8,
      reviewCount: 98000,
      price: 12.99,
      format: 'Paperback',
      successFormula: 'Honestidade crua sobre dívidas, quase-falências e noites sem dormir: a jornada autêntica e sem filtros de quem começou vendendo tênis no porta-malas do carro.',
      suggestedProjectHook: 'Além da Glória: Lições Reais de Coragem, Resiliência e Sobrevivência nos Momentos Mais Escuros de um Grande Líder',
      suggestedTitle: 'A Marca da Coragem',
      suggestedSubtitle: 'Lições de Resiliência nos Bastidores de Decisões que Moldaram o Destino de uma Trajetória Extraordinária',
      targetAudience: 'Empreendedores, atletas e quem enfrenta momentos de incerteza profunda.',
      narrativeStructure: 'O início improvável da jornada -> Os parceiros excêntricos -> O abismo da falência iminente -> A virada e a consagração.',
      competitiveEdge: 'Narrativa pessoal fluida que lê como um romance épico.'
    },
    {
      id: 'bio-2',
      asin: 'B000SEHC2U',
      title: 'Em Busca de Sentido',
      author: 'Viktor E. Frankl',
      rankBadge: 'Obra Prima Histórica (+140k reviews)',
      categoryTag: 'Logoterapia & Sobrevivência nos Campos de Concentração',
      rating: 4.8,
      reviewCount: 140000,
      price: 9.99,
      format: 'Paperback',
      successFormula: 'Quem tem um "porquê" para viver suporta quase qualquer "como": o relato psiquiátrico comovente sobre encontrar propósito na dor extrema.',
      suggestedProjectHook: 'O Preço do Sentido: Lições Imortais de Esperança e Força Interior para Superar Qualquer Sofrimento',
      suggestedTitle: 'Em Busca da Luz Interior',
      suggestedSubtitle: 'Como Encontrar Propósito Inegociável e Dignidade Diante das Adversidades Mais Difíceis',
      targetAudience: 'Leitores que buscam clareza existencial, superação de perdas e força emocional duradoura.',
      narrativeStructure: 'A chegada ao limite humano -> A observação do comportamento sob pressão -> A descoberta do propósito -> Os fundamentos da Logoterapia.',
      competitiveEdge: 'Profundidade psicológica atemporal que transforma a perspectiva de vida do leitor.'
    }
  ],

  // 17. FILOSOFIA PRÁTICA & SOCIEDADE
  'non-fiction': [
    {
      id: 'phi-1',
      asin: 'B000NY12DA',
      title: 'Meditations (Meditações)',
      author: 'Marco Aurélio',
      rankBadge: '#1 Bestseller Filosofia Clássica',
      categoryTag: 'Estoicismo para Tempos Difíceis',
      rating: 4.8,
      reviewCount: 88000,
      price: 7.99,
      format: 'Paperback',
      successFormula: 'Anotações particulares do homem mais poderoso do mundo antigo para si mesmo, lembrando-se de manter a calma, o dever e a humildade diante de pestes, guerras e traições.',
      suggestedProjectHook: 'A Força Serena: Princípios do Imperador Filósofo para Manter a Calma e a Dignidade em Tempos Caóticos',
      suggestedTitle: 'A Força Serena: Filosofia Prática para Dias Caóticos',
      suggestedSubtitle: 'Princípios Atemporais de Autodomínio e Clareza Mental para Vencer a Ansiedade e as Incertezas da Vida Moderna',
      targetAudience: 'Profissionais sob alta pressão, líderes e qualquer pessoa que busca paz interior sem se isolar do mundo real.',
      narrativeStructure: 'O dever consigo mesmo -> A impermanência das coisas exteriores -> Como lidar com pessoas difíceis -> A serenidade no presente.',
      competitiveEdge: 'Tradução fluida e notas explicativas que conectam o texto aos dilemas contemporâneos.'
    },
    {
      id: 'phi-2',
      asin: 'B00ICN066A',
      title: 'Sapiens: Uma Breve História da Humanidade',
      author: 'Yuval Noah Harari',
      rankBadge: 'Fenômeno Global (+130k reviews)',
      categoryTag: 'Evolução Humana & Ficções Coletivas',
      rating: 4.7,
      reviewCount: 130000,
      price: 12.99,
      format: 'Paperback',
      successFormula: 'A capacidade única da nossa espécie de cooperar em massa graças à crença compartilhada em ficções coletivas (dinheiro, nações, leis e marcas).',
      suggestedProjectHook: 'O Olhar Lúcido: As Ideias Invisíveis que Moldam a Sociedade, Nossas Escolhas e o Futuro',
      suggestedTitle: 'As Narrativas Invisíveis da Mente Humana',
      suggestedSubtitle: 'Uma Análise Reveladora sobre como Mitos Compartilhados Governam Nossa Vida, Escolhas e Sociedade',
      targetAudience: 'Curiosos intelectuais, leitores de ensaios e pessoas que gostam de questionar convenções aceitas.',
      narrativeStructure: 'A revolução cognitiva -> A armadilha do sedentarismo -> A unificação do dinheiro e dos impérios -> A era das máquinas inteligentes.',
      competitiveEdge: 'Provocativo, didático e repleto de metáforas marcantes.'
    }
  ],

  // 18. CULINÁRIA, DIETAS & RECEITAS
  'technical-manual': [
    {
      id: 'cook-1',
      asin: 'B09TW77Y6Z',
      title: 'Air Fryer Cookbook for Beginners',
      author: 'Jaden Cooper',
      rankBadge: '#1 Bestseller KDP Culinária Rápida',
      categoryTag: 'Pratos Rápidos & Crocantes sem Óleo',
      rating: 4.5,
      reviewCount: 21000,
      price: 9.99,
      format: 'Paperback',
      successFormula: 'Instruções simples com tempo exato e temperatura para refeições do dia a dia em menos de 20 minutos, com ingredientes baratos e fáceis de achar.',
      suggestedProjectHook: 'Mesa Descomplicada: 100 Receitas na Air Fryer para Refeições Crocantes, Rápidas e Saudáveis em 15 Minutos',
      suggestedTitle: 'Air Fryer Real: O Guia Definitivo em 15 Minutos',
      suggestedSubtitle: 'Receitas Práticas, Econômicas e Saudáveis com Ingredientes que Você Já Tem em Casa para Almoços e Jantares Rápidos',
      targetAudience: 'Pessoas sem tempo para cozinhar, estudantes que moram sozinhos e famílias buscando praticidade sem sujeira no fogão.',
      narrativeStructure: 'Tabela de conversão de tempo e temperatura -> Carnes e aves suculentas -> Acompanhamentos e legumes crocantes -> Sobremesas surpreendentes.',
      competitiveEdge: 'Passo a passo testado que nunca queima o alimento e tabelas de consulta rápida.'
    },
    {
      id: 'cook-2',
      asin: 'B01HMXRW7E',
      title: 'Salt, Fat, Acid, Heat (Sal, Gordura, Ácido, Calor)',
      author: 'Samin Nosrat',
      rankBadge: '#1 Arte Culinária & Sabores',
      categoryTag: 'Os 4 Elementos Fundamentais da Cozinha',
      rating: 4.8,
      reviewCount: 49000,
      price: 19.99,
      format: 'Hardcover',
      successFormula: 'Em vez de apenas seguir receitas como um robô, ensina a improvisar e equilibrar os 4 pilares do sabor para que qualquer prato fique delicioso.',
      suggestedProjectHook: 'A Alquimia do Sabor: O Guia Essencial para Cozinhar com Maestria sem Precisar de Receitas Decoradas',
      suggestedTitle: 'A Alquimia dos Sabores: Domine a Cozinha Real',
      suggestedSubtitle: 'Como Dominar o Equilíbrio dos Ingredientes e Criar Pratos Inesquecíveis sem Ficar Preso a Receitas Rígidas',
      targetAudience: 'Amantes da gastronomia caseira que querem ganhar confiança para cozinhar de improviso.',
      narrativeStructure: 'O mistério do sal certo -> Gorduras como condutoras de sabor -> A acidez que desperta o paladar -> O calor e as texturas perfeitas.',
      competitiveEdge: 'Explicações científicas descomplicadas com ilustrações encantadoras.'
    }
  ]
};

import { BookType } from '../types/book-project';

/**
 * Retorna a lista de Best Sellers reais da Amazon catalogados para um segmento
 */
export function getAmazonBestSellersForSegment(segmentId: BookType | string): AmazonBestSellerReference[] {
  if (segmentId === 'illustrated-book') return AMAZON_BESTSELLERS_BY_SEGMENT['children-picture-book'];
  if (segmentId === 'puzzle-book') return AMAZON_BESTSELLERS_BY_SEGMENT['activity-book'];
  if (segmentId === 'suspense') return AMAZON_BESTSELLERS_BY_SEGMENT['thriller'];
  if (segmentId === 'fiction-novel' || segmentId === 'light-novel') return AMAZON_BESTSELLERS_BY_SEGMENT['fantasy'];
  if (segmentId === 'workbook') return AMAZON_BESTSELLERS_BY_SEGMENT['education'];
  if (segmentId === 'short-ebook') return AMAZON_BESTSELLERS_BY_SEGMENT['practical-guide'];

  return AMAZON_BESTSELLERS_BY_SEGMENT[segmentId] || AMAZON_BESTSELLERS_BY_SEGMENT['business'];
}

/**
 * Seleciona uma sugestão guiada de alto impacto baseada nos Best Sellers reais da Amazon
 */
export function getRandomAmazonSuggestionForSegment(
  segmentId: BookType | string,
  usedTitles: Set<string>
): { topic: string; reference: AmazonBestSellerReference } {
  const bestSellers = getAmazonBestSellersForSegment(segmentId);
  
  // Tenta encontrar um best seller ainda não utilizado nesta sessão
  const available = bestSellers.filter(b => !usedTitles.has(b.suggestedProjectHook));
  const chosen = available.length > 0
    ? available[Math.floor(Math.random() * available.length)]
    : bestSellers[Math.floor(Math.random() * bestSellers.length)];

  return {
    topic: chosen.suggestedProjectHook,
    reference: chosen
  };
}
