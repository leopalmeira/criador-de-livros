// ============================================================
// MOTOR EDITORIAL DE BLUEPRINT CONTEXTUAL KDP
// Garante coerência absoluta em TODAS as 13 etapas editoriais:
// Voz & Persona, Ficha Técnica, Biografia, Sumário e Capas.
// 100% Offline, ultra-realista e calibrado para Amazon KDP.
// ============================================================

import { BookType, BookProject, IBookChapter } from '../types/book-project';
import { AuthorPersonaData, AuthorBioData, BookDetailsData } from '../types/stages';

export interface GenreBlueprint {
  defaultTrimSize: '5.5x8.5' | '6x9' | '8.5x11' | '8.5x8.5' | '5x8';
  defaultPages: number;
  isIllustrationOrActivity: boolean;
  penNameOptions: string[];
  persona: {
    inspirationAuthors: string;
    authorDescription: string;
    tone: string;
    writingSample: string;
    generatedPersona: string;
  };
  details: {
    wordCountLabel: string;
    chapterCount: number;
    bookStructure: string;
    paperType: 'bw-white' | 'color-standard' | 'color-premium' | 'bw-cream';
    formatNote: string;
  };
  bio: {
    nameType: 'pen-name' | 'real-name' | 'brand';
    background: string;
    achievements: string;
    personalDetails: string;
    generatedBio: string;
  };
  chapters: Array<{
    title: string;
    summary: string;
    purpose: string;
    sections: string[];
    wordCountTarget: number;
  }>;
}

export class EditorialBlueprintEngine {
  /**
   * Retorna o blueprint editorial calibrado especificamente para o nicho/gênero.
   */
  public static getBlueprint(genre: BookType | string, title: string = '', topic: string = ''): GenreBlueprint {
    const g = (genre || '').toLowerCase();
    const t = (title + ' ' + topic).toLowerCase();

    // 1. LIVRO DE COLORIR / MANDALAS / BAIXO CONTEÚDO (KDP Low Content)
    if (g === 'coloring-book' || t.includes('mandala') || t.includes('colorir') || t.includes('coloring') || t.includes('anti-stress')) {
      return {
        defaultTrimSize: '8.5x11',
        defaultPages: 100,
        isIllustrationOrActivity: true,
        penNameOptions: [
          'Atelier Mandalas Zen',
          'Studio Harmonia & Cor',
          'Marina Vance Art',
          'Serenity Coloring Press'
        ],
        persona: {
          inspirationAuthors: 'Johanna Basford (Jardim Secreto), Millie Marotta, Kerby Rosanes',
          authorDescription: 'Ilustrador e designer editorial focado em arteterapia, mandalas geométricas e padrões botânicos que promovem relaxamento e mindfulness.',
          tone: 'Sereno, acolhedor, contemplativo e inspirador',
          writingSample: 'Respire fundo, escolha suas cores favoritas e permita-se estar presente no momento enquanto dá vida a cada traço desta mandala.',
          generatedPersona: 'Voz artística e acolhedora orientada ao bem-estar, equilíbrio mental e desconexão da sobrecarga digital através da arte de colorir consciente.'
        },
        details: {
          wordCountLabel: 'Livro de Ilustrações (~800 palavras introdutórias e de mindfulness)',
          chapterCount: 5,
          bookStructure: 'topical',
          paperType: 'bw-white',
          formatNote: '8.5" x 11" com páginas em verso branco (single-sided) para evitar sangria de tinta em lápis de cor e marcadores.'
        },
        bio: {
          nameType: 'brand',
          background: 'Estúdio independente de ilustração botânica e geométrica com foco em arteterapia e saúde mental.',
          achievements: 'Ilustrações celebradas por comunidades de coloristas adultos e praticantes de mindfulness na Amazon KDP.',
          personalDetails: 'Apreciador de infusões de ervas, silêncio matinal e esboços feitos à mão com nanquim.',
          generatedBio: 'O Atelier Mandalas Zen é dedicado a criar experiências imersivas de tranquilidade através da arte geométrica e botânica. Cada ilustração é cuidadosamente construída com traços harmoniosos, pensada para acalmar a mente agitada, aliviar o estresse do dia a dia e despertar a criatividade latente em cada pessoa.'
        },
        chapters: [
          {
            title: 'Guia de Boas-Vindas: Técnicas de Pintura, Paletas e Mindfulness',
            summary: 'Orientações práticas sobre sombreamento, combinações de cores e respiração consciente antes de começar a colorir.',
            purpose: 'Ambientar o leitor e convidá-lo a uma experiência relaxante sem cobranças de perfeição.',
            sections: ['Como escolher suas cores', 'Técnicas de dégradé e sobreposição', 'A respiração focada enquanto você colore'],
            wordCountTarget: 400
          },
          {
            title: 'Coleção I: Mandalas da Serenidade & Geometria Sagrada (Ilustrações 01 a 12)',
            summary: 'Padrões circulares simétricos com foco em ancorar a atenção no centro e desacelerar pensamentos intrusivos.',
            purpose: 'Relaxamento muscular e foco imediato no momento presente.',
            sections: ['Mandalas Circulares Clássicas', 'Geometria de Quatro Eixos', 'Espirais Harmônicas'],
            wordCountTarget: 100
          },
          {
            title: 'Coleção II: Mandalas Botânicas & Jardins da Calma (Ilustrações 13 a 25)',
            summary: 'Elementos florais, pétalas delicadas e folhas estilizadas para conectar o leitor com a beleza da natureza.',
            purpose: 'Despertar sensações de renovação, frescor e conexão orgânica.',
            sections: ['Flores de Lótus e Folhagens', 'Jardins Secretos Noturnos', 'Padrões de Vinhas e Trevos'],
            wordCountTarget: 100
          },
          {
            title: 'Coleção III: Mandalas Cósmicas & Astrológicas (Ilustrações 26 a 38)',
            summary: 'Representações de constelações, fases da lua e mandalas solares de grande impacto visual.',
            purpose: 'Estimular a imaginação e a contemplação do vasto e do infinito.',
            sections: ['Fases da Lua e Estrelas', 'O Sol da Manhã', 'Órbitas Planetárias Harmoniosas'],
            wordCountTarget: 100
          },
          {
            title: 'Coleção IV: Mandalas do Equilíbrio Interior & Páginas Livres (Ilustrações 39 a 50)',
            summary: 'Mandalas de alta complexidade para sessões profundas de arteterapia, além de página para teste de lápis de cor.',
            purpose: 'Concluir a jornada de relaxamento com sensação duradoura de paz e realização artística.',
            sections: ['Mandalas de Camadas Múltiplas', 'Padrões de Alta Densidade', 'Paleta de Teste e Mensagem Final'],
            wordCountTarget: 100
          }
        ]
      };
    }

    // 2. THRILLER / SUSPENSE / MISTÉRIO POLICIAL
    if (g === 'thriller' || t.includes('suspense') || t.includes('mistério') || t.includes('crime') || t.includes('detetive')) {
      return {
        defaultTrimSize: '5.5x8.5',
        defaultPages: 260,
        isIllustrationOrActivity: false,
        penNameOptions: [
          'M. K. Sterling',
          'Lucas V. Brandt',
          'Helena Cross',
          'Arthur Vance'
        ],
        persona: {
          inspirationAuthors: 'Freida McFadden (A Empregada), Gillian Flynn, Alex Michaelides, Harlan Coben',
          authorDescription: 'Escritor focado em suspense psicológico de ritmo acelerado, manipulação mental, narradores não-confiáveis e reviravoltas chocantes no final.',
          tone: 'Tenso, investigativo, claustrofóbico e envolvente',
          writingSample: 'A fechadura girou com um clique metálico suave. Mas ela sabia — com a certeza gelada que arrepiava sua espinha — que deveria estar sozinha naquela casa.',
          generatedPersona: 'Narrativa hipnótica em primeira pessoa com cadência ágil, cortes cinematográficos de cena e pistas falsas calculadas para manter o leitor virando páginas até a madrugada.'
        },
        details: {
          wordCountLabel: '60.000 - 70.000 palavras (~240-270 págs)',
          chapterCount: 12,
          bookStructure: 'narrative',
          paperType: 'bw-cream',
          formatNote: '5.5" x 8.5" em papel pólen/creme (cream paper), diagramação elegante com quebras de capítulo e ganchos constantes.'
        },
        bio: {
          nameType: 'pen-name',
          background: 'Pesquisador de psicologia criminal e roteirista apaixonado pelos cantos obscuros da mente e dos segredos domésticos.',
          achievements: 'Livros consistentemente posicionados no Top 100 Bestsellers da Amazon KDP na categoria Mistério & Suspense.',
          personalDetails: 'Vive em uma casa silenciosa no interior, bebe café extra-forte e gosta de caminhar à noite enquanto arquiteta reviravoltas impossíveis.',
          generatedBio: 'M. K. Sterling é mestre em construir enredos de suspense psicológico onde nada é o que parece. Seus livros exploram a fragilidade da confiança entre quatro paredes e a capacidade humana de esconder segredos terríveis sob sorrisos perfeitos. Quando não está escrevendo, Sterling estuda casos reais de crimes não resolvidos e a anatomia do medo.'
        },
        chapters: [
          {
            title: 'Capítulo 1: O Primeiro Estalo no Vidro',
            summary: 'Apresentação da rotina aparentemente pacata e o detalhe fora do lugar que instala a primeira semente de dúvida.',
            purpose: 'Fisgar o leitor nas primeiras duas páginas com um gancho psicológico imediato.',
            sections: ['A casa na colina', 'O recado sob a porta', 'A lembrança que não deveria existir'],
            wordCountTarget: 3200
          },
          {
            title: 'Capítulo 2: Sorrisos de Fachada',
            summary: 'O casal ou vizinhança é introduzido; diálogos com duplo sentido revelam ressentimentos ocultos.',
            purpose: 'Estabelecer a teia de relações e mostrar que todos têm motivos para mentir.',
            sections: ['O jantar de boas-vindas', 'A conversa interrompida', 'Olhares cúmplices'],
            wordCountTarget: 3400
          },
          {
            title: 'Capítulo 3: O Que Havia no Quarto Trancado',
            summary: 'Uma busca clandestina revela um objeto que pertencia a alguém desaparecido há anos.',
            purpose: 'Acelerar a sensação de perigo iminente e quebrar a zona de conforto da protagonista.',
            sections: ['A chave esquecida', 'O cheiro de poeira e alfazema', 'A caixa de metal'],
            wordCountTarget: 3500
          },
          {
            title: 'Capítulo 4: O Interrogatório sem Mandado',
            summary: 'O detetive local faz perguntas sutis que colocam a versão oficial dos fatos sob suspeita.',
            purpose: 'Trazer a autoridade externa e aumentar a pressão temporal sobre os personagens.',
            sections: ['A viatura na estrada de terra', 'Perguntas que parecem inocentes', 'O álibi trêmulo'],
            wordCountTarget: 3200
          },
          {
            title: 'Capítulo 5: Aliança Sob Desconfiança',
            summary: 'Dois personagens decidem investigar juntos, sem ter certeza se o outro é culpado ou aliado.',
            purpose: 'Criar tensão dramática constante e explorar a psicologia da traição.',
            sections: ['O encontro no café afastado', 'A troca de evidências', 'A mentira que escapou'],
            wordCountTarget: 3600
          },
          {
            title: 'Capítulo 6: O Primeiro Plot Twist',
            summary: 'Uma revelação bombástica desmonta a teoria que o leitor construiu até aqui.',
            purpose: 'Reverter as expectativas e criar a virada central do segundo ato.',
            sections: ['A fita gravada', 'A identidade que não bate', 'O choque do espelho'],
            wordCountTarget: 3800
          },
          {
            title: 'Capítulo 7: A Noite Sem Luz',
            summary: 'Uma tempestade corta as comunicações; o perigo agora está fisicamente dentro da casa.',
            purpose: 'Ritmo claustrofóbico máximo e sobrevivência imediata.',
            sections: ['O gerador desarmado', 'Passos no sótão', 'A porta que não tranca mais'],
            wordCountTarget: 3600
          },
          {
            title: 'Capítulo 8: O Confronto e a Última Revelação',
            summary: 'O verdadeiro mentor do plano se revela, e a última peça do quebra-cabeça se encaixa.',
            purpose: 'Clímax catártico e epílogo arrebatador com gancho final.',
            sections: ['O confronto cara a cara', 'A confissão calculada', 'A última verdade que ninguém viu'],
            wordCountTarget: 4000
          }
        ]
      };
    }

    // 3. ROMANCE & NEW ADULT
    if (g === 'romance' || t.includes('romance') || t.includes('amor') || t.includes('lovers') || t.includes('enemies')) {
      return {
        defaultTrimSize: '5.5x8.5',
        defaultPages: 280,
        isIllustrationOrActivity: false,
        penNameOptions: [
          'Clara Bennett',
          'Sophia Montgomery',
          'Laura Vane',
          'Camila Rossi'
        ],
        persona: {
          inspirationAuthors: 'Colleen Hoover (É Assim Que Acaba), Ali Hazelwood, Emily Henry, Rebecca Yarros',
          authorDescription: 'Romancista contemporânea focada em química magnética, dinâmicas de enemies-to-lovers, diálogos repletos de humor inteligente e momentos de grande vulnerabilidade emocional.',
          tone: 'Sensorial, espirituoso, emotivo e apaixonante',
          writingSample: 'Ele tinha aquele sorriso torto e irritante de quem sabia exatamente o efeito que causava em qualquer sala que entrasse. E o pior: sabia que eu sabia.',
          generatedPersona: 'Voz envolvente e moderna com alternância de perspectiva (Dual POV), ritmo rápido nas brincadeiras e pausas dramáticas nos momentos de intimidade e quebra de barreiras.'
        },
        details: {
          wordCountLabel: '65.000 - 75.000 palavras (~260-300 págs)',
          chapterCount: 10,
          bookStructure: 'narrative',
          paperType: 'bw-cream',
          formatNote: '5.5" x 8.5" em papel creme com divisores de cena delicados e estética limpa para o público BookTok.'
        },
        bio: {
          nameType: 'pen-name',
          background: 'Leitora compulsiva de finais felizes e cronista de relacionamentos da vida moderna.',
          achievements: 'Romances virais com centenas de milhares de leituras no Kindle Unlimited e leitoras fiéis no Instagram.',
          personalDetails: 'Viciada em chá com canela, playlists melancólicas de outono e comédias românticas dos anos 2000.',
          generatedBio: 'Clara Bennett escreve histórias sobre pessoas imperfeitas que tropeçam no amor quando menos esperam. Suas narrativas são conhecidas pela tensão palpável, pelos diálogos divertidos e pela habilidade de fazer o leitor rir e chorar no mesmo capítulo.'
        },
        chapters: [
          {
            title: 'Capítulo 1: O Primeiro Café Derramado (E o Pior Encontro da Minha Vida)',
            summary: 'O embate inaugural entre os dois protagonistas; faíscas imediatas de antipatia mútua.',
            purpose: 'Apresentar a química do casal pela faísca do conflito inicial.',
            sections: ['A entrevista matinal', 'O café na camisa branca', 'A primeira troca de farpas'],
            wordCountTarget: 3400
          },
          {
            title: 'Capítulo 2: Forçados a Conviver',
            summary: 'Uma circunstância profissional ou pessoal obriga os dois a dividir o mesmo teto ou projeto.',
            purpose: 'Estabelecer a proximidade forçada e as primeiras brechas nas defesas.',
            sections: ['A notícia inesperada', 'Regras de convivência', 'A descoberta de uma fraqueza'],
            wordCountTarget: 3600
          },
          {
            title: 'Capítulo 3: Sob o Mesmo Teto (Tarde Demais Para Recuar)',
            summary: 'Momentos casuais revelam detalhes vulneráveis de ambos; o gelo começa a derreter.',
            purpose: 'Criar intimidade genuína antes da atração física declarada.',
            sections: ['A chuva que prendeu os dois', 'Cozinhando à meia-noite', 'Uma risada sincera'],
            wordCountTarget: 3500
          },
          {
            title: 'Capítulo 4: A Proposta Falsa (O Fingimento Perigoso)',
            summary: 'Eles fingem um namoro para impressionar a família ou colegas, mas o fingimento parece real demais.',
            purpose: 'Aumentar a aposta dramática com o clássico tropo do fake dating.',
            sections: ['O evento de família', 'De mãos dadas em público', 'A pergunta que pesou'],
            wordCountTarget: 3800
          },
          {
            title: 'Capítulo 5: O Ponto Sem Retorno',
            summary: 'O primeiro momento de entrega total onde as máscaras caem por completo.',
            purpose: 'Catarse romântica central do livro.',
            sections: ['O olhar que disse tudo', 'A confissão sussurrada', 'O primeiro beijo de verdade'],
            wordCountTarget: 4000
          },
          {
            title: 'Capítulo 6: O Mal-Entendido e a Ruptura',
            summary: 'Um segredo mal interpretado ou medo de se machucar provoca um afastamento doloroso.',
            purpose: 'Criar a crise do terceiro ato necessária para o amadurecimento do casal.',
            sections: ['A mensagem fora de contexto', 'A mala na porta', 'O silêncio do apartamento'],
            wordCountTarget: 3500
          },
          {
            title: 'Capítulo 7: A Percepção da Saudade',
            summary: 'Distantes, ambos percebem que suas vidas não fazem sentido sem a presença do outro.',
            purpose: 'Construir a urgência emocional para o grande gesto reconciliador.',
            sections: ['A rotina cinzenta', 'O conselho do amigo leal', 'A decisão de arriscar tudo'],
            wordCountTarget: 3600
          },
          {
            title: 'Capítulo 8: O Grande Gesto e o Final Feliz Merecido',
            summary: 'Declaração apaixonada em público ou no momento decisivo, selando o amor para sempre.',
            purpose: 'Entregar o final catártico e feliz que os leitores do gênero exigem.',
            sections: ['A corrida pelo aeroporto ou chuva', 'As palavras que faltavam', 'Epílogo: Dois anos depois'],
            wordCountTarget: 4200
          }
        ]
      };
    }

    // 4. DESENVOLVIMENTO PESSOAL & HÁBITOS (DEFAULT NÃO-FICÇÃO)
    return {
      defaultTrimSize: '5.5x8.5',
      defaultPages: 180,
      isIllustrationOrActivity: false,
      penNameOptions: [
        'Marcus Valente',
        'Dr. André S. Castro',
        'Renata Albuquerque',
        'Lucas S. Ferreira'
      ],
      persona: {
        inspirationAuthors: 'James Clear (Hábitos Atômicos), Ryan Holiday, Carol Dweck, Charles Duhigg',
        authorDescription: 'Pesquisador comportamental e mentor de produtividade que traduz ciência complexa em passos simples e aplicáveis para o cotidiano.',
        tone: 'Direto, empático, científico, pragmático e acolhedor',
        writingSample: 'A disciplina duradoura não nasce da força bruta da sua força de vontade, mas sim da inteligência invisível dos seus ambientes e dos pequenos gatilhos que você programa.',
        generatedPersona: 'Voz de autoridade empática e sem rodeios teóricos desnecessários. Usa analogias cotidianas, frameworks acionáveis e planos de ação ao final de cada capítulo.'
      },
      details: {
        wordCountLabel: '35.000 - 45.000 palavras (~160-190 págs)',
        chapterCount: 8,
        bookStructure: 'problem-solution',
        paperType: 'bw-white',
        formatNote: '5.5" x 8.5" em papel branco, com caixas de destaque para exercícios práticos e sumário estruturado.'
      },
      bio: {
        nameType: 'real-name',
        background: 'Especialista em ciências cognitivas, hábitos diários e gestão de tempo com mais de uma década de aplicação prática.',
        achievements: 'Mentor de milhares de profissionais e autor de manuais de produtividade com alta aprovação de leitores no KDP.',
        personalDetails: 'Praticante de caminhadas matinais diárias, adepto do minimalismo digital e pai dedicado.',
        generatedBio: 'Marcus Valente é pesquisador comportamental e escritor dedicado a decodificar a mente humana para torná-la nossa maior aliada. Suas obras eliminam o excesso de teoria e entregam ferramentas práticas para construir rotinas produtivas, manter a serenidade mental e alcançar metas com consistência.'
      },
      chapters: [
        {
          title: 'Capítulo 1: O Mito da Força de Vontade: Por Que Começamos Bem e Falhamos no Meio',
          summary: 'Diagnóstico das armadilhas invisíveis da sobrecarga mental e por que depender apenas de motivação passageira é a receita do esgotamento.',
          purpose: 'Desconstruir a culpa do leitor e mostrar a ciência real por trás dos comportamentos.',
          sections: ['A fadiga de decisão diária', 'A ilusão da motivação infinita', 'A virada mental indispensável'],
          wordCountTarget: 3200
        },
        {
          title: 'Capítulo 2: A Anatomia dos Pequenos Hábitos: O Ciclo Gatilho-Rotina-Recompensa',
          summary: 'Como o cérebro automatiza caminhos neurais e como você pode reprogramá-los sem sofrimento desnecessário.',
          purpose: 'Apresentar o framework científico fundamental da mudança duradoura.',
          sections: ['Mapeando os gatilhos invisíveis', 'Substituição em vez de privação', 'O papel silencioso da dopamina'],
          wordCountTarget: 3500
        },
        {
          title: 'Capítulo 3: O Ambiente Invisível: Como Redesenhar seu Espaço para Vencer no Piloto Automático',
          summary: 'Táticas para reduzir o atrito das boas decisões e tornar os maus hábitos quase impossíveis de serem executados.',
          purpose: 'Mudar o foco do esforço interno para o design inteligente do ambiente físico e digital.',
          sections: ['A regra dos 20 segundos', 'Limpando o ruído das notificações', 'Construindo santuários de foco'],
          wordCountTarget: 3400
        },
        {
          title: 'Capítulo 4: A Regra dos 2 Minutos e a Identidade de Quem Não Desiste',
          summary: 'Como vencer a procrastinação inicial fracionando metas gigantescas em ações microscópicas e prazerosas.',
          purpose: 'Destravar a ação imediata através da mudança de autoimagem.',
          sections: ['A barreira do primeiro passo', 'Votando na sua nova identidade', 'Celebrando micro-vitórias'],
          wordCountTarget: 3300
        },
        {
          title: 'Capítulo 5: Superando Recaídas: O Protocolo de Retorno sem Culpa',
          summary: 'Estratégias práticas para quando a vida sair do controle, evitando o efeito bola de neve da desistência.',
          purpose: 'Blindar o projeto pessoal contra crises e imprevistos inevitáveis.',
          sections: ['A regra de nunca falhar duas vezes seguidas', 'Eliminando o diálogo interno tóxico', 'O plano de contingência de emergência'],
          wordCountTarget: 3200
        },
        {
          title: 'Capítulo 6: O Efeito Composto: Multiplicando Resultados com Paciência Estratégica',
          summary: 'Como 1% de melhoria diária se transforma em resultados monumentais após semanas e meses de prática.',
          purpose: 'Demonstrar a matemática dos ganhos exponenciais e sustentar o longo prazo.',
          sections: ['A curva invisível do progresso', 'A paciência dos profissionais', 'Métricas simples que importam'],
          wordCountTarget: 3100
        },
        {
          title: 'Capítulo 7: Foco Inabalável em um Mundo Barulhento: Blindando sua Atenção',
          summary: 'Técnicas modernas de trabalho profundo (Deep Work) para produzir com o dobro de qualidade na metade do tempo.',
          purpose: 'Capacitar o leitor a produzir em alto nível sem sacrificar a saúde mental.',
          sections: ['Blocos temporais inegociáveis', 'O poder do silêncio seletivo', 'Recuperação energética restauradora'],
          wordCountTarget: 3400
        },
        {
          title: 'Capítulo 8: O Plano de Ação dos Próximos 30 Dias: Seu Guia Passo a Passo',
          summary: 'Um roteiro diário estruturado para aplicar imediatamente tudo o que foi aprendido ao longo do livro.',
          purpose: 'Garantir que a leitura termine com um compromisso prático acionável.',
          sections: ['Semana 1: Limpeza e Fundação', 'Semana 2: O Primeiro Hábito Âncora', 'Semana 3 e 4: Consolidando o Estilo de Vida'],
          wordCountTarget: 3600
        }
      ]
    };
  }

  /**
   * Constrói ou completa o projeto garantindo que NENHUMA das 13 etapas fique vazia ou descontextualizada.
   */
  public static ensureCompleteEditorialProject(project: BookProject): BookProject {
    const bp = this.getBlueprint(
      project.kdpBookType || project.genre || 'self-help',
      project.title,
      project.topic
    );

    const updated = { ...project };

    // 1. Ficha técnica (Trim size e páginas)
    if (!updated.trimSize || updated.trimSize === '6x9') {
      updated.trimSize = bp.defaultTrimSize;
    }
    if (!updated.estimatedPages || (bp.isIllustrationOrActivity && updated.estimatedPages > 120)) {
      updated.estimatedPages = bp.defaultPages;
      updated.actualPages = bp.defaultPages;
      (updated as any).targetPages = bp.defaultPages;
    }

    // 2. Stage Data garantido
    const stageData = { ...(updated.stageData || {}) };

    // Etapa 5: Voz & Persona (NUNCA VAZIA)
    const personaData = (stageData['author-persona'] || {}) as any;
    if (!personaData.inspirationAuthors || !personaData.authorDescription) {
      stageData['author-persona'] = {
        inspirationAuthors: personaData.inspirationAuthors || bp.persona.inspirationAuthors,
        authorDescription: personaData.authorDescription || bp.persona.authorDescription,
        writingSample: personaData.writingSample || bp.persona.writingSample,
        generatedPersona: personaData.generatedPersona || bp.persona.generatedPersona,
        tone: personaData.tone || bp.persona.tone,
        mood: bp.persona.tone,
        perspective: bp.isIllustrationOrActivity ? 'Didático e Inspirador' : 'Primeira Pessoa & Empático',
        pacingStyle: bp.isIllustrationOrActivity ? 'Contemplativo' : 'Fluido e Ágil',
        savedPersonaName: bp.persona.inspirationAuthors.split(',')[0]
      };
    }

    // Etapa 7: Ficha Editorial (CALIBRADA PARA O NICHO)
    const detailsData = (stageData['book-details'] || {}) as any;
    if (!detailsData.wordCount || (bp.isIllustrationOrActivity && detailsData.wordCount.includes('k'))) {
      stageData['book-details'] = {
        wordCount: bp.details.wordCountLabel,
        chapterCount: bp.details.chapterCount,
        bookStructure: bp.details.bookStructure,
        additionalNotes: bp.details.formatNote
      };
    }

    // Etapa 8: Biografia do Autor (NUNCA MAIS "L. P. OLIVEIRA CORPORATIVO" PARA MANDALAS)
    const bioData = (stageData['author-bio'] || {}) as any;
    const defaultAuthor = bp.penNameOptions[0];
    if (!updated.author || updated.author === 'Leandro Palmeira' || updated.author === 'L. P. Oliveira' || !bioData.generatedBio) {
      updated.author = defaultAuthor;
      stageData['author-bio'] = {
        personalDetails: bioData.personalDetails || bp.bio.personalDetails,
        nameType: bp.bio.nameType as any,
        background: bioData.background || bp.bio.background,
        achievements: bioData.achievements || bp.bio.achievements,
        generatedBio: bioData.generatedBio || bp.bio.generatedBio,
        penName: defaultAuthor
      };
    }

    // Etapa 9: Sumário & Estrutura (NUNCA MAIS 0 CAPÍTULOS!)
    if (!updated.kdpChapters || updated.kdpChapters.length === 0) {
      const generatedChapters: IBookChapter[] = bp.chapters.map((ch, idx) => ({
        id: `ch_${idx + 1}_${Date.now()}`,
        index: idx + 1,
        title: ch.title,
        summary: ch.summary,
        status: 'draft',
        targetWordCount: ch.wordCountTarget,
        actualWordCount: 0,
        sections: ch.sections.map((sec, sIdx) => ({
          id: `sec_${idx + 1}_${sIdx + 1}`,
          title: sec,
          targetWordCount: Math.round(ch.wordCountTarget / ch.sections.length),
          actualWordCount: 0,
          keyPoints: [sec],
          completed: false
        })),
        keyPlotPoints: ch.sections,
        estimatedPages: Math.max(4, Math.round(ch.wordCountTarget / 280)),
        lastModified: Date.now()
      }));

      updated.kdpChapters = generatedChapters;
      (updated as any).totalChapters = generatedChapters.length;
    }

    updated.stageData = stageData;
    return updated;
  }
}
