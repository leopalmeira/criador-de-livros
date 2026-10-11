import { WordSearchPuzzleItem, PuzzleLanguage } from './types';

export interface WordTheme {
  themeName: string;
  words: string[];
}

export const WORD_THEMES_BY_LANG: Record<PuzzleLanguage, WordTheme[]> = {
  pt: [
    {
      themeName: 'Animais Selvagens',
      words: ['LEAO', 'TIGRE', 'ELEFANTE', 'GIRAFA', 'ZEBRA', 'LEOPARDO', 'PANDA', 'MACACO', 'LOBO', 'RINOCERONTE', 'HIPOPOTAMO', 'JAGUATIRICA', 'GUEPARDO', 'GORILA', 'CANGURU']
    },
    {
      themeName: 'Frutas Tropicais & Frescas',
      words: ['ABACAXI', 'MANGA', 'MARACUJA', 'BANANA', 'LARANJA', 'MORANGO', 'MELANCIA', 'ABACATE', 'GOIABA', 'PITANGA', 'GRAVIOLA', 'ACAI', 'CAQUI', 'UVA', 'LIMAO']
    },
    {
      themeName: 'Países & Cidades do Mundo',
      words: ['BRASIL', 'PORTUGAL', 'FRANCA', 'ITALIA', 'JAPAO', 'CANADA', 'MEXICO', 'ESPANHA', 'ALEMANHA', 'LONDRES', 'PARIS', 'ROMA', 'TOQUIO', 'BERLIM', 'MADRI']
    },
    {
      themeName: 'Universo & Astronomia',
      words: ['PLANETA', 'ESTRELA', 'GALAXIA', 'COMETA', 'METEORO', 'NEBULOSA', 'ORBITA', 'LUA', 'SOL', 'SATURNO', 'JUPITER', 'MARTE', 'ASTRONAUTA', 'TELESCOPIO', 'COSMOS']
    },
    {
      themeName: 'Natureza & Florestas',
      words: ['ARVORE', 'FLOR', 'RIO', 'MONTANHA', 'CACHOEIRA', 'VALE', 'BOSQUE', 'SEMENTE', 'FOLHA', 'TRILHA', 'ORVALHO', 'VENTO', 'SOL', 'CLAREIRA', 'TERRA']
    },
    {
      themeName: 'Culinária & Cozinha',
      words: ['TEMPERO', 'RECEITA', 'PANELA', 'FORNO', 'FARINHA', 'AZEITE', 'ALECRIM', 'MANJERICAO', 'CANELA', 'PIMENTA', 'CHOCOLATE', 'MOLHO', 'SALADA', 'SOPA', 'QUEIJO']
    },
    {
      themeName: 'Esportes & Aventura',
      words: ['FUTEBOL', 'BASQUETE', 'VOLEI', 'NATACAO', 'CORRIDA', 'CICLISMO', 'TENIS', 'SURFE', 'SKATE', 'ESCALADA', 'ATLETISMO', 'CANOAGEM', 'JUDO', 'GOLFE', 'BOXE']
    },
    {
      themeName: 'Tecnologia & Futuro',
      words: ['ROBOCON', 'CIRCUITO', 'DADOS', 'SOFTWARE', 'ALGORITMO', 'SATELITE', 'CODIGO', 'INTERNET', 'SENSOR', 'NUVEM', 'PROCESSADOR', 'FIBRA', 'ANTENA', 'ROBO', 'DIGITAL']
    },
    {
      themeName: 'Música & Instrumentos',
      words: ['VIOLAO', 'PIANO', 'BATERIA', 'FLAUTA', 'SAXOFONE', 'VIOLINO', 'HARPA', 'TROMBON', 'GUITARRA', 'RITMO', 'HARMONIA', 'MELODIA', 'CANTO', 'BAIXO', 'ORQUESTRA']
    },
    {
      themeName: 'Sentimentos & Positividade',
      words: ['ALEGRIA', 'ESPERANCA', 'CORAGEM', 'GRATIDAO', 'PAZ', 'BONDADE', 'SABEDORIA', 'ENTUSIASMO', 'SERENIDADE', 'CONFIANCA', 'OTIMISMO', 'AMIZADE', 'HARMONIA', 'AMOR', 'FOCO']
    }
  ],
  en: [
    {
      themeName: 'Wild Animals',
      words: ['LION', 'TIGER', 'ELEPHANT', 'GIRAFFE', 'ZEBRA', 'LEOPARD', 'PANDA', 'MONKEY', 'WOLF', 'RHINOCEROS', 'HIPPOPOTAMUS', 'CHEETAH', 'GORILLA', 'KANGAROO', 'EAGLE']
    },
    {
      themeName: 'World Cities',
      words: ['LONDON', 'PARIS', 'TOKYO', 'NEW YORK', 'ROME', 'MADRID', 'BERLIN', 'SYDNEY', 'CAIRO', 'TORONTO', 'DUBAI', 'BANGKOK', 'SEOUL', 'LISBON', 'ATHENS']
    },
    {
      themeName: 'Tropical & Fresh Fruits',
      words: ['MANGO', 'PINEAPPLE', 'BANANA', 'ORANGE', 'STRAWBERRY', 'WATERMELON', 'PAPAYA', 'COCONUT', 'PASSIONFRUIT', 'GUAVA', 'LEMON', 'PEACH', 'CHERRY', 'APPLE', 'GRAPE']
    },
    {
      themeName: 'Universe & Astronomy',
      words: ['PLANET', 'GALAXY', 'COMET', 'METEOR', 'NEBULA', 'ORBIT', 'MOON', 'SUN', 'SATURN', 'JUPITER', 'MARS', 'ASTRONAUT', 'TELESCOPE', 'COSMOS', 'STAR']
    },
    {
      themeName: 'Nature & Forests',
      words: ['TREE', 'FLOWER', 'RIVER', 'MOUNTAIN', 'WATERFALL', 'VALLEY', 'FOREST', 'LEAF', 'TRAIL', 'SUNLIGHT', 'BREEZE', 'MEADOW', 'OCEAN', 'STREAM', 'LAKE']
    },
    {
      themeName: 'Cooking & Culinary',
      words: ['RECIPE', 'FLAVOR', 'KITCHEN', 'BAKING', 'CHEF', 'SPICE', 'ROSEMARY', 'CINNAMON', 'PEPPER', 'CHOCOLATE', 'SAUCE', 'SALAD', 'CHEESE', 'PASTA', 'ROAST']
    },
    {
      themeName: 'Sports & Athletics',
      words: ['SOCCER', 'BASKETBALL', 'TENNIS', 'SWIMMING', 'RUNNING', 'CYCLING', 'SURFING', 'SKATING', 'CLIMBING', 'GOLF', 'BOXING', 'ROWING', 'JUDO', 'VOLLEYBALL', 'RUGBY']
    },
    {
      themeName: 'Science & Technology',
      words: ['CIRCUIT', 'SATELLITE', 'ROBOT', 'ALGORITHM', 'SOFTWARE', 'INTERNET', 'SENSOR', 'CLOUD', 'CHIP', 'QUANTUM', 'DATA', 'CODING', 'LASER', 'ATOM', 'ENERGY']
    },
    {
      themeName: 'Music & Instruments',
      words: ['GUITAR', 'PIANO', 'DRUMS', 'FLUTE', 'SAXOPHONE', 'VIOLIN', 'HARP', 'TRUMPET', 'RHYTHM', 'HARMONY', 'MELODY', 'VOCAL', 'BASS', 'CELLO', 'ORCHESTRA']
    },
    {
      themeName: 'Positive Mindset',
      words: ['COURAGE', 'WISDOM', 'GRATITUDE', 'PEACE', 'HOPE', 'KINDNESS', 'JOY', 'HARMONY', 'SERENITY', 'TRUST', 'OPTIMISM', 'FOCUS', 'STRENGTH', 'SMILE', 'LOVE']
    }
  ],
  es: [
    {
      themeName: 'Animales Salvajes',
      words: ['LEON', 'TIGRE', 'ELEFANTE', 'JIRAFA', 'CEBRA', 'LEOPARDO', 'PANDA', 'MONO', 'LOBO', 'RINOCERONTE', 'HIPOPOTAMO', 'GUEPARDO', 'GORILA', 'CANGURO', 'AGUILA']
    },
    {
      themeName: 'Ciudades del Mundo',
      words: ['MADRID', 'BARCELONA', 'PARIS', 'LONDRES', 'ROMA', 'TOKIO', 'BUENOS AIRES', 'MEXICO', 'BOGOTA', 'SANTIAGO', 'LIMA', 'BERLIN', 'LISBOA', 'NUEVA YORK', 'ATENAS']
    },
    {
      themeName: 'Frutas Frescas',
      words: ['MANGO', 'PINA', 'BANANA', 'NARANJA', 'FRESA', 'SANDIA', 'PAPAYA', 'COCO', 'MARACUYA', 'GUAYABA', 'LIMON', 'MELOCOTON', 'CEREZA', 'MANZANA', 'UVA']
    },
    {
      themeName: 'Universo & Espacio',
      words: ['PLANETA', 'GALAXIA', 'COMETA', 'METEORO', 'NEBULOSA', 'ORBITA', 'LUNA', 'SOL', 'SATURNO', 'JUPITER', 'MARTE', 'ASTRONAUTA', 'TELESCOPIO', 'COSMOS', 'ESTRELLA']
    },
    {
      themeName: 'Naturaleza & Bosques',
      words: ['ARBOL', 'FLOR', 'RIO', 'MONTANA', 'CASCADA', 'VALLE', 'BOSQUE', 'HOJA', 'SENDERO', 'BRISA', 'PRADERA', 'OCEANO', 'LAGO', 'MANANTIAL', 'TIERRA']
    },
    {
      themeName: 'Cocina & Gastronomía',
      words: ['RECETA', 'SABOR', 'COCINA', 'HORNO', 'HARINA', 'ACEITE', 'ROMERO', 'CANELA', 'PIMIENTA', 'CHOCOLATE', 'SALSA', 'ENSALADA', 'QUESO', 'PASTA', 'GUISO']
    },
    {
      themeName: 'Deportes & Aventura',
      words: ['FUTBOL', 'BALONCESTO', 'TENIS', 'NATACION', 'CORRER', 'CICLISMO', 'SURF', 'PATINAJE', 'ESCALADA', 'GOLF', 'BOXEO', 'REMO', 'JUDO', 'VOLEIBOL', 'ATLETISMO']
    },
    {
      themeName: 'Ciencia & Futuro',
      words: ['CIRCUITO', 'SATELITE', 'ROBOT', 'ALGORITMO', 'SOFTWARE', 'INTERNET', 'SENSOR', 'NUBE', 'CHIP', 'CUANTICO', 'DATOS', 'CODIGO', 'LASER', 'ATOMO', 'ENERGIA']
    },
    {
      themeName: 'Música & Instrumentos',
      words: ['GUITARRA', 'PIANO', 'BATERIA', 'FLAUTA', 'SAXOFON', 'VIOLIN', 'ARPA', 'TROMPETA', 'RITMO', 'ARMONIA', 'MELODIA', 'CANTO', 'BAJO', 'CHELO', 'ORQUESTA']
    },
    {
      themeName: 'Mente Positiva',
      words: ['CORAJE', 'SABIDURIA', 'GRATITUD', 'PAZ', 'ESPERANZA', 'BONDAD', 'ALEGRIA', 'ARMONIA', 'SERENIDAD', 'CONFIANZA', 'OPTIMISMO', 'ENFOQUE', 'FUERZA', 'AMISTAD', 'AMOR']
    }
  ]
};

export const PRESET_WORD_THEMES: WordTheme[] = WORD_THEMES_BY_LANG.pt;

export class WordSearchEngine {
  // 8 Direções: [dRow, dCol, nome]
  private static readonly DIRECTIONS = [
    [0, 1, 'H-LR'],   // Horizontal Esquerda -> Direita
    [0, -1, 'H-RL'],  // Horizontal Direita -> Esquerda
    [1, 0, 'V-TB'],   // Vertical Cima -> Baixo
    [-1, 0, 'V-BT'],  // Vertical Baixo -> Cima
    [1, 1, 'D-SE'],   // Diagonal Sudeste
    [-1, -1, 'D-NW'], // Diagonal Noroeste
    [1, -1, 'D-SW'],  // Diagonal Sudoeste
    [-1, 1, 'D-NE']   // Diagonal Nordeste
  ] as const;

  /**
   * Retorna os temas pré-definidos para o idioma escolhido
   */
  public static getThemesForLanguage(lang: PuzzleLanguage = 'pt'): WordTheme[] {
    return WORD_THEMES_BY_LANG[lang] || WORD_THEMES_BY_LANG.pt;
  }

  /**
   * Remove acentos e caracteres especiais, converte para maiúsculo
   */
  public static cleanWord(word: string): string {
    return word
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z]/g, '')
      .toUpperCase();
  }

  /**
   * Gera um Caça-Palavras com tema, grade e gabarito
   */
  public static generatePuzzle(
    number: number,
    themeName: string,
    wordList: string[],
    gridSize: 15 | 18 | 20 = 15
  ): WordSearchPuzzleItem {
    // Normaliza palavras e filtra comprimentos válidos
    const validWords = wordList
      .map(w => this.cleanWord(w))
      .filter(w => w.length >= 3 && w.length <= gridSize)
      .sort((a, b) => b.length - a.length); // Mais longas primeiro para facilitar encaixe

    const grid: string[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(''));
    const placements: WordSearchPuzzleItem['placements'] = [];
    const placedWords: string[] = [];

    // Tenta posicionar cada palavra
    for (const word of validWords) {
      let placed = false;
      const shuffledDirs = [...this.DIRECTIONS].sort(() => Math.random() - 0.5);

      // Tenta até 120 posições aleatórias
      for (let attempt = 0; attempt < 120 && !placed; attempt++) {
        const [dRow, dCol, dirName] = shuffledDirs[attempt % shuffledDirs.length];
        const startRow = Math.floor(Math.random() * gridSize);
        const startCol = Math.floor(Math.random() * gridSize);

        const endRow = startRow + dRow * (word.length - 1);
        const endCol = startCol + dCol * (word.length - 1);

        // Checa limites da grade
        if (endRow < 0 || endRow >= gridSize || endCol < 0 || endCol >= gridSize) {
          continue;
        }

        // Checa se todas as células são livres ou iguais
        let canPlace = true;
        for (let i = 0; i < word.length; i++) {
          const r = startRow + dRow * i;
          const c = startCol + dCol * i;
          const char = word[i];
          if (grid[r][c] !== '' && grid[r][c] !== char) {
            canPlace = false;
            break;
          }
        }

        if (canPlace) {
          // Grava a palavra na grade
          for (let i = 0; i < word.length; i++) {
            const r = startRow + dRow * i;
            const c = startCol + dCol * i;
            grid[r][c] = word[i];
          }

          placements.push({
            word,
            startRow,
            startCol,
            endRow,
            endCol,
            direction: dirName
          });
          placedWords.push(word);
          placed = true;
        }
      }
    }

    // Preenche as células vazias com letras aleatórias
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (grid[r][c] === '') {
          grid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
        }
      }
    }

    return {
      id: `wordsearch_${number}_${Date.now()}`,
      number,
      type: 'wordsearch',
      theme: themeName,
      gridSize,
      grid,
      words: placedWords,
      placements
    };
  }
}
