import { WordSearchPuzzleItem } from './types';

export interface WordTheme {
  themeName: string;
  words: string[];
}

export const PRESET_WORD_THEMES: WordTheme[] = [
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
];

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

      // Tenta até 100 posições aleatórias
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
