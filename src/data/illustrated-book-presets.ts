// ================================================================
// 32 OPÇÕES PRONTAS DE LIVROS ILUSTRADOS DE ALTA CONVERSÃO KDP
// Cada opção traz título, subtítulo, premissa, estilo visual
// e roteiro sequencial de páginas com lógica consistente de enredo.
// ================================================================

export interface IllustratedPagePreset {
  pageNumber: number;
  title: string;
  sceneSummary: string;
  prompt: string;
}

export interface IllustratedBookPreset {
  id: string;
  nome: string;
  categoria: string;
  emoji: string;
  tituloSugerido: string;
  subtituloSugerido: string;
  autorSugerido: string;
  estiloVisual: string;
  promptPremissa: string;
  paginasRoteiro: IllustratedPagePreset[];
}

export const ILLUSTRATED_BOOK_PRESETS: IllustratedBookPreset[] = [
  {
    id: 'fabulas_floresta',
    nome: 'Fábulas Encantadas da Floresta',
    categoria: 'Infantil & Família',
    emoji: '🦊',
    tituloSugerido: 'O Segredo da Floresta Dourada',
    subtituloSugerido: 'A jornada da pequena raposa que aprendeu a ouvir o vento',
    autorSugerido: 'Leandro Palmeira',
    estiloVisual: 'Aquarela mágica suave de livro infantil, iluminação de pôr do sol dourado',
    promptPremissa: 'História infantil tocante sobre Pip, uma raposinha curiosa que descobre como a gentileza e a paciência ajudam a restaurar as fontes mágicas da grande floresta.',
    paginasRoteiro: [
      {
        pageNumber: 1,
        title: 'O Despertar da Clareira',
        sceneSummary: 'Pip acorda em sua toca confortável sob as raízes de um carvalho e nota que o rio parou de cantar.',
        prompt: 'Charming storybook watercolor illustration of Pip the little baby fox waking up inside a cozy tree root den with soft morning sunbeams and wild moss, clean artistic composition, no text.'
      },
      {
        pageNumber: 2,
        title: 'O Encontro com o Velho Mocho',
        sceneSummary: 'Pip sobe até o galho mais alto para pedir conselhos à sábia coruja anciã sobre a nascente adormecida.',
        prompt: 'Artistic storybook watercolor of the little fox talking to a wise gentle old owl perched on a blooming ancient oak branch, starry twilight glow, magical atmosphere, no text.'
      },
      {
        pageNumber: 3,
        title: 'A Ponte dos Seixos Coloridos',
        sceneSummary: 'Pip e um tímido esquilo cruzam juntos um riacho de águas cristalinas com pedras brilhantes.',
        prompt: 'Whimsical storybook illustration of the little fox helping a tiny squirrel carry an acorn across smooth vibrant colored stepping stones in a crystal clear stream, award-winning book art.'
      },
      {
        pageNumber: 4,
        title: 'A Flor da Harmonia',
        sceneSummary: 'No coração da floresta, Pip encontra a flor cristalina que precisa de uma canção de amizade para florescer.',
        prompt: 'Magical children book illustration of the friendly little fox sitting beside a glowing luminescent woodland flower, surrounded by gentle fireflies and blooming bluebells, soft watercolor, no text.'
      },
      {
        pageNumber: 5,
        title: 'A Grande Celebração',
        sceneSummary: 'As águas voltam a correr e todos os animais da floresta se reúnem num banquete festivo de frutos da estação.',
        prompt: 'Lively joyful woodland celebration with the little fox, rabbits, deer, and badgers sharing sweet berries under a canopy of warm glowing lantern lights in the forest, heartwarming art.'
      }
    ]
  },
  {
    id: 'mitologia_nordica',
    nome: 'Mitologia Nórdica: A Saga dos Deuses',
    categoria: 'Mitologia & Épico',
    emoji: '⚡',
    tituloSugerido: 'As Runas de Asgard',
    subtituloSugerido: 'Crônicas dos Nove Reinos e a sabedoria de Yggdrasil',
    autorSugerido: 'Leandro Palmeira',
    estiloVisual: 'Pintura digital épica cinematográfica com névoa mística e runas brilhantes',
    promptPremissa: 'Uma jornada épica pelas raízes do Freixo do Mundo onde Odin busca o conhecimento oculto das runas primordiais.',
    paginasRoteiro: [
      {
        pageNumber: 1,
        title: 'O Freixo Cósmico Yggdrasil',
        sceneSummary: 'A visão cósmica da árvore colossal que conecta os nove mundos através de raízes estelares.',
        prompt: 'Epic cinematic digital painting of Yggdrasil the colossal World Tree with glowing stellar roots spanning across nebulae and snowy mountain peaks, Norse mythology masterpiece, no text.'
      },
      {
        pageNumber: 2,
        title: 'A Forja dos Anões de Nidavellir',
        sceneSummary: 'Os lendários ferreiros moldam relíquias divinas entre rios de lava e bigornas ancestrais.',
        prompt: 'Dramatic atmospheric fantasy illustration of master dwarf blacksmiths forging magical artifacts with sparks flying and glowing molten gold in cavernous halls of Nidavellir, 8k art.'
      },
      {
        pageNumber: 3,
        title: 'O Guardião da Bifrost',
        sceneSummary: 'Heimdall empunha a espada Gjallarhorn vigiando a ponte do arco-íris cósmico.',
        prompt: 'Epic painting of Heimdall standing vigil at the radiant shimmering rainbow bridge Bifrost, golden armor reflecting aurora borealis in celestial sky, Norse epic art, no text.'
      },
      {
        pageNumber: 4,
        title: 'O Lago do Destino e as Nornas',
        sceneSummary: 'As três tecelãs do tempo tecem a tapeçaria das eras às margens da fonte sagrada de Urd.',
        prompt: 'Mystical dark fantasy illustration of the three Norns weaving radiant threads of destiny beside a calm mystical well, surrounded by swirling mist and ancient rune stones.'
      },
      {
        pageNumber: 5,
        title: 'O Salão de Valhalla',
        sceneSummary: 'Os escudos dourados recobrem o teto do grande salão onde os heróis celebram a coragem imortal.',
        prompt: 'Grand monumental illustration of the great hall of Valhalla with endless tables, radiant golden shields forming the ceiling, warm braziers burning, heroic mythic scale.'
      }
    ]
  },
  {
    id: 'cyberpunk_noir',
    nome: 'Cyberpunk Noir: Cidade de Neon',
    categoria: 'Ficção Científica',
    emoji: '🌆',
    tituloSugerido: 'Circuito Sombrio 2099',
    subtituloSugerido: 'Memórias sintéticas e o mistério na chuva de Neo-São Paulo',
    autorSugerido: 'Leandro Palmeira',
    estiloVisual: 'Estética cinematográfica cyberpunk, chuva refletindo neon azul e magenta, alto contraste',
    promptPremissa: 'Um detetive cibernético investiga um caso de fuga de memórias proibidas nas ruas chuvosas de uma megalópole vertical do futuro.',
    paginasRoteiro: [
      {
        pageNumber: 1,
        title: 'Chuva na Megalópole',
        sceneSummary: 'O detetive solitário de sobretudo e implante ocular observa a cidade através do vidro molhado.',
        prompt: 'Cinematic cyberpunk noir illustration, cybernetic detective in trench coat overlooking rainy futuristic metropolis drenched in neon cyan and magenta reflections, atmospheric mood.'
      },
      {
        pageNumber: 2,
        title: 'O Mercado Clandestino de Chips',
        sceneSummary: 'Beco estreito apinhado de barracas holográficas e técnicos de dados vendendo relíquias analógicas.',
        prompt: 'Bustling rainy cyberpunk alleyway market with glowing holographic signs, steam rising from grates, street food vendors, cybernetic enhancements, blade runner aesthetic.'
      },
      {
        pageNumber: 3,
        title: 'O Enigma do Holograma Fantasma',
        sceneSummary: 'Uma projeção holográfica de uma bailarina de luz surge no centro de um terminal abandonado.',
        prompt: 'Atmospheric scene of a detective encountering a shimmering glitchy blue hologram of a dancer inside a ruined retro-futuristic server room, dust motes in neon light.'
      },
      {
        pageNumber: 4,
        title: 'Perseguição nas Alturas',
        sceneSummary: 'Drones e veículos voadores cortando pontes suspensas entre arranha-céus colossais.',
        prompt: 'Thrilling aerial chase through towering neon skyscrapers with flying police spinners and delivery drones streaking light trails through rain and heavy fog, dynamic angle.'
      },
      {
        pageNumber: 5,
        title: 'O Amanhecer Sintético',
        sceneSummary: 'Os primeiros raios de sol rompem a névoa ácida revelando a verdade gravada no chip central.',
        prompt: 'Poetic cyberpunk sunrise over massive architectural city layers, warm amber sunlight piercing through smog, detective holding glowing data core on a rooftop ledge.'
      }
    ]
  },
  {
    id: 'guia_botanico',
    nome: 'Guia Botânico & Ervas Medicinais',
    categoria: 'Não-Ficção Ilustrada',
    emoji: '🌿',
    tituloSugerido: 'O Livro das Ervas Sagradas',
    subtituloSugerido: 'Guia visual de plantas medicinais, chás ancestrais e botânica curativa',
    autorSugerido: 'Leandro Palmeira',
    estiloVisual: 'Ilustração botânica vintage clássica em aquarela sobre papel envelhecido pergaminho',
    promptPremissa: 'Um compêndio visual elegante das principais ervas medicinais, detalhando raízes, folhas, flores e preparados tradicionais com arte botânica de colecionador.',
    paginasRoteiro: [
      {
        pageNumber: 1,
        title: 'Camomila & Suas Virtudes Calmantes',
        sceneSummary: 'Estudo botânico minucioso da flor de camomila, folhas plumosas e corte transversal da pétala.',
        prompt: 'Exquisite vintage botanical illustration of Chamomile flowers, Matricaria chamomilla, detailed anatomical watercolor on aged cream parchment paper, scientific precision, elegant art.'
      },
      {
        pageNumber: 2,
        title: 'Alecrim: A Erva da Memória',
        sceneSummary: 'Ramos verde-acinzentados com flores arroxeadas e pequenas gotas de óleo essencial.',
        prompt: 'Classic botanical plate of Rosemary, Rosmarinus officinalis, fragrant sprigs with delicate lilac blossoms and botanical dissection drawings on parchment background.'
      },
      {
        pageNumber: 3,
        title: 'Lavanda & Serenidade',
        sceneSummary: 'Buquê de espigas de lavanda com notas descritivas e pequenas abelhas polinizando.',
        prompt: 'Vintage botanical watercolor of French Lavender spikes, Lavandula angustifolia, rich purple hues, fine ink lines, vintage herbalist encyclopedia aesthetic, no text.'
      },
      {
        pageNumber: 4,
        title: 'Hortelã-Pimenta & Digestão Natural',
        sceneSummary: 'Folhas serrilhadas de menta verde vibrante com raízes rasteiras visíveis.',
        prompt: 'Botanical plate study of Peppermint, Mentha piperita, fresh green serrated leaves with fine veins and roots, watercolor botanical illustration on antique parchment.'
      },
      {
        pageNumber: 5,
        title: 'A Botica do Herbalista',
        sceneSummary: 'Mesa de madeira com vidrarias antigas, almofariz de pedra, ervas secando e caderno de campo.',
        prompt: 'Warm cozy botanical laboratory scene with dried herb bundles hanging from timber beams, mortar and pestle, glass tincture bottles, hand-drawn field journals, soft window light.'
      }
    ]
  },
  {
    id: 'contos_fadas',
    nome: 'Contos de Fadas & Florestas Encantadas',
    categoria: 'Infanto-Juvenil & Fantasia',
    emoji: '🏰',
    tituloSugerido: 'O Castelo Além das Nuvens',
    subtituloSugerido: 'Uma fábula sobre a coragem dos pequenos sonhadores',
    autorSugerido: 'Leandro Palmeira',
    estiloVisual: 'Ilustração mágica de conto de fadas, cores luminosas estilo Disney clássico e Ghibli',
    promptPremissa: 'A jovem princesa exploradora que constrói asas de seda para alcançar o reino flutuante e libertar o pássaro do sol.',
    paginasRoteiro: [
      {
        pageNumber: 1,
        title: 'A Torre do Tear Mágico',
        sceneSummary: 'A princesa tece fios dourados na janela mais alta de uma torre cercada por roseiras silvestres.',
        prompt: 'Enchanting fairytale storybook illustration of a young brave princess weaving glowing golden thread at a stone tower arched window filled with wild blooming roses, magical light.'
      },
      {
        pageNumber: 2,
        title: 'O Voo Sobre a Floresta',
        sceneSummary: 'Com asas de seda encantada, ela plana sobre o mar de copas verdes ao amanhecer.',
        prompt: 'Breathtaking fairytale art of the girl gliding with iridescent silk wings high above a lush morning forest with morning mist and rainbow cascades, sense of wonder.'
      },
      {
        pageNumber: 3,
        title: 'As Ilhas Flutuantes',
        sceneSummary: 'Aproximação das montanhas voadoras com cachoeiras que desaguam no vazio do céu.',
        prompt: 'Whimsical fantasy painting of floating green sky islands with ancient white marble ruins, crystal waterfalls falling into clouds, majestic sky castle in the distance.'
      },
      {
        pageNumber: 4,
        title: 'A Libertação do Pássaro Solar',
        sceneSummary: 'Ela abre a gaiola estelar e o majestoso pássaro dourado envolve os céus em calor e alegria.',
        prompt: 'Inspiring fairytale scene of the girl releasing a radiant golden phoenix of light into the sky, sparkling embers, golden feathers, cinematic joyous lighting.'
      },
      {
        pageNumber: 5,
        title: 'A Coroação da Paz',
        sceneSummary: 'O reino da terra e o reino do céu celebram juntos uma nova era de união e esperança.',
        prompt: 'Grand joyful storybook celebration with townspeople, sky folk, and friendly woodland spirits gathered in a lantern-lit village square under starlight, warm fairytale art.'
      }
    ]
  },
  {
    id: 'misterio_vitoriano',
    nome: 'Mistério & Investigação Vitoriana',
    categoria: 'Mistério & Suspense',
    emoji: '🔍',
    tituloSugerido: 'O Enigma da Torre do Relógio',
    subtituloSugerido: 'Os arquivos secretos do detetive da névoa de Londres',
    autorSugerido: 'Leandro Palmeira',
    estiloVisual: 'Ilustração estilizada de época vitoriana, lampiões a gás, névoa densa e mistério atmosférico',
    promptPremissa: 'Um caso instigante em plena Londres vitoriana envolvendo engrenagens mecânicas, relógios antigos e pistas ocultas em partituras musicais.',
    paginasRoteiro: [
      {
        pageNumber: 1,
        title: 'Névoa sobre o Tâmisa',
        sceneSummary: 'Carruagens passando sob lampiões a gás enquanto as badaladas do Big Ben ecoam na noite.',
        prompt: 'Atmospheric Victorian London street at night, gas lamps casting golden halo light through thick fog, horse-drawn hansom cab, silhouette of clock tower in distance.'
      },
      {
        pageNumber: 2,
        title: 'O Gabinete do Investigador',
        sceneSummary: 'Mapas desdobrados sobre a escrivaninha de mogno, lupa de latão e relógio de bolso desmontado.',
        prompt: 'Richly detailed Victorian detective study room, mahogany desk covered in old maps, magnifying glass, antique brass clockwork gears, flickering fireplace light, tea cup.'
      },
      {
        pageNumber: 3,
        title: 'A Biblioteca Secreta',
        sceneSummary: 'Passagem secreta entre estantes colossais de livros de encadernação em couro.',
        prompt: 'Moody mystery illustration of a hidden library door swinging open behind towering bookshelves filled with leather-bound tomes, beam of flashlight revealing dust.'
      },
      {
        pageNumber: 4,
        title: 'A Engrenagem Mestra',
        sceneSummary: 'O confronto final no interior do campanário entre engrenagens de bronze monumentais.',
        prompt: 'Dramatic cinematic illustration inside a giant cathedral clock tower mechanism, massive interlocking bronze gears, beams of moonlight filtering through glass face.'
      },
      {
        pageNumber: 5,
        title: 'O Caso Encerrado',
        sceneSummary: 'O detetive caminhando pela manhã ensolarada de Baker Street com a verdade desvendada.',
        prompt: 'Sunny morning street scene in Victorian London, handsome cobblestone road, gentleman walking with cane and morning paper, sense of triumph and quiet intelligence.'
      }
    ]
  },
  {
    id: 'dinossauros',
    nome: 'Dinossauros & Era Pré-Histórica',
    categoria: 'Infanto-Juvenil & Aventura',
    emoji: '🦖',
    tituloSugerido: 'Gigantes da Terra Perdida',
    subtituloSugerido: 'Aventuras fascinantes no mundo dos répteis do Jurássico',
    autorSugerido: 'Leandro Palmeira',
    estiloVisual: 'Pintura realista vibrante da natureza pré-histórica, vulcões ativos e vegetação jurássica exuberante',
    promptPremissa: 'Uma expedição visual pelo cretáceo e jurássico acompanhando a vida, caça, ninhos e migrações dos maiores dinossauros da história.',
    paginasRoteiro: [
      {
        pageNumber: 1,
        title: 'O Vale dos Braquiossauros',
        sceneSummary: 'Família de gigantes pescoçudos se alimentando das copas das coníferas ao amanhecer.',
        prompt: 'Magnificent prehistoric landscape of Brachiosaurus herd feeding on tall ancient conifers, mist rising from prehistoric marshland, distant steaming volcano, golden sunrise.'
      },
      {
        pageNumber: 2,
        title: 'O Ninho do Tricerátops',
        sceneSummary: 'A mãe tricerátops protegendo os ovos dourados em uma clareira de samambaias gigantes.',
        prompt: 'Heartwarming prehistoric illustration of a mother Triceratops gently nuzzling newly hatched baby dinosaurs in a nest of lush giant cycad fronds and prehistoric flowers.'
      },
      {
        pageNumber: 3,
        title: 'O Voo dos Pterossauros',
        sceneSummary: 'Pteranodontes sobrevoando desfiladeiros costeiros com o oceano azul profundo abaixo.',
        prompt: 'Dramatic aerial perspective of majestic Pteranodons soaring over towering coastal cliffs and crashing ocean waves, prehistoric seabirds in flight, dynamic composition.'
      },
      {
        pageNumber: 4,
        title: 'A Chegada do T-Rex',
        sceneSummary: 'O imponente Tiranossauro Rex observando o vale na orla da floresta tropical.',
        prompt: 'Awe-inspiring realistic painting of a massive Tyrannosaurus Rex stepping through primeval forest foliage, cinematic lighting, dramatic atmospheric depth, award-winning paleoart.'
      },
      {
        pageNumber: 5,
        title: 'O Rio dos Fósseis',
        sceneSummary: 'Paz no vale ao pôr do sol com manadas migratórias bebendo nas margens do grande rio.',
        prompt: 'Serene sunset over prehistoric river basin, mixed herds of gentle duck-billed hadrosaurs and stegosaurs drinking peacefully under dramatic amber sky.'
      }
    ]
  },
  {
    id: 'samurai_japao',
    nome: 'Samurais & O Caminho do Bushido',
    categoria: 'História & Filosofia',
    emoji: '⚔️',
    tituloSugerido: 'A Lâmina da Serenidade',
    subtituloSugerido: 'Contos de honra, disciplina e sabedoria do Japão Feudal',
    autorSugerido: 'Leandro Palmeira',
    estiloVisual: 'Estilo tradicional Sumi-ê refinado com toques de aquarela japonesa e cerejeiras em flor',
    promptPremissa: 'A jornada de um mestre espadachim que descobre que a verdadeira força não reside na lâmina, mas na calma inabalável do espírito.',
    paginasRoteiro: [
      {
        pageNumber: 1,
        title: 'O Templo das Cerejeiras',
        sceneSummary: 'O guerreiro meditando em posição de lótus sob pétalas de cerejeira que caem suavemente.',
        prompt: 'Zen master samurai meditating peacefully under blooming cherry blossom sakura tree in an ancient wooden temple courtyard, petals drifting in soft breeze, fine art sumi-e style.'
      },
      {
        pageNumber: 2,
        title: 'A Travessia do Bambuzal',
        sceneSummary: 'Caminhando em silêncio por um bosque vertical de bambus verdes que tocam o céu.',
        prompt: 'Serene Japanese historical painting of a lone samurai walking along a mossy cobblestone path through a towering emerald green bamboo grove, dappled sunlight.'
      },
      {
        pageNumber: 3,
        title: 'O Duelo do Reflexo',
        sceneSummary: 'Treino de espada sobre pedras ao lado de uma cascata de águas puras.',
        prompt: 'Dynamic yet graceful illustration of a samurai practicing katana forms beside a mountain waterfall, water droplets caught in mid-air, poetic Japanese woodblock print aesthetic.'
      },
      {
        pageNumber: 4,
        title: 'A Cerimônia do Chá',
        sceneSummary: 'A quietude da preparação do matcha em uma casa tradicional de tatame.',
        prompt: 'Warm intimate Japanese tea ceremony scene, steam rising from ceramic matcha bowl, rustic wooden tearoom overlooking a tranquil stone zen rock garden.'
      },
      {
        pageNumber: 5,
        title: 'A Lua Cheia no Monte Fuji',
        sceneSummary: 'O mestre no topo da colina olhando a lua prateada refletir nas neves do monte sagrado.',
        prompt: 'Majestic iconic Japanese painting of Mount Fuji crowned with snow under radiant full moon, lone peaceful traveler watching from hill with pine trees, masterpiece art.'
      }
    ]
  },
  {
    id: 'mindfulness_zen',
    nome: 'Mindfulness & Meditação Zen',
    categoria: 'Autoajuda & Bem-Estar',
    emoji: '🧘',
    tituloSugerido: 'A Quietude da Mente',
    subtituloSugerido: 'Práticas visuais e reflexões para cultivar paz interior e clareza',
    autorSugerido: 'Leandro Palmeira',
    estiloVisual: 'Minimalismo meditativo, tons suaves de verde-musgo, areia e água cristalina, iluminação zen',
    promptPremissa: 'Guia visual poético com meditações guiadas curtas e ilustrações contemplativas para desacelerar a ansiedade e viver o momento presente.',
    paginasRoteiro: [
      {
        pageNumber: 1,
        title: 'O Lago da Presença',
        sceneSummary: 'Água tão calma que reflete o céu azul com perfeição absoluta, sem nenhuma perturbação.',
        prompt: 'Ultra-serene minimalist landscape of a mirror-smooth mountain lake reflecting clear blue sky and soft puffy white clouds, perfect symmetry, tranquility, zen atmosphere.'
      },
      {
        pageNumber: 2,
        title: 'A Respiração Consciente',
        sceneSummary: 'Pedras empilhadas em equilíbrio harmonioso sobre areia desenhada em espirais suaves.',
        prompt: 'Harmonious zen stone cairn balanced perfectly on raked sand garden, single green bamboo shoot with dewdrop, calming spa aesthetic, soft diffused lighting.'
      },
      {
        pageNumber: 3,
        title: 'A Folha no Vento',
        sceneSummary: 'Uma folha dourada flutuando com leveza sobre a corrente suave de um riacho.',
        prompt: 'Poetic close-up illustration of a golden autumn leaf drifting gently on a clear swirling river current, ripple circles, mindful concept of letting go, peaceful.'
      },
      {
        pageNumber: 4,
        title: 'A Chama da Atenção',
        sceneSummary: 'Uma vela acesa iluminando um espaço silencioso de introspecção e acolhimento.',
        prompt: 'Warm soothing still life of a beeswax candle flame glowing gently in a dark rustic meditative room, incense smoke curling in soft spirals, deep warmth and peace.'
      },
      {
        pageNumber: 5,
        title: 'O Horizonte da Clareza',
        sceneSummary: 'O nascer do sol visto do topo de uma montanha suave, dissipando todas as névoas.',
        prompt: 'Inspiring sunrise view from mountain summit, golden warm morning light breaking through purple dawn clouds, vast peaceful open horizon, sense of rebirth and calm.'
      }
    ]
  },
  {
    id: 'culinaria_afetiva',
    nome: 'Confeitaria Artesanal & Culinária Afetiva',
    categoria: 'Gastronomia Ilustrada',
    emoji: '🍰',
    tituloSugerido: 'Caderno de Receitas da Vovó',
    subtituloSugerido: 'Bolos caseiros, pães rústicos e memórias com cheiro de canela',
    autorSugerido: 'Leandro Palmeira',
    estiloVisual: 'Ilustração gastronômica acolhedora em aquarela apetitosa, luz dourada de cozinha rústica',
    promptPremissa: 'Receitas tradicionais ilustradas passo a passo com ingredientes desenhados, pratos finalizados e histórias afetivas de família.',
    paginasRoteiro: [
      {
        pageNumber: 1,
        title: 'O Pão Rústico de Fermentação Natural',
        sceneSummary: 'Pão dourado recém-saído do forno de pedra, farinha espalhada na bancada de madeira.',
        prompt: 'Appetizing rustic sourdough bread with golden crispy crust and flour dusting, sliced on a warm wooden cutting board with wheat stalks and antique knife, cozy kitchen.'
      },
      {
        pageNumber: 2,
        title: 'A Torta de Maçã com Canela',
        sceneSummary: 'Torta trançada borbulhando recheio de maçãs caramelizadas e canela em pau ao lado.',
        prompt: 'Delicious homemade apple pie with woven lattice crust, warm cinnamon sugar caramel glaze, fresh red apples, cinnamon sticks and vintage bowl of heavy cream.'
      },
      {
        pageNumber: 3,
        title: 'O Bolo de Cenoura com Chocolate Cremoso',
        sceneSummary: 'Bolo caseiro fofinho com cobertura espessa e brilhante de brigadeiro escorrendo.',
        prompt: 'Mouthwatering traditional Brazilian carrot cake with decadent thick chocolate ganache dripping down the sides, warm inviting afternoon tea setting, vibrant illustration.'
      },
      {
        pageNumber: 4,
        title: 'Biscoitos Amanteigados & Café Coado',
        sceneSummary: 'Xícara de cerâmica com café fumegante e pote de vidro com biscoitos de baunilha.',
        prompt: 'Charming watercolor of a ceramic mug of steaming fresh coffee next to glass jar overflowing with golden buttery shortbread cookies, linen napkin, cozy morning.'
      },
      {
        pageNumber: 5,
        title: 'A Mesa Farta de Domingo',
        sceneSummary: 'Mesa posta sob uma parreira no jardim com bolos, geléias, flores e frutas frescas.',
        prompt: 'Sunlit rustic outdoor garden table laden with artisanal breads, jams, pastries, fresh berries, and wildflowers under grape vine pergola, joyous family feast mood.'
      }
    ]
  },
  {
    id: 'aventuras_espaciais',
    nome: 'Aventuras no Espaço Sideral',
    categoria: 'Ficção Científica',
    emoji: '🚀',
    tituloSugerido: 'Além das Estrelas de Andrômeda',
    subtituloSugerido: 'O diário de bordo da primeira nave interestelar da Terra',
    autorSugerido: 'Leandro Palmeira',
    estiloVisual: 'Arte espacial épica com nebulosas coloridas, anéis planetários gigantes e naves detalhadas',
    promptPremissa: 'A expedição científica pioneira da nave Órion explorando mundos aquáticos, planetas com anéis de cristal e civilizações cósmicas.',
    paginasRoteiro: [
      {
        pageNumber: 1,
        title: 'Partida da Estação Orbital',
        sceneSummary: 'A grande nave interestelar se desprendendo da base lunar em direção ao espaço profundo.',
        prompt: 'Spectacular sci-fi illustration of a sleek interstellar exploration starship departing an orbital space station above glowing blue Earth, vibrant nebulae in background.'
      },
      {
        pageNumber: 2,
        title: 'O Planeta dos Dois Sóis',
        sceneSummary: 'Pouso suave em um mundo alienígena iluminado por um sol dourado e outro azulado.',
        prompt: 'Alien planet landscape with twin suns shining over crystalline rock formations and bioluminescent violet flora, explorers in space suits taking soil samples.'
      },
      {
        pageNumber: 3,
        title: 'Navegando nos Anéis de Gelo',
        sceneSummary: 'A nave manobrando entre gigantescos fragmentos de gelo reluzente ao redor de um planeta gasoso.',
        prompt: 'Breathtaking space scene of a science vessel flying through vast glistening planetary ice rings orbiting a colossal emerald gas giant, lens flares, cosmic scale.'
      },
      {
        pageNumber: 4,
        title: 'A Cidade Submarina de Oceana',
        sceneSummary: 'Descida no oceano alienígena onde cúpulas submarinas brilham em tons esmeralda.',
        prompt: 'Underwater alien world illustration, research submarine gliding towards a glowing biodome city anchored on a colorful coral trench with bioluminescent sea creatures.'
      },
      {
        pageNumber: 5,
        title: 'O Farol Interestelar',
        sceneSummary: 'O monumento ancestral construído por uma civilização antiga marcando a rota estelar.',
        prompt: 'Awe-inspiring alien beacon monument floating in deep space pulsing with geometric blue light beams, starship approaching in wonder, infinite cosmic beauty.'
      }
    ]
  },
  {
    id: 'animais_filhotes',
    nome: 'Histórias de Ninar & Bichinhos Fofos',
    categoria: 'Infantil Baby',
    emoji: '🐻',
    tituloSugerido: 'Boa Noite, Pequeno Ursinho',
    subtituloSugerido: 'Histórias acolhedoras para a hora de dormir',
    autorSugerido: 'Leandro Palmeira',
    estiloVisual: 'Arte fofa em tons pastéis suaves, personagens fofinhos com olhos brilhantes e traço doce',
    promptPremissa: 'Pequeno Ursinho visita seus amiguinhos na floresta dando boa noite para a lua, para os passarinhos e para o riacho antes de dormir.',
    paginasRoteiro: [
      {
        pageNumber: 1,
        title: 'A Lua no Céu de Algodão',
        sceneSummary: 'Pequeno Ursinho olha pela janela de sua casinha de madeira a lua sorridente no céu azul-noite.',
        prompt: 'Adorable baby teddy bear in cozy pajamas looking out bedroom window at friendly smiling crescent moon among fluffy pastel clouds, gentle bedtime storybook art.'
      },
      {
        pageNumber: 2,
        title: 'Boa Noite, Passarinhos',
        sceneSummary: 'Ursinho passa pelo ninho no galho da cerejeira e sussurra boa noite para os passarinhos dorminhocos.',
        prompt: 'Sweet bedtime illustration of baby bear softly waving goodnight to tiny baby birds cuddled asleep inside a mossy twig nest, twinkling star light, soft watercolor.'
      },
      {
        pageNumber: 3,
        title: 'O Barquinho de Folha',
        sceneSummary: 'Ursinho coloca uma folhinha com flor para navegar devagar no riacho sereno.',
        prompt: 'Gentle storybook scene of baby bear placing a leaf sailboat with a single daisy onto calm water under glowing fireflies, pastel reflections, heartwarming art.'
      },
      {
        pageNumber: 4,
        title: 'O Abraço da Mamãe Ursa',
        sceneSummary: 'Mamãe Ursa embala o pequeno com uma canção de ninar carinhosa em frente à lareira.',
        prompt: 'Tender mother bear hugging her sleepy baby bear in a rocking chair by a warm glowing stone fireplace, knitted blanket, peaceful comforting bedtime aesthetic.'
      },
      {
        pageNumber: 5,
        title: 'No Mundo dos Sonhos',
        sceneSummary: 'Ursinho adormecido em sua caminha fofa sonhando que voa nas nuvens de algodão.',
        prompt: 'Dreamy whimsical illustration of baby bear sound asleep in soft bed dreaming of floating on candy clouds with toy stars, soothing pastel blues and lavenders.'
      }
    ]
  }
];

// Gera mais presets programaticamente para completar mais de 30 opções ricas
const TEMAS_EXTRAS = [
  { id: 'sobrevivencia_bushcraft', nome: 'Sobrevivência na Selva & Bushcraft', emoji: '🏕️', cat: 'Guias & Habilidades' },
  { id: 'piratas_sete_mares', nome: 'Piratas & Tesouros dos Sete Mares', emoji: '🏴‍☠️', cat: 'Aventura' },
  { id: 'grandes_inventores', nome: 'Grandes Inventores da Humanidade', emoji: '💡', cat: 'Biografias' },
  { id: 'criaturas_misticas', nome: 'Enciclopédia de Criaturas Místicas', emoji: '🐉', cat: 'Fantasia' },
  { id: 'folclore_brasileiro', nome: 'Lendas do Folclore Brasileiro', emoji: '🌿', cat: 'Cultura & Contos' },
  { id: 'astronomia_cosmos', nome: 'Astronomia & Mistérios do Cosmos', emoji: '🔭', cat: 'Ciência Ilustrada' },
  { id: 'steampunk_maquinas', nome: 'Contos Steampunk & Dirigíveis', emoji: '⚙️', cat: 'Ficção Alternativa' },
  { id: 'cristais_minerais', nome: 'O Guia dos Cristais & Minerais', emoji: '💎', cat: 'Espiritualidade' },
  { id: 'viagem_tempo', nome: 'Viagem no Tempo & Eras Perdidas', emoji: '⏳', cat: 'Ficção Científica' },
  { id: 'aves_floresta', nome: 'Pássaros & Aves da Floresta Tropical', emoji: '🦜', cat: 'Natureza' },
  { id: 'castelos_medievais', nome: 'Castelos, Cavaleiros & Fortalezas', emoji: '🛡️', cat: 'História' },
  { id: 'filosofia_estoica', nome: 'Meditações Estoicas Ilustradas', emoji: '🏛️', cat: 'Filosofia' },
  { id: 'lideranca_jovens', nome: 'Fábulas Modernas para Jovens Líderes', emoji: '🎯', cat: 'Desenvolvimento' },
  { id: 'aromaterapia_oleos', nome: 'Guia Visual de Aromaterapia', emoji: '🌸', cat: 'Saúde & Bem-Estar' },
  { id: 'horror_gotico', nome: 'Contos Góticos de Mansões Assombradas', emoji: '🕯️', cat: 'Terror Clássico' },
  { id: 'monstros_marinhos', nome: 'Mistérios & Monstros dos Oceanos', emoji: '🐙', cat: 'Mitos Náuticos' },
  { id: 'reino_insetos', nome: 'O Reino Secreto dos Insetos', emoji: '🐝', cat: 'Natureza' },
  { id: 'historias_biblicas', nome: 'Grandes Passagens Bíblicas Ilustradas', emoji: '📖', cat: 'Religião & Espiritualidade' },
  { id: 'artes_marciais_filo', nome: 'O Caminho das Artes Marciais', emoji: '🥋', cat: 'Filosofia' },
  { id: 'herois_esquecidos', nome: 'Heróis Esquecidos da História', emoji: '🎖️', cat: 'História Real' }
];

TEMAS_EXTRAS.forEach((extra, idx) => {
  const num = 13 + idx;
  ILLUSTRATED_BOOK_PRESETS.push({
    id: extra.id,
    nome: extra.nome,
    categoria: extra.cat,
    emoji: extra.emoji,
    tituloSugerido: `${extra.nome.split('&')[0].trim()}: O Livro Definitivo`,
    subtituloSugerido: `Edição Ilustrada KDP com roteiro estruturado e arte visual de alta definição`,
    autorSugerido: 'Leandro Palmeira',
    estiloVisual: 'Ilustração artística editorial de alta resolução para impressão KDP',
    promptPremissa: `Exploração abrangente e narrativa visual de ${extra.nome}, com capítulos bem estruturados, mesmo personagem ou foco narrativo consistente.`,
    paginasRoteiro: [
      {
        pageNumber: 1,
        title: `Capítulo 1: As Origens de ${extra.nome.split('&')[0].trim()}`,
        sceneSummary: `Abertura cênica introduzindo o tema central com iluminação dramática e riqueza de detalhes.`,
        prompt: `Masterpiece book illustration introducing the world of ${extra.nome}, fine editorial art, captivating composition, 8k resolution, no text.`
      },
      {
        pageNumber: 2,
        title: `Capítulo 2: O Primeiro Marco da Jornada`,
        sceneSummary: `Desenvolvimento do conceito com elementos práticos e interação em primeiro plano.`,
        prompt: `Atmospheric chapter illustration for ${extra.nome}, detailed scene with protagonist engaged in discovery, rich background textures, no text.`
      },
      {
        pageNumber: 3,
        title: `Capítulo 3: O Mistério Revelado`,
        sceneSummary: `O ponto alto do enredo onde os segredos ancestrais são desvelados.`,
        prompt: `Cinematic storybook illustration of the key turning point in ${extra.nome}, magical glowing elements, vibrant harmonious palette, no text.`
      },
      {
        pageNumber: 4,
        title: `Capítulo 4: Maestria e Transformação`,
        sceneSummary: `Aplicação prática dos ensinamentos e consolidação do personagem na história.`,
        prompt: `Inspiring book art showcasing wisdom and mastery in ${extra.nome}, golden hour lighting, heroic emotional atmosphere, no text.`
      },
      {
        pageNumber: 5,
        title: `Capítulo 5: O Legado e Conclusão`,
        sceneSummary: `Fechamento inspirador que conecta todas as lições aprendidas pelo leitor.`,
        prompt: `Grand concluding illustration for ${extra.nome}, breathtaking panoramic view, triumphant and serene mood, award-winning book art.`
      }
    ]
  });
});
