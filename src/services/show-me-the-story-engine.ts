/**
 * SHOW ME THE STORY ENGINE
 * Inspirado e integrado com a arquitetura de Nigh/show-me-the-story
 * (Self-hosted AI Novel Generation, Story Lore Bible, Beat Sheet, Foreshadowing & De-AI Polish)
 * com dimensionamento prévio e estrito da quantidade de páginas para publicação física KDP.
 */

import { BookProject, IBookChapter, IBookConcept, IBookBible, BookType } from '../types/book-project';
import { PageEngine } from './page-engine';
import { LocalAiEngine } from './local-ai-engine';

export interface StoryBudget {
  targetPages: number;
  wordsPerPage: number;
  totalWords: number;
  frontMatterPages: number;
  backMatterPages: number;
  storyPages: number;
  chapterCount: number;
  wordsPerChapter: number;
  minWordsPerChapter: number;
  maxWordsPerChapter: number;
  spineWidthInches: number;
  bindingMarginInches: number;
}

export interface CharacterProfile {
  name: string;
  role: 'protagonist' | 'antagonist' | 'mentor' | 'ally' | 'rival';
  archetype: string;
  coreDesire: string;
  fatalFlaw: string;
  secret: string;
}

export interface ForeshadowItem {
  id: string;
  clue: string;
  plantedInChapter: number;
  resolvedInChapter: number;
  significance: string;
  status: 'planted' | 'pending' | 'resolved';
}

export interface StoryLoreBible {
  settingName: string;
  era: string;
  rulesOfWorld: string[];
  mainConflict: string;
  themeStatement: string;
  characters: CharacterProfile[];
  foreshadowing: ForeshadowItem[];
}

export class ShowMeTheStoryEngine {
  /**
   * 1. Calcula o orçamento exato de páginas, palavras e capítulos
   * com base na quantidade de páginas previamente escolhida pelo autor
   */
  public static calculateStoryBudget(targetPages: number, wordsPerPage: number = 250): StoryBudget {
    const pages = Math.max(30, Math.min(600, targetPages || 150));
    const frontMatterPages = 6; // Meio-rosto, Verso, Título, Copyright, Dedicatória, Sumário
    const backMatterPages = 4;  // Conclusão/Epílogo, Sobre o Autor, Notas
    const storyPages = Math.max(20, pages - frontMatterPages - backMatterPages);

    // Média de 10 a 14 páginas por capítulo para ritmo ideal KDP
    const idealPagesPerChapter = pages < 100 ? 8 : pages < 200 ? 12 : 15;
    const chapterCount = Math.max(4, Math.min(24, Math.round(storyPages / idealPagesPerChapter)));

    const totalWords = pages * wordsPerPage;
    const storyWords = storyPages * wordsPerPage;
    const wordsPerChapter = Math.round(storyWords / chapterCount);

    // Tolerância no padrão do Nigh/show-me-the-story (±15% ou 500 palavras)
    const tolerance = Math.max(400, Math.round(wordsPerChapter * 0.15));
    const minWordsPerChapter = Math.max(800, wordsPerChapter - tolerance);
    const maxWordsPerChapter = wordsPerChapter + tolerance;

    // Métricas KDP reais (papel creme 0.002252 pol/pág)
    const spineWidthInches = Math.max(0.2, Number((pages * 0.002252).toFixed(3)));
    const bindingMarginInches = pages <= 150 ? 0.625 : pages <= 300 ? 0.75 : 0.875;

    return {
      targetPages: pages,
      wordsPerPage,
      totalWords,
      frontMatterPages,
      backMatterPages,
      storyPages,
      chapterCount,
      wordsPerChapter,
      minWordsPerChapter,
      maxWordsPerChapter,
      spineWidthInches,
      bindingMarginInches
    };
  }

  /**
   * 2. Constrói a Bíblia da História (Lore Bible) com personagens, conflitos e foreshadowing
   */
  public static buildLoreBible(title: string, topic: string, bookType: BookType): StoryLoreBible {
    const isFiction = ['fiction-novel', 'thriller', 'romance', 'fantasy', 'sci-fi'].includes(bookType);

    if (isFiction) {
      return {
        settingName: 'Metrópole Contemporânea & Bastidores do Poder',
        era: 'Dias Atuais',
        rulesOfWorld: [
          'A informação é a moeda mais valiosa do ambiente.',
          'Nenhuma aliança é permanente quando o perigo se torna iminente.',
          'As consequências das ações passadas sempre cobram seu preço no clímax.'
        ],
        mainConflict: `A luta desesperada do protagonista para desvendar a conspiração em torno de "${title}" antes que seja incriminado.`,
        themeStatement: 'A coragem individual em face da corrupção institucional é a única força capaz de restaurar a verdade.',
        characters: [
          {
            name: 'Lucas Valente',
            role: 'protagonist',
            archetype: 'O Investigador Persistente',
            coreDesire: 'Descobrir a verdade sobre o desaparecimento do seu mentor e limpar seu nome.',
            fatalFlaw: 'Dificuldade crônica em confiar nos outros e propensão ao isolamento.',
            secret: 'Guarda o último relatório não publicado que compromete a cúpula da organização.'
          },
          {
            name: 'Dr. Arthur Prado',
            role: 'antagonist',
            archetype: 'O Arquiteto nas Sombras',
            coreDesire: 'Manter a ordem e os lucros a qualquer custo, eliminando dissidentes.',
            fatalFlaw: 'Subestimar a determinação de quem não tem mais nada a perder.',
            secret: 'Financiou ilegalmente as operações secretas desde o início da década.'
          },
          {
            name: 'Helena Ramos',
            role: 'ally',
            archetype: 'A Hacker Cética',
            coreDesire: 'Proteger seus irmãos mais novos e obter imunidade.',
            fatalFlaw: 'Ceticismo excessivo que gera hesitação em momentos críticos.',
            secret: 'Já trabalhou para o antagonista antes de perceber a extensão do plano.'
          }
        ],
        foreshadowing: [
          {
            id: 'fs_1',
            clue: 'Um relógio de pulso quebrado parado exatamente às 03:17 encontrado na gaveta trancada.',
            plantedInChapter: 1,
            resolvedInChapter: 8,
            significance: 'O horário exato em que a mensagem de traição foi transmitida.',
            status: 'planted'
          },
          {
            id: 'fs_2',
            clue: 'Uma referência passageira a um codinome esquecido em uma gravação de áudio.',
            plantedInChapter: 3,
            resolvedInChapter: 10,
            significance: 'Revela a verdadeira identidade do informante interno.',
            status: 'planted'
          }
        ]
      };
    } else {
      // Bíblia para Não-Ficção / Desenvolvimento Pessoal / Negócios
      return {
        settingName: 'A Realidade Prática do Mercado e da Vida Diária',
        era: 'Era Digital de Alta Sobrecarga Cognitiva',
        rulesOfWorld: [
          'A força de vontade pura sempre perde para o design do ambiente.',
          'Resultados sustentáveis decorrem de sistemas repetíveis, não de motivação efêmera.',
          'Pequenas melhorias de 1% diárias geram transformações geométricas a longo prazo.'
        ],
        mainConflict: 'A batalha diária entre a inércia da distração superficial e o poder do foco profundo.',
        themeStatement: 'Quem domina sua rotina e suas decisões conquista autonomia e liberdade duradouras.',
        characters: [
          {
            name: 'O Leitor em Busca de Virada',
            role: 'protagonist',
            archetype: 'O Aprendiz Comprometido',
            coreDesire: 'Eliminar a sobrecarga, ter clareza estratégica e atingir metas audaciosas.',
            fatalFlaw: 'Tendência a abraçar projetos demais e abandonar a consistência.',
            secret: 'Sente um medo silencioso de não estar à altura do próprio potencial.'
          },
          {
            name: 'O Mentor / Autor',
            role: 'mentor',
            archetype: 'O Guia Estratégico',
            coreDesire: 'Transferir metodologias testadas sem rodeios ou promessas fáceis.',
            fatalFlaw: 'Exigência de alto rigor que desafia a zona de conforto do leitor.',
            secret: 'Já fracassou repetidas vezes antes de decodificar o sistema que agora ensina.'
          }
        ],
        foreshadowing: [
          {
            id: 'fs_method',
            clue: 'O "Princípio dos 3 Pilares" mencionado brevemente na introdução.',
            plantedInChapter: 1,
            resolvedInChapter: 5,
            significance: 'Torna-se a ferramenta central que resolve todos os atritos dos capítulos finais.',
            status: 'planted'
          }
        ]
      };
    }
  }

  /**
   * 3. Motor De-AI Polish: Humaniza a prosa, variando cadência de frases e removendo clichês típicos de IA
   */
  public static deAiPolishProse(rawProse: string): string {
    let polished = rawProse;

    // Dicionário de clichês frequentes de IA para substituição por linguagem autoral vívida
    const aiClichés: [RegExp, string][] = [
      [/no mundo acelerado de hoje/gi, 'na rotina saturada da era digital'],
      [/em última análise/gi, 'quando os fatos são colocados à prova'],
      [/é importante lembrar que/gi, 'observe com atenção:'],
      [/um vislumbre de esperança/gi, 'uma brecha de oportunidade concreta'],
      [/como um farol no escuro/gi, 'como um ponto firme em meio à tempestade'],
      [/embarcar em uma jornada/gi, 'dar o primeiro passo prático'],
      [/uma tapeçaria rica/gi, 'um mosaico complexo'],
      [/não apenas/gi, 'tanto'],
      [/mas também/gi, 'quanto'],
      [/delve into/gi, 'analisar a fundo'],
      [/crucial para/gi, 'determinante para']
    ];

    aiClichés.forEach(([regex, replacement]) => {
      polished = polished.replace(regex, replacement);
    });

    return polished;
  }

  /**
   * 4. Gera a história completa dimensionada para a quantidade de páginas do autor
   */
  public static generateStoryBook(
    project: BookProject,
    targetPagesInput?: number
  ): BookProject {
    const targetPages = targetPagesInput || project.actualPages || project.estimatedPages || 150;
    const budget = this.calculateStoryBudget(targetPages);

    const title = project.title || 'A Arte dos Resultados Extraordinários';
    const topic = project.topic || title;
    const bookType = project.kdpBookType || 'self-help';

    // Cria a Bíblia de Lore do Show Me The Story
    const loreBible = this.buildLoreBible(title, topic, bookType);

    // Planeja os capítulos com base nas batidas dramáticas do Show Me The Story
    const chapters: IBookChapter[] = [];

    const beatNamesFiction = [
      'O Chamado da Realidade & O Incidente Incitante',
      'A Recusa da Inércia & Os Primeiros Passos no Desconhecido',
      'Travessia do Primeiro Limiar: Não Há Mais Retorno',
      'Testes, Aliados e a Revelação das Primeiras Máscaras',
      'Aproximação da Caverna Mais Profunda: O Cerco se Fecha',
      'A Provação Suprema: Quando Tudo Parece Perdido',
      'A Recompensa da Coragem: O Segredo Revelado',
      'O Caminho de Volta & A Reorganização das Forças',
      'O Clímax Avassalador: O Confronto Final',
      'A Ressurreição & O Novo Equilíbrio Conquistado'
    ];

    const beatNamesNonFiction = [
      'O Diagnóstico Cirúrgico: Onde Você Realmente Está',
      'A Ciência Invisível: Por Que os Métodos Comuns Fracassam',
      'O Pilar Fundamental: Construindo a Arquitetura da Clareza',
      'O Ambiente Blindado: Como Eliminar Fricções e Distrações',
      'A Metodologia dos Micro-Passos: Ação Sem Sobrecarga',
      'A Travessia do Platô: Constância nos Dias de Caos',
      'Alavancagem Estratégica: Multiplicando o Retorno por Hora',
      'Tomada de Decisão sob Alta Pressão e Incerteza',
      'A Mente Antifrágil: Convertendo Obstáculos em Tração',
      'O Plano Definitivo: Sustentando Resultados por Décadas'
    ];

    const isFiction = ['fiction-novel', 'thriller', 'romance', 'fantasy', 'sci-fi'].includes(bookType);
    const beatList = isFiction ? beatNamesFiction : beatNamesNonFiction;

    for (let i = 0; i < budget.chapterCount; i++) {
      const chIndex = i + 1;
      const beatTitle = beatList[i % beatList.length];
      const chTitle = `Capítulo ${chIndex}: ${beatTitle}`;

      // Monta o conceito para a redação
      const concept: IBookConcept = {
        title,
        subtitle: project.subtitle || 'O Guia Definitivo',
        hook: topic,
        audience: project.targetAudience || 'Leitores comprometidos com transformação real',
        readingLevel: 'Intermediário',
        tone: isFiction ? 'Tenso, imersivo e ágil' : 'Direto, fundamentado e inspirador',
        promise: project.description || `Transformação completa através de ${title}`,
        differentiator: 'Estrutura narrativa do Show Me The Story com pacing calibrado e sem clichês',
        shortSynopsis: project.description || title,
        longSynopsis: project.description || title,
        targetWordCount: budget.totalWords,
        targetChapterCount: budget.chapterCount,
        targetPages: budget.targetPages,
        trimSize: project.trimSize || '6x9',
        paperType: project.paperType || 'bw-white',
        comparableTitles: [],
        themes: [topic],
        titleOptions: []
      };

      const bible: IBookBible = {
        characters: loreBible.characters.map(c => ({
          name: c.name,
          role: c.role,
          appearance: 'Trajes discretos, olhar analítico e postura firme.',
          description: `${c.archetype}: ${c.coreDesire}. Falha: ${c.fatalFlaw}`,
          arc: `Superar ${c.fatalFlaw} e confrontar o segredo ${c.secret}`,
          personality: c.archetype
        })),
        locations: [
          { name: loreBible.settingName, description: 'Cenário de alta tensão e dinamismo.', mood: 'Tensão constante e pressão implacável.' }
        ],
        styleGuide: { artStyle: 'realistic-photo', palette: ['#0f172a', '#2563eb', '#f8fafc'], tone: concept.tone }
      };

      const chObj: IBookChapter = {
        index: chIndex,
        title: chTitle,
        summary: `Desenvolvimento aprofundado da batida "${beatTitle}" conectando o foreshadowing e a progressão dramática.`,
        targetWordCount: budget.wordsPerChapter,
        wordCount: 0,
        scenes: [],
        subtopics: [
          'O Cenário Inicial e a Tensão Imediata',
          'Aprofundamento dos Mecanismos e Descobertas',
          'Estudo de Caso / Conflito Direto',
          'A Virada Decisiva do Capítulo',
          'Síntese e Gancho para o Próximo Estágio'
        ],
        prose: ''
      };

      // Redige a prosa densa de alto volume
      const written = LocalAiEngine.writeChapter(concept, bible, chObj, bookType);
      const polishedProse = this.deAiPolishProse(written.prose);

      chapters.push({
        ...chObj,
        prose: polishedProse,
        wordCount: written.wordCount,
        status: 'REVISADO' as const
      });
    }

    // Atualiza o projeto com a contagem estrita de páginas e capítulos
    const updated: BookProject = {
      ...project,
      estimatedPages: budget.targetPages,
      actualPages: budget.targetPages,
      trimSize: project.trimSize || '6x9',
      kdpChapters: chapters,
      stageData: {
        ...(project.stageData || {}),
        'book-details': {
          wordCount: `${budget.totalWords} palavras (~${budget.targetPages} págs)`,
          chapterCount: budget.chapterCount,
          bookStructure: isFiction ? 'Jornada em 3 Atos (Show Me The Story)' : 'Método Modular em 10 Fases',
          additionalNotes: `Gerado via Show Me The Story Engine • Padrão KDP 6x9 com ${budget.targetPages} páginas.`
        },
        'outline': {
          chapters
        }
      }
    };

    // Gera todas as páginas visuais diagramadas no formato KDP
    const fullProject = PageEngine.ensureCompleteBookManuscript(updated, budget.targetPages);
    return fullProject;
  }
}
