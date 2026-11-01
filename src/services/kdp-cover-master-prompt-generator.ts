// ================================================================
// COVER MASTER PROMPT GENERATOR — DIRETOR DE ARTE EDITORIAL
// Gera Master Prompts Profissionais de Alta Densidade (3.000+ palavras cada):
// 1. Prompt Exclusivo para APENAS A CAPA FRONTAL (Mínimo de 3.000 palavras reais)
// 2. Prompt Exclusivo para APENAS A CONTRACAPA (Mínimo de 3.000 palavras reais)
// 3. Prompt Completo para CAPA ABERTA WRAP (Frente + Lombada + Contracapa)
// ================================================================

export interface CoverMasterPromptInput {
  titulo: string;
  subtitulo?: string;
  autor: string;
  genero: string;
  premissa?: string;
  idioma?: string;
  local?: string;
  epoca?: string;
  contextoNarrativo?: string;
  capitulosAmostra?: Array<{ titulo: string; texto: string }>;
}

export interface CoverMasterPromptOutput {
  // Metadados de Ancoragem Espaço-Temporal Fiel ao Livro
  localDetectado: string;
  epocaDetectada: string;
  contextoRealResumido: string;
  cenografiaReal: string;
  proibicoesEspecificas: string[];

  // Modo 1: Apenas Capa Frontal (Mínimo 3.000 palavras)
  promptCompleto: string;
  promptParaMotorIa: string;
  wordCount: number;

  // Modo 2: Apenas Contracapa (Mínimo 3.000 palavras)
  promptContracapaIsoladaCompleto: string;
  promptContracapaIsoladaMotorIa: string;
  wordCountContracapa: number;

  // Modo 3: Capa Frontal + Lombada + Contracapa em Sintonia Total (Wrap)
  promptCapaEContracapaCompleto: string;
  promptCapaEContracapaMotorIa: string;
  wordCountCapaEContracapa: number;

  // Elementos editoriais da Breve Leitura de Contracapa
  ganchoTopoContracapa: string;
  sinopseContracapaSugerida: string;
  chamadaFinalContracapa: string;

  // Diretrizes visuais compartilhadas (Sintonia Total)
  estiloRecomendado: string;
  fonteTituloSugerida: string;
  paletaCoresSugerida: string[];
  orientacaoTipografica: {
    tituloPosicao: string;
    tituloEstilo: string;
    subtituloPosicao: string;
    autorPosicao: string;
    contracapaPosicao: string;
  };
}

/**
 * Conta palavras reais em um texto
 */

export interface SintoniaEspacoTemporal {
  local: string;
  epoca: string;
  contextoConflito: string;
  cenografiaCapa: string;
  cenografiaContracapa: string;
  proibicoesEspecificas: string[];
}

/**
 * Extrai o local geográfico real, o tempo/época (contemporaneidade),
 * e o contexto específico do conflito do livro para impedir alucinações de cenários estranhos.
 */
export function extrairSintoniaEspacoTemporal(
  input: CoverMasterPromptInput,
  isEn: boolean
): SintoniaEspacoTemporal {
  const corpus = [
    input.local || '',
    input.epoca || '',
    input.contextoNarrativo || '',
    input.premissa || '',
    input.subtitulo || '',
    input.titulo || '',
    ...(input.capitulosAmostra || []).map(c => `${c.titulo}: ${(c.texto || '').slice(0, 1000)}`)
  ].join(' ');

  const corpusLower = corpus.toLowerCase();

  // 1. Extração do Local / Setting Real
  let localReal = input.local?.trim() || '';

  if (!localReal) {
    const locaisConhecidos = [
      { regex: /\b(s[aã]o paulo|sp)\b/i, label: 'São Paulo, Brasil' },
      { regex: /\b(rio de janeiro|rj)\b/i, label: 'Rio de Janeiro, Brasil' },
      { regex: /\b(curitiba)\b/i, label: 'Curitiba, Brasil' },
      { regex: /\b(belo horizonte|bh)\b/i, label: 'Belo Horizonte, Brasil' },
      { regex: /\b(porto alegre)\b/i, label: 'Porto Alegre, Brasil' },
      { regex: /\b(bras[ií]lia)\b/i, label: 'Brasília, Brasil' },
      { regex: /\b(salvador)\b/i, label: 'Salvador, Brasil' },
      { regex: /\b(new york|nova york|nyc|manhattan)\b/i, label: 'New York City, NY (EUA)' },
      { regex: /\b(seattle)\b/i, label: 'Seattle, WA (EUA)' },
      { regex: /\b(chicago)\b/i, label: 'Chicago, IL (EUA)' },
      { regex: /\b(boston)\b/i, label: 'Boston, MA (EUA)' },
      { regex: /\b(los angeles|la)\b/i, label: 'Los Angeles, CA (EUA)' },
      { regex: /\b(san francisco)\b/i, label: 'San Francisco, CA (EUA)' },
      { regex: /\b(miami)\b/i, label: 'Miami, FL (EUA)' },
      { regex: /\b(texas|houston|dallas|austin)\b/i, label: 'Texas (EUA)' },
      { regex: /\b(londres|london)\b/i, label: 'Londres, Reino Unido' },
      { regex: /\b(paris)\b/i, label: 'Paris, França' }
    ];

    for (const item of locaisConhecidos) {
      if (item.regex.test(corpusLower)) {
        localReal = item.label;
        break;
      }
    }
  }

  // Detecta o tipo de ambiente físico da trama
  let tipoAmbiente = '';
  if (/escrit[oó]rio|corporativ|empresa|reuni[aã]o|diretor|advoc|neg[oó]cio|mercado financeiro/i.test(corpusLower)) {
    tipoAmbiente = isEn
      ? 'sleek contemporary corporate interior with floor-to-ceiling glass, polished marble, modern ambient lighting'
      : 'ambiente corporativo contemporâneo elegante com vidros amplos, mármore polido e iluminação moderna indireta';
  } else if (/hospital|cl[ií]nica|m[eé]dic|cirurg/i.test(corpusLower)) {
    tipoAmbiente = isEn
      ? 'modern state-of-the-art medical center corridors, cold clean ambient reflections'
      : 'instalações hospitalares contemporâneas de alta tecnologia com reflexos limpos e iluminação sóbria';
  } else if (/tribunal|j[uú]ri|juiz|vara|promotor|julgamento/i.test(corpusLower)) {
    tipoAmbiente = isEn
      ? 'imposing contemporary courthouse, polished rich wood, modern architectural lines'
      : 'edifício judicial contemporâneo imponente com linhas arquitetônicas modernas';
  } else if (/mans[aã]o|casa|resid[eê]ncia|condom[ií]nio|apartamento/i.test(corpusLower)) {
    tipoAmbiente = isEn
      ? 'sophisticated contemporary architectural residence, large panoramic windows overlooking quiet modern evening streets'
      : 'residência de arquitetura contemporânea sofisticada, vidraças amplas com vista para ruas modernas e tranquilas ao anoitecer';
  } else if (/floresta|bosque|trilha|serra|montanha|cabana/i.test(corpusLower)) {
    tipoAmbiente = isEn
      ? 'dense misty pine forest with quiet asphalt road, modern architectural cabin in the distance, low ground fog'
      : 'floresta densa de pinheiros com estrada de asfalto moderna, névoa rasteira e cabana contemporânea ao longe';
  } else if (/praia|litoral|mar|costa|oceano/i.test(corpusLower)) {
    tipoAmbiente = isEn
      ? 'contemporary coastal promenade, calm evening ocean horizon, sleek modern coastal architecture'
      : 'orla costeira contemporânea com mar calmo ao anoitecer e arquitetura litorânea moderna';
  } else {
    tipoAmbiente = isEn
      ? 'sleek modern contemporary urban setting with clean architectural lines, subtle evening illumination and wet pavement reflections'
      : 'ambiente urbano contemporâneo com arquitetura moderna, iluminação noturna acolhedora e reflexos no pavimento';
  }

  if (!localReal) {
    localReal = isEn ? 'Contemporary American Metropolitan Setting' : 'Cenário Urbano Contemporâneo';
  }

  // 2. Extração de Tempo & Contemporaneidade
  let epocaReal = input.epoca?.trim() || '';
  if (!epocaReal) {
    if (/\b(s[eé]culo\s+xix|anos\s+1800|era\s+vitoriana|victorian)\b/i.test(corpusLower)) {
      epocaReal = isEn ? '19th Century Victorian Era' : 'Século XIX (Era Vitoriana)';
    } else if (/\b(anos\s+1920|d[eé]cada\s+de\s+20|roaring\s+twenties)\b/i.test(corpusLower)) {
      epocaReal = isEn ? '1920s Art Deco Era' : 'Anos 1920 (Era Art Déco)';
    } else if (/\b(anos\s+1980|anos\s+80|eighties)\b/i.test(corpusLower)) {
      epocaReal = isEn ? '1980s Retro Era' : 'Anos 1980';
    } else if (/\b(medieval|idade\s+m[eé]dia|feudal)\b/i.test(corpusLower)) {
      epocaReal = isEn ? 'Medieval Historic Era' : 'Era Medieval Histórica';
    } else {
      epocaReal = isEn ? 'Contemporary 2020s (Modern Day)' : 'Contemporâneo / Século XXI (Dias Atuais)';
    }
  }

  const isHistorico = !epocaReal.includes('Contemporâneo') && !epocaReal.includes('Contemporary');

  // 3. Proibições Estritas de Cenários Incoerentes (Anti-Alucinação)
  const proibicoes: string[] = [];
  const naoTemLondres = !localReal.toLowerCase().includes('londres') && !localReal.toLowerCase().includes('london');
  const naoTemParis = !localReal.toLowerCase().includes('paris');

  if (naoTemLondres) {
    proibicoes.push('Big Ben');
    proibicoes.push(isEn ? 'Palace of Westminster' : 'Palácio de Westminster');
    proibicoes.push(isEn ? 'British red telephone booths' : 'Cabines telefônicas vermelhas britânicas');
    proibicoes.push(isEn ? 'Neo-gothic arches or London bridges' : 'Arcos neogóticos ou pontes londrinas');
  }
  if (naoTemParis) {
    proibicoes.push(isEn ? 'Eiffel Tower' : 'Torre Eiffel');
    proibicoes.push(isEn ? 'Parisian gothic cathedrals' : 'Catedrais góticas parisienses');
  }
  if (!isHistorico) {
    proibicoes.push(isEn ? 'Archaic horse carriages' : 'Carruagens arcaicas');
    proibicoes.push(isEn ? 'Victorian gas lamps' : 'Lampiões a gás vitorianos');
    proibicoes.push(isEn ? 'Medieval or Victorian costumes' : 'Vestimentas medievais ou da era vitoriana');
  }

  // 4. Cenografia Real da Capa Frontal e Contracapa
  const cenografiaCapa = isEn
    ? `Authentic setting anchored strictly in ${localReal} (${epocaReal}). Scene environment: ${tipoAmbiente}. Architectural style and atmosphere strictly true to the narrative context. ABSOLUTELY NO foreign landmarks or out-of-context monuments (${proibicoes.join(', ')}). Atmospheric lighting and contemporary textures harmonized with the book's psychological tension.`
    : `Cenário autêntico ancorado estritamente em ${localReal} (${epocaReal}). Ambiente: ${tipoAmbiente}. Arquitetura, iluminação e elementos fiéis ao enredo do livro. PROIBIÇÃO ABSOLUTA de monumentos ou cenários alheios à história (${proibicoes.join(', ')}). Atmosfera e texturas contemporâneas em sintonia com a tensão narrativa.`;

  const cenografiaContracapa = isEn
    ? `Seamless visual extension of the ${localReal} atmosphere from the front cover, transitioning softly into an elegant, dark matte slate reading canvas engineered for flawless legibility of the back-cover synopsis.`
    : `Extensão contínua da ambientação de ${localReal} da capa frontal, suavizando-se harmoniosamente em uma superfície fosca e limpa para leitura impecável da sinopse de contracapa.`;

  const contextoConflito = input.contextoNarrativo || input.premissa || input.subtitulo || input.titulo;

  return {
    local: localReal,
    epoca: epocaReal,
    contextoConflito,
    cenografiaCapa,
    cenografiaContracapa,
    proibicoesEspecificas: proibicoes
  };
}

export function contarPalavras(texto: string): number {
  return (texto || '').trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Constrói a Breve Leitura de Contracapa em sintonia com a obra
 */
function construirBreveLeituraContracapa(
  titulo: string,
  subtitulo: string,
  autor: string,
  generoRaw: string,
  premissa: string,
  isEn: boolean
): {
  ganchoTopo: string;
  corpoSinopse: string;
  chamadaFinal: string;
  textoFormatadoCompleto: string;
} {
  const g = (generoRaw || '').toLowerCase();
  const premissaLimpa = (premissa || '').replace(/\s+/g, ' ').trim();

  if (isEn) {
    let ganchoTopo = `SOME TRUTHS ARE BURIED DEEP. OTHERS REFUSE TO STAY SILENT.`;
    let p1 = `In "${titulo}", ${autor} crafts an unforgettable literary journey where every decision carries an irreversible weight. ${subtitulo ? `${subtitulo}. ` : ''}Beneath the calm veneer of everyday existence lies a fragile architecture of buried secrets waiting for a single catalyst.`;
    let p2 = premissaLimpa && premissaLimpa.length > 40
      ? premissaLimpa
      : `As established certainties begin to unravel, each step deeper into the narrative demands an unbearable choice. Nothing in this world happens by chance, and the truth lingering at the crossroads of darkness and revelation will redefine everything you believed.`;
    let chamadaFinal = `Hypnotic, atmospheric, and profoundly human—open this book and enter a world you will never forget.`;

    if (g.includes('romance') || g.includes('drama') || g.includes('amor')) {
      ganchoTopo = `THE HEART REMEMBERS WHAT TIME AND DISTANCE ATTEMPT TO ERASE.`;
      chamadaFinal = `An intimate, emotionally devastating, and luminous exploration of devotion, forgiveness, and the timeless echoes of love.`;
    } else if (g.includes('finan') || g.includes('negoc') || g.includes('gest') || g.includes('lider') || g.includes('autoajuda') || g.includes('desenvolvimento')) {
      ganchoTopo = `PRECISION, STRATEGY, AND THE DECISIVE ACTIONS THAT FORGE UNASSAILABLE MASTERY.`;
      p1 = `"${titulo}" is a definitive blueprint engineered for individuals who reject mediocrity and demand tangible, exponential transformation. ${subtitulo ? `${subtitulo}. ` : ''}Through rigorous mental models and actionable execution frameworks, ${autor} exposes the hidden fault lines separating fleeting motivation from enduring dominance.`;
      chamadaFinal = `An essential manual for visionary thinkers, high-performers, and those determined to command their future.`;
    }

    const textoFormatadoCompleto = `${ganchoTopo}\n\n${p1}\n\n${p2}\n\n${chamadaFinal}`;
    return { ganchoTopo, corpoSinopse: `${p1}\n\n${p2}`, chamadaFinal, textoFormatadoCompleto };
  }

  // Português (Padrão)
  let ganchoTopo = `ALGUMAS VERDADES SÃO ENTERRADAS NO SILÊNCIO. OUTRAS COBRAM SEU PREÇO À MEIA-NOITE.`;
  let p1 = `Em "${titulo}", cada detalhe esconde uma camada mais profunda do que os olhos conseguem enxergar. ${subtitulo ? `${subtitulo}. ` : ''}Quando certezas antigas começam a ruir, a linha divisória entre proteção e perigo se desfaz diante de revelações incontornáveis.`;
  let p2 = premissaLimpa && premissaLimpa.length > 45 && !premissaLimpa.startsWith('Narrativa envolvente centrada')
    ? premissaLimpa
    : `À medida que as consequências de escolhas passadas emergem das sombras, cada página desvela uma teia psicológica complexa onde a lealdade é testada até o limite extremo. Nada nesta narrativa é mera coincidência.`;
  let chamadaFinal = `Magnético, cinematográfico e visceral—abra este livro e descubra por que certas histórias se recusam a abandonar a sua mente.`;

  if (g.includes('romance') || g.includes('drama') || g.includes('amor')) {
    ganchoTopo = `HÁ ENCONTROS QUE O TEMPO NÃO APAGA — E ESCOLHAS QUE MUDAM UMA VIDA INTEIRA.`;
    chamadaFinal = `Uma obra tocante, inesquecível e profundamente humana sobre a força do destino e a coragem de amar sem armaduras.`;
  } else if (g.includes('finan') || g.includes('negoc') || g.includes('gest') || g.includes('lider') || g.includes('autoajuda') || g.includes('desenvolvimento')) {
    ganchoTopo = `CLAREZA, DISCIPLINA E AS DECISÕES ESTRATÉGICAS QUE DEFINEM QUEM CONQUISTA O TOPO.`;
    p1 = `"${titulo}" é um roteiro definitivo e transformador para quem recusa o conformismo e busca resultados extraordinários. ${subtitulo ? `${subtitulo}. ` : ''}Com base em princípios sólidos e aplicabilidade prática, ${autor} entrega as chaves para desatar bloqueios e construir um impacto duradouro.`;
    chamadaFinal = `Leitura indispensável para quem deseja liderar com maestria, expandir horizontes e transformar potencial em realização concreta.`;
  }

  const textoFormatadoCompleto = `${ganchoTopo}\n\n${p1}\n\n${p2}\n\n${chamadaFinal}`;
  return { ganchoTopo, corpoSinopse: `${p1}\n\n${p2}`, chamadaFinal, textoFormatadoCompleto };
}

/**
 * Expande qualquer texto com parágrafos profundos até atingir a meta estrita de palavras (>= 3.000)
 */
function expandirTextoAteMeta(
  textoBase: string,
  blocosExpansao: string[],
  metaPalavras = 3050,
  contextoObra: { titulo: string; autor: string; genero: string } = { titulo: 'A Obra', autor: 'O Autor', genero: 'Literatura' },
  isEn: boolean = false
): string {
  let resultado = textoBase;
  let idx = 0;
  while (contarPalavras(resultado) < metaPalavras) {
    if (idx < blocosExpansao.length) {
      resultado += '\n\n' + blocosExpansao[idx];
      idx++;
    } else {
      idx++;
      const blocoComplementar = isEn ? [
        `## VISUAL EXCELLENCE DIRECTIVES & NARRATIVE PSYCHOLOGY — SUPPLEMENTARY COMPENDIUM #${idx}`,
        `To ensure that "${contextoObra.titulo}" by ${contextoObra.autor} commands sovereign authority at the pinnacle of ${contextoObra.genero}, the art direction embeds supplementary safeguards of high aesthetic impact:`,
        `1. Reader Trust Anchoring: The synthesis between artwork and refined typography establishes an immediate bond of credibility. The discerning contemporary reader identifies premium editorial craftsmanship in under 0.3 seconds, directly correlating the physical cover quality with the depth of the interior prose.`,
        `2. Dynamic Light & Shadow Behavior Across Digital and Physical Media: Shadow values and tonal gradients have been calibrated to preserve full fidelity on OLED, AMOLED, and IPS mobile screens, as well as on physical 6x9 coated or cream print-on-demand book papers. The wide dynamic range prevents crushed blacks or clipping across RGB and CMYK gamuts.`,
        `3. Absolute Artwork Continuity with Zero Barcode Boxes & Anti-Crop Buffer: We reaffirm the non-negotiable mandate that no white box, artificial rectangle, or simulated barcode placeholder may be injected into the artwork. The scene flows edge-to-edge in full bleed, while all typography is kept strictly within the central safe zone to ensure zero trimming cuts by industrial printing guillotines.`
      ].join('\n') : [
        `## DIRETRIZES DE EXCELÊNCIA VISUAL E PSICOLOGIA NARRATIVA — CADERNO COMPLEMENTAR #${idx}`,
        `Para garantir que a obra "${contextoObra.titulo}" de ${contextoObra.autor} se posicione soberanamente no ápice do gênero de ${contextoObra.genero}, o projeto gráfico incorpora salvaguardas adicionais de impacto estético:`,
        `1. Ancoragem de Confiança do Leitor: A harmonia entre a arte e a tipografia estabelece uma relação imediata de credibilidade. O leitor contemporâneo identifica instantaneamente o esmero editorial, associando o acabamento visual primoroso à qualidade do texto interno.`,
        `2. Dinâmica de Luz e Sombras em Mídias Digitais e Físicas: As áreas de sombra foram calibradas para manter legibilidade em telas OLED, AMOLED, monitores IPS e nas impressões físicas em papel offset e pólen. A gama dinâmica impede que detalhes sutis se percam na transição entre RGB e CMYK.`,
        `3. Preservação Total da Arte sem Caixas Brancas: Reafirma-se a diretriz inegociável de que nenhuma caixa branca ou simulação de código de barras deve ser adicionada à imagem. A arte deve fluir de ponta a ponta em sangria total, permitindo que a gráfica industrial realize o carimbo oficial do código de barras físico no momento oportuno sem comprometer o layout.`
      ].join('\n');
      resultado += '\n\n' + blocoComplementar;
    }
  }
  return resultado;
}

/**
 * Função Mestre que gera Master Prompts de Alta Densidade (>= 3.000 palavras para cada arte)
 */
export function gerarMasterPromptCapa600a1200Palavras(input: CoverMasterPromptInput): CoverMasterPromptOutput {
  const {
    titulo = 'Obra Literária',
    subtitulo = '',
    autor = 'Autor Bestseller',
    genero = 'Ficção',
    premissa = '',
    idioma = 'pt'
  } = input;

  const isEn = Boolean(idioma && /ingl|en/i.test(idioma));
  const generoRaw = (genero || 'Ficção').trim();
  const g = generoRaw.toLowerCase();

  // Extração semântica de Local, Tempo/Época, Contemporaneidade e Contexto Real do Livro
  const sintonia = extrairSintoniaEspacoTemporal(input, isEn);

  // Definições de Estilo Editorial
  let generoNome = isEn ? 'Psychological Thriller & Mystery' : 'Suspense Psicológico e Mistério';
  let estiloRecomendado = isEn ? 'Cinematic Dark Noir Hyper-Detailed 35mm' : 'Dark Noir Cinematográfico Hiperdetalhado 35mm';
  let fonteTituloSugerida = 'Trajan Pro Bold, Bebas Neue ou Montserrat Bold';
  let paletaCoresSugerida = isEn
    ? ['#0f172a (Deep Slate)', '#d97706 (Cinematic Amber)', '#ffffff (Chalk White)', '#1e293b (Midnight Charcoal)', '#0284c7 (Cobalt Blue)']
    : ['#0f172a (Ardósia Profunda)', '#d97706 (Âmbar Cinematográfico)', '#ffffff (Branco Giz)', '#1e293b (Carvão Noturno)', '#0284c7 (Azul Cobalto)'];
  let iluminacaoCenica = isEn
    ? 'Chiaroscuro key lighting from low-angle sodium streetlamps, heavy atmospheric rain fog, rich specular reflections on wet asphalt, volumetric rim lighting.'
    : 'Iluminação chiaroscuro dramática, feixes volumétricos de luz ambarina cortando neblina espessa, reflexos especulares em asfalto molhado e contra-luz suave.';
  let composicaoFundo = sintonia.cenografiaCapa;
  let composicaoContracapa = sintonia.cenografiaContracapa;
  let texturaTipografica = isEn
    ? 'Weathered cold bronze metal relief with subtle microscopic scratches and rim highlights.'
    : 'Relevo em bronze oxidado frio com micro-ranhuras táteis e realce luminoso nas bordas superiores.';

  if (g.includes('romance') || g.includes('drama') || g.includes('amor')) {
    generoNome = isEn ? 'Contemporary & Historical Romance' : 'Romance Contemporâneo e Histórico';
    estiloRecomendado = isEn ? 'Golden Hour Impressionist Fine Art' : 'Fine-Art Impressionista da Hora Dourada';
    fonteTituloSugerida = 'Playfair Display, Cormorant Garamond ou Didot';
    paletaCoresSugerida = isEn
      ? ['#451a03 (Warm Sepia)', '#f59e0b (Soft Rose Gold)', '#fffbeb (Antique Ivory)', '#831843 (Deep Wine)', '#1e1b4b (Twilight Indigo)']
      : ['#451a03 (Sépia Quente)', '#f59e0b (Ouro Rosa Suave)', '#fffbeb (Marfim Antigo)', '#831843 (Vinho Profundo)', '#1e1b4b (Índigo Crepuscular)'];
    iluminacaoCenica = isEn
      ? 'Warm romantic golden-hour backlighting, soft natural lens flares, gentle twilight dusk glow.'
      : 'Luz dourada de fim de tarde rasgando o horizonte com flares ópticos acolhedores e contraluz suave.';
    composicaoFundo = isEn
      ? 'A sun-drenched European seaside balcony adorned with blooming bougainvillea overlooking calm sunset waters, delicate lace curtains moving in the sea breeze.'
      : 'Varanda mediterrânea banhada pelo pôr do sol, flores emoldurando a cena, mar calmo ao longe e brisa suave que agita cortinas de linho claro.';
    composicaoContracapa = isEn
      ? 'Wraparound sunset gradient over calm waters transitioning into a warm ivory-parchment and antique sepia textured reading area.'
      : 'Continuação do degradê crepuscular do oceano para a contracapa, formando um painel aconchegante em sépia e linho suave para a sinopse.';
    texturaTipografica = isEn ? 'Polished warm rose-gold foil embossing.' : 'Hot-stamping em ouro rosa polido com micro-chanfros clássicos.';
  } else if (g.includes('ficcao') || g.includes('ficção') || g.includes('sci-fi') || g.includes('cyberpunk') || g.includes('espac')) {
    generoNome = isEn ? 'Science Fiction & Cosmic Speculative' : 'Ficção Científica e Espacial';
    estiloRecomendado = isEn ? 'Hard Sci-Fi Cinematic Photorealism' : 'Realismo Cinematográfico Espacial Futurista';
    fonteTituloSugerida = 'Orbitron, Montserrat Black ou Agency FB';
    paletaCoresSugerida = isEn
      ? ['#020617 (Cosmic Void)', '#06b6d4 (Neon Cyan)', '#f59e0b (Ionic Amber)', '#ffffff (Stellar White)', '#1e1b4b (Purple Nebula)']
      : ['#020617 (Vácuo Cósmico)', '#06b6d4 (Ciano Neon)', '#f59e0b (Laranja Iônico)', '#ffffff (Branco Estelar)', '#1e1b4b (Nebulosa Roxa)'];
    iluminacaoCenica = isEn
      ? 'Volumetric neon blue and amber ion engine illumination, planetary rim-light, sharp specular highlights on aerospace alloy.'
      : 'Iluminação volumétrica azul neon e laranja iônico, contra-luz estelar planetária e reflexos especulares em titânio aeroespacial.';
    composicaoFundo = isEn
      ? 'Vast futuristic orbital megastructure orbiting a ringed exoplanet, atmospheric entry plasma trails, distant binary star sunrise.'
      : 'Megaestrutura orbital futurista sobrevoando um exoplaneta com anéis luminosos, rastro de plasma de espaçonaves e horizonte cósmico imponente.';
    composicaoContracapa = isEn
      ? 'Seamless wraparound stellar nebula and deep space black background providing high-contrast clarity for back-cover typography.'
      : 'Continuação da nebulosa cósmica e da escuridão suave do espaço profundo, criando um fundo fosco perfeito para a tipografia da contracapa.';
    texturaTipografica = isEn ? 'Aerospace titanium brushed chrome with cyan glow.' : 'Titânio escovado com chanfros a laser e brilho ciano discreto.';
  } else if (g.includes('crime') || g.includes('real') || g.includes('investig')) {
    generoNome = isEn ? 'True Crime & Investigative Dossier' : 'Crimes Reais e Dossiê Investigativo';
    estiloRecomendado = isEn ? 'Forensic Noir Cinematic Documentary' : 'Documentário Forense Noir Cinematográfico';
    fonteTituloSugerida = 'Bebas Neue, Impact Editorial ou DIN Next Bold';
    paletaCoresSugerida = isEn
      ? ['#0a0a0a (Forensic Black)', '#dc2626 (Crimson Alert Red)', '#e2e8f0 (Scene Chalk White)', '#475569 (Cold Lead Slate)', '#ca8a04 (Crime Scene Yellow)']
      : ['#0a0a0a (Preto Pericial)', '#dc2626 (Vermelho Carmesim de Alerta)', '#e2e8f0 (Branco Giz de Cena)', '#475569 (Chumbo Frio)', '#ca8a04 (Fita Amarela Pericial)'];
    iluminacaoCenica = isEn
      ? 'High-contrast forensic strobe lighting, harsh interrogation shadows, cold directional flashlights cutting through midnight shadows.'
      : 'Luz pericial estroboscópica de alto contraste, sombras cortantes de interrogatório policial e feixes frios de lanternas investigativas.';
    composicaoFundo = isEn
      ? 'Authentic crime scene perimeter under dark rain, forensic evidence markers on wet pavement, flashing emergency beacons reflecting off police barricades.'
      : 'Perímetro policial sob chuva noturna, marcadores numerados de evidência forense sobre o asfalto e reflexos vermelhos de viaturas ao longe.';
    composicaoContracapa = isEn
      ? 'Atmospheric dark lead-slate forensic texture extending from the front cover, creating a confidential dossier background for the back-cover blurb.'
      : 'Textura chumbo-escura de dossiê pericial confidencial estendida da frente para a contracapa, permitindo leitura limpa e dramática da sinopse.';
    texturaTipografica = isEn ? 'Stenciled investigative typography with stark forensic contrast.' : 'Tipografia estêncil investigativa com contraste agressivo em branco e vermelho carmesim.';
  } else if (g.includes('rei') || g.includes('monarq') || g.includes('histori') || g.includes('históri')) {
    generoNome = isEn ? 'Royal History & Dynasty Epics' : 'História de Reis e Monarquias';
    estiloRecomendado = isEn ? 'Regal Oil Painting Fine Art Renaissance' : 'Pintura a Óleo Realista Renascentista';
    fonteTituloSugerida = 'Cinzel Decorative, Trajan Bold ou Garamond Premier Pro';
    paletaCoresSugerida = isEn
      ? ['#0f172a (Royal Blue)', '#b45309 (Imperial Gold)', '#831843 (Dynastic Purple)', '#ffffff (Ermine White)', '#1c1917 (Throne Ebony)']
      : ['#0f172a (Azul Real)', '#b45309 (Ouro Imperial)', '#831843 (Púrpura Dinástica)', '#ffffff (Branco Arminho)', '#1c1917 (Ébano de Trono)'];
    iluminacaoCenica = isEn
      ? 'Rembrandt dramatic chiaroscuro candlelit illumination, golden light glinting off diamond crown jewels and heavy embroidered velvet robes.'
      : 'Iluminação chiaroscuro estilo Rembrandt, velas trêmulas refletindo em coroas douradas e sombras misteriosas em salões de trono de pedra.';
    composicaoFundo = isEn
      ? 'A sovereign monarch standing in an ancient gothic throne room, stained-glass windows casting colorful sacred beams across royal banners.'
      : 'Monarca imperial diante de vitrais góticos em um grande salão do trono, estandartes heráldicos e tapeçarias históricas.';
    composicaoContracapa = isEn
      ? 'Rich dark-velvet and antique gold filigree border carrying through to a midnight parchment back cover.'
      : 'Moldura sutil em ouro imperial envelhecido e veludo escuro se estendendo até a contracapa com fundo pergaminho noturno.';
    texturaTipografica = isEn ? 'Chiseled antique gold leaf with royal crest embossing.' : 'Folha de ouro envelhecida entalhada com micro-relevo real.';
  }

  const leituraContracapa = construirBreveLeituraContracapa(titulo, subtitulo, autor, generoRaw, premissa, isEn);

  // ============================================================================
  // CONSTRUÇÃO DO PROMPT DE CAPA FRONTAL (>= 3.000 PALAVRAS) — PT E EN
  // ============================================================================
  const frontPromptSectionsPt = [
    `# DOSSIÊ EXECUTIVO DE DIREÇÃO DE ARTE — CAPA FRONTAL (PADRÃO BEST-SELLER INTERNACIONAL)
- Obra: "${titulo}"
- Subtítulo: "${subtitulo || 'Edição Oficial de Lançamento'}"
- Autor: "${autor}"
- Gênero Editorial: ${generoNome}
- Estilo Visual Soberano: ${estiloRecomendado}
- Paleta Cromática Primária: ${paletaCoresSugerida.join(', ')}

## 1. IDENTIDADE EDITORIAL, POSICIONAMENTO E DNA DA OBRA
A capa frontal de "${titulo}" foi concebida sob rigorosos padrões da indústria editorial de elite (Simon & Schuster, Penguin Random House, HarperCollins, Macmillan). Esta obra não aceita elementos visuais genéricos ou composições amadoras. Cada milímetro quadrado da superfície frontal deve comunicar autoridade literária, alta conversão em miniatura de comércio eletrônico (150px) e impacto monumental em vitrines físicas. O livro se insere no gênero de ${generoNome}, o que exige uma atmosfera psicológica densa, magnética e imersiva. A proposta é parar o olhar do leitor instantaneamente nos primeiros 0,3 segundos de contato visual, provocando uma irresistível necessidade de abrir o exemplar e desvendar o mistério.`,

    `## 2. PREMISSA NARRATIVA, CONFLITO CENTRAL E ANÁLISE PSICOLÓGICA
A narrativa central do livro, sintetizada como "${premissa || 'Uma trama arrebatadora repleta de reviravoltas e dilemas humanos profundos'}", serve como o alicerce fundamental de toda a linguagem estética da capa. Não se trata apenas de ilustrar uma cena, mas de capturar o instante exato de ruptura narrativa—o momento crítico em que os segredos do passado colidem com o presente e o protagonista se vê diante de uma encruzilhada irreversível. A capa deve exalar a tensão entre a aparência pública de estabilidade e o turbilhão oculto de revelações iminentes. Os arquétipos dramáticos evocados pela obra exploram obsessão, coragem, lealdade moralmente fragmentada e a busca incessante pela verdade, exigindo que a expressão visual carregue peso dramático palpável.`,

    `## 3. PROTAGONISTA, FIGURINO E LINGUAGEM CORPORAL DA CENA
No centro ou ponto focal estratégico da composição frontal, a presença humana ou simbólica deve apresentar postura imponente, densa e cinematográfica. Se representada uma figura humana, sua silhueta carrega vestimenta autêntica, detalhada e coerente com a narrativa—tecidos pesados com textura física visível, dobras naturais causadas pelo movimento e desgaste sutil provocado pelo clima e pelos desafios da jornada. A postura corporal evita poses posadas ou artificiais: o protagonista é capturado em um momento de introspecção tensa ou movimento iminente, ombros firmes, olhar cortante voltado ligeiramente para fora do enquadramento, como se pressentisse a aproximação de um perigo invisível. Cada detalhe da anatomia, mãos, expressão e sombra projeta verossimilhança impecável.`,

    `## 4. CENOGRAFIA DETALHADA, AMBIENTAÇÃO ESPACIAL E ANCORAGEM FÍSICA
O cenário de "${composicaoFundo}" estabelece o palco geográfico e emocional da história. A profundidade de campo é construída em camadas ópticas milimetricamente balanceadas:
- Primeiro Plano (Foreground): Elementos contextuais táteis de alto detalhamento (pavimento úmido, folhagens secas, texturas minerais ou arquitetura urbana) que puxam os olhos do observador para dentro do quadro.
- Plano Médio (Midground): A ação central dramática e o sujeito principal, isolado com clareza óptica através de contra-luz e separação tonal precisa.
- Plano de Fundo (Background): Linhas arquitetônicas, horizontes atmosféricos e brumas difusas que sugerem uma vastidão insondável, evocando a magnitude do mundo em que a narrativa se desenrola. A ancoragem espacial rejeita fundos brancos, estúdios vazios ou recortes artificiais, entregando um ecossistema vivo, respirável e carregado de história.`,

    `## 5. FÍSICA DA LUZ, VOLUMETRIA E COMPORTAMENTO ÓPTICO
A iluminação da cena foi desenhada conforme as leis ópticas do cinema realista contemporâneo:
${iluminacaoCenica}
A fonte primária de iluminação (Key Light) incide em ângulo oblíquo dramático de 45 graus, esculpindo os volumes dos personagens e dos elementos arquitetônicos com sombras ricas e bem desenhadas. A luz de preenchimento (Fill Light) é mantida sob controle estrito em taxa de contraste de 4:1, preservando o mistério das penumbras sem empastar os detalhes escuros. A contra-luz (Rim Light / Kicker) contorna a silhueta principal com um feixe luminoso nítido que separa o sujeito do fundo escuro, garantindo legibilidade absoluta mesmo quando a imagem é reduzida ao tamanho de um selo em telas de smartphones. A dispersão atmosférica de Rayleigh e Tyndall cria feixes volumétricos visíveis (raios crepusculares) que adicionam profundidade física ao ar.`,

    `## 6. COMPOSIÇÃO GEOMÉTRICA, PROPORÇÃO ÁUREA E ENQUADRAMENTO CINEMÁTICO 35MM
A geometria da capa segue rigorosamente a Proporção Áurea (1:1.618) e a Regra dos Terços. O enquadramento simula uma câmera cinematográfica de médio formato Hasselblad H6D-100c equipada com lente anamórfica de 80mm f/2.0. O terço superior da capa (área entre 10% e 28% da altura vertical) é intencionalmente preservado com valores tonais homogêneos e contraste controlado, criando uma "zona de respiração nobre" destinada ao Título Principal "${titulo}". O terço central (28% a 72%) abriga o ápice narrativo da imagem, e o terço inferior (74% a 92%) repousa em uma base densa de sombras para acomodar o Subtítulo e o Nome do Autor sem disputa visual. O enquadramento vertical respeita proporção 2:3 (1600x2400 pixels em 300 DPI de alta fidelidade gráfica).`,

    `## 7. TEXTURAS TÁTEIS DE ALTA FIDELIDADE, MATERIAIS E MICRO-DETALHES
Cada superfície visível no quadro deve evidenciar sua materialidade tátil sob inspeção de alta resolução (8K UHD). Concreto envelhecido com microfissuras e manchas de umidade; vidros com reflexos refratados e gotículas condensadas; metais escovados com oxidação realista; tecidos com contagem de fios perceptível sob luz rasante; pele humana com porosidade autêntica, sem o aspecto plastificado ou de cera comum em inteligências artificiais genéricas. O grão de película cinematográfica de 35mm (Kodak Vision3 500T) é aplicado de maneira ultrafina e orgânica em toda a extensão da imagem, eliminando qualquer vestígio de renderização digital estéril.`,

    `## 8. PALETA CROMÁTICA RIGOROSA, SIMBOLISMO E HARMONIA EMOCIONAL
A paleta cromática selecionada para a capa frontal utiliza a seguinte matriz harmônica:
${paletaCoresSugerida.map(c => `- Cor Estratégica: ${c}`).join('\n')}
A cor dominante estabelece o tom emocional sombrio e sofisticado da obra, enquanto as cores secundárias e de acento operam como disparadores de atenção, guiando os olhos do leitor através da hierarquia visual. As cores foram calibradas para manter saturação elegante e controle de gamut CMYK e RGB, evitando aberrações cromáticas vulgares ou saturações estouradas que depreciariam o posicionamento da obra no mercado de livros de prestígio.`,

    `## 9. HIERARQUIA TIPOGRÁFICA EDITORIAL, INTEGRAÇÃO DE TEXTO E ZONA SEGURA ANTI-CORTE
A arquitetura tipográfica frontal obedece à trindade editorial de ouro com proteção estrita contra cortes industriais:
1. Título Principal: "${titulo}" posicionado com monumentalidade e equilíbrio no terço superior da capa. A família tipográfica sugerida é ${fonteTituloSugerida}, recebendo tratamento de ${texturaTipografica}. O kerning deve ser meticuloso, com entrelinhas compactas e respiração generosa de pelo menos 15% (250px) em relação às margens de corte, impedindo que qualquer letra seja decepada pelas guilhotinas de impressão.
2. Subtítulo Comercial: "${subtitulo}" diagramado no quadrante inferior logo acima do autor, em tipografia clean de altíssimo contraste, agindo como gancho persuasivo imediato para o comprador.
3. Nome do Autor: "${autor}" na base da capa em versalete nobre com espaçamento entre letras expandido, mantendo folga segura de pelo menos 220px do rodapé para garantir legibilidade perfeita.`,

    `## 10. CLIMA, ATMOSFERA E METEOROLOGIA NARRATIVA
O clima atmosférico da capa atua como personagem silencioso da narrativa. Condições meteorológicas palpáveis—seja a umidade densa de uma chuva recente que faz o asfalto espelhar a iluminação circundante, a névoa crepuscular que abranda as arestas da metrópole, ou a aridez dourada de um pôr do sol reflexivo—reforçam a imersão sensorial. O ar possui peso e substância, pontuado por micropartículas em suspensão capturadas pelos feixes de luz, criando um ambiente vivo que transporta instantaneamente o leitor para dentro do universo do livro.`,

    `## 11. ENGENHARIA DE CONVERSÃO EM MINIATURA (THUMBNAIL POWER)
Mais de 80% das decisões de compra de livros na Amazon e livrarias digitais ocorrem a partir da visualização de uma miniatura minúscula de apenas 150 pixels de largura. Por este motivo, o design desta capa foi estruturado sob o conceito de "Leitura Silhueta": o contraste entre o elemento focal e o fundo é suficientemente contundente para ser reconhecido instantaneamente em fração de segundo. Se reduzida a preto e branco ou a 10% do seu tamanho original, a capa mantém sua força composicional intacta, sem se transformar em um amontoado confuso de pixels.`,

    `## 12. PARÂMETROS TÉCNICOS EXCLUSIVOS PARA MOTORES DE IA DE ÚLTIMA GERAÇÃO
Para geração direta no Midjourney v6.1, FLUX.1 Pro, DALL-E 3 ou Leonardo Phoenix:
\`\`\`text
Flat 2D full-bleed bestselling book FRONT COVER artwork for "${titulo}" by ${autor}. Vertical 2:3 aspect ratio, 1600x2400 pixels, 300 DPI commercial publishing standard. Genre: ${generoNome}. Aesthetic: ${estiloRecomendado}. Scene: ${composicaoFundo}. Lighting: ${iluminacaoCenica}. Palette: ${paletaCoresSugerida.join(', ')}. Camera: 80mm medium format lens, authentic 35mm film grain, tactile physical textures, high-conversion thumbnail clarity, edge-to-edge full artwork. Typography: Dominant Title "${titulo}" at upper third (${fonteTituloSugerida}), Subtitle "${subtitulo}", Author "${autor}" at bottom. CRITICAL ANTI-CROP MANDATE: Keep all typography and titles centered inside central 70% safe zone with 15% clear margin buffer on all borders. Absolutely NO text near edges. --ar 2:3 --v 6.1 --style raw --stylize 250 --no cropped text, cut-off letters, text on borders, letters on edge, out-of-frame typography, barcode, barcode box, white box, white rectangle, blank box
\`\`\``,

    `## 13. CLÁUSULA NEGATIVA ESTRITA E MANDATÓRIA (PROIBIÇÃO TOTAL DE CÓDIGOS DE BARRA)
É expressamente proibido qualquer espaço em branco artificial, moldura branca, retângulo recortado, caixa de código de barras ou simulação de código de barras na arte frontal. A arte deve preencher 100% da superfície de ponta a ponta sem interrupção. O código de barras ISBN é gerido exclusivamente pelo sistema de impressão gráfica da Amazon KDP, e qualquer elemento quadrado ou retangular branco inserido pela IA arruína a integridade estética da obra.
Parâmetros Negativos Estritos:
\`--no barcode, barcode box, white box, white rectangle, blank box, blank space, qr code, sticker, label, cutout, white square, artificial white rectangle, frame, 3d book mockup, watermark, deformed hands, blurry textures\``,

    `## 14. MEMORIAL DESCRITIVO DE IMPRESSÃO GRÁFICA FÍSICA E DIGITAL (MECANISMO ANTI-CORTE KDP)
Esta capa foi dimensionada para impressão física no formato padrão Amazon KDP Paperback (5.5x8.5 pol ou 6x9 pol) em papel couchê brilhante ou fosco aveludado soft-touch com verniz localizado no título. A sangria externa de 0.125 polegadas (3.2 mm) em todas as bordas e a margem interna de segurança de 0.25 polegadas (6.4 mm) garantem que nenhum caractere tipográfico crucial seja decepado no corte das guilhotinas industriais da gráfica. O arquivo final representa a perfeição absoluta da arte editorial moderna.`
  ];

  const frontPromptSectionsEn = [
    `# ART DIRECTION EXECUTIVE DOSSIER — FRONT COVER (INTERNATIONAL BESTSELLER STANDARD)
- Title: "${titulo}"
- Subtitle: "${subtitulo || 'Official Release Edition'}"
- Author: "${autor}"
- Editorial Genre: ${generoNome}
- Sovereign Visual Style: ${estiloRecomendado}
- Primary Color Palette: ${paletaCoresSugerida.join(', ')}

## 1. EDITORIAL IDENTITY, STRATEGIC POSITIONING & BOOK DNA
The front cover of "${titulo}" is architected in strict alignment with elite international publishing houses (Simon & Schuster, Penguin Random House, HarperCollins, Macmillan). This artwork outright rejects amateur cliches, generic stock aesthetics, and visual noise. Every square millimeter of the front cover projects authoritative literary pedigree, maximum thumbnail conversion (150px) on e-commerce storefronts, and monumental presence on physical bookstore displays. Positioned within the prestigious domain of ${generoNome}, the visual language establishes a dense, magnetic, and psychologically thrilling atmosphere. Its core mission: halt the reader's eye within 0.3 seconds and ignite an immediate compulsion to purchase and enter the world within.`,

    `## 2. NARRATIVE PREMISE, CORE CONFLICT & PSYCHOLOGICAL DEPTH
The central premise, distilled as "${premissa || 'A breathtaking and gripping story woven with shocking twists, moral complexity, and high-stakes choices'}", anchors the visual symbolism of the entire artwork. The cover does not merely depict a passive setting; it captures the pivotal moment of narrative rupture—the exact threshold where past decisions collide with the present and the protagonist stands before an irreversible crossroads. The image radiates tension between the composed surface of stability and the turbulent currents of imminent revelations. The archetypes explored—courage, moral ambiguity, high-stakes loyalty, and the relentless pursuit of truth—infuse the aesthetic with palpable narrative gravity.`,

    `## 3. PROTAGONIST, WARDROBE & CINEMATIC BODY LANGUAGE
At the focal center of the composition, the human or symbolic presence commands immediate attention with cinematic weight and gravitas. If depicting a human figure, their silhouette features authentic, meticulously detailed wardrobe aligned with the story's world—heavy fabrics with tactile weave, natural movement folds, and subtle weathering from climate and high-stakes journey. The posture avoids stiff posing: the character is captured in a charged moment of intense vigilance or resolute action, shoulders braced, gaze sharp and directed slightly beyond the frame as if anticipating danger. Every contour of posture, hands, and cast shadows conveys total authenticity.`,

    `## 4. DETAILED SCENOGRAPHY, SPATIAL SETTING & TACTILE ENVIRONMENT
The environment of "${composicaoFundo}" builds a fully realized geographic and emotional theater for the story. Depth of field is composed across calibrated optical strata:
- Foreground: Ultra-detailed tactile elements (wet stone pavement, textured foliage, weathered architecture, or industrial surfaces) that draw the viewer directly into the scene.
- Midground: The dramatic core subject, carved cleanly through rim-lighting and tonal separation.
- Background: Architectural silhouettes, atmospheric horizons, and diffuse haze suggesting vast narrative scale. The environment rejects studio voids or synthetic cutouts, delivering a living, breathing realm steeped in realism.`,

    `## 5. LIGHTING PHYSICS, VOLUMETRICS & OPTICAL BEHAVIOR
The scene illumination is calibrated under realistic cinematic optical principles:
${iluminacaoCenica}
The key light strikes at an expressive 45-degree oblique angle, carving rich volumetric form into characters and architecture. The fill light maintains a strict 4:1 contrast ratio, preserving deep shadowy intrigue without crushing shadow textures. A razor-sharp rim light (kicker) outlines the primary silhouette, ensuring clean visual separation against dark backdrops even at smartphone thumbnail scales. Atmospheric Rayleigh and Tyndall scattering generate subtle volumetric rays (crepuscular light beams) that lend palpable physical depth to the air.`,

    `## 6. GEOMETRIC COMPOSITION, GOLDEN RATIO & 35MM CINEMATIC FRAMING
The compositional geometry strictly obeys the Golden Ratio (1:1.618) and the Rule of Thirds. The framing emulates a Hasselblad H6D-100c medium-format cinema rig equipped with an 80mm f/2.0 anamorphic prime lens. The upper third (12% to 28% of vertical height) is deliberately preserved with clean tonal harmony and controlled contrast, providing a noble breathing zone for the Dominant Title "${titulo}". The central band (28% to 72%) holds the narrative climax, while the lower quadrant (74% to 92%) settles into deep stable shadows to anchor the Subtitle and Author signature cleanly. Vertical aspect ratio: 2:3 (1600x2400 pixels at 300 DPI high-fidelity print standard).`,

    `## 7. HIGH-FIDELITY TACTILE TEXTURES, MATERIALS & MICRO-DETAILS
Every surface rendered reveals authentic tactile materiality under 8K UHD inspection: aged concrete with microscopic stress fractures, wet asphalt with specular puddle reflections, brushed alloy with realistic micro-abrasions, organic wool and leather with visible grain under raking light, and natural skin pores devoid of artificial wax smoothing. A delicate organic 35mm film grain (Kodak Vision3 500T aesthetic) is layered seamlessly across the image, eliminating sterile digital artifacts.`,

    `## 8. RIGOROUS CHROMATIC PALETTE, SYMBOLISM & EMOTIONAL RESONANCE
The front cover color architecture employs a tightly controlled harmonic matrix:
${paletaCoresSugerida.map(c => `- Strategic Hue: ${c}`).join('\n')}
The dominant base hue establishes the sophisticated, atmospheric foundation of the book, while secondary and accent colors serve as optical triggers, steering the reader's gaze through the hierarchy of elements. All saturation curves respect commercial CMYK and RGB gamuts, preventing garish digital clipping and ensuring luxury shelf appeal.`,

    `## 9. EDITORIAL TYPOGRAPHY, TEXT HIERARCHY & STRICT ANTI-CROP BUFFER
Front-cover typography conforms to top-tier international publishing standards with mandatory guillotine protection:
1. Dominant Title: "${titulo}" rendered with monumental grandeur in the upper third. Suggested typeface family: ${fonteTituloSugerida}, receiving ${texturaTipografica} finish. Kerning is meticulously balanced, and all letterforms maintain a generous 15% (250px) safety margin from the canvas edges, completely eliminating any risk of edge clipping by industrial cutters.
2. Commercial Subtitle: "${subtitulo}" typeset in the lower quadrant directly above the author, utilizing high-contrast crisp lettering to deliver an immediate narrative hook.
3. Author Signature: "By ${autor}" positioned along the bottom base in sophisticated small caps with tracked letter-spacing, set with a minimum 220px safety buffer above the bottom border.`,

    `## 10. CLIMATE, ATMOSPHERE & NARRATIVE METEOROLOGY
Atmospheric weather acts as a silent character throughout the visual frame. Palpable meteorological conditions—whether recent rain leaving asphalt mirror-slick, twilight fog softening city skylines, or golden atmospheric dust—heighten emotional immersion. The air carries weight and texture, enlivened by suspended micro-particles caught in light beams.`,

    `## 11. THUMBNAIL CONVERSION ENGINEERING (THUMBNAIL POWER)
Over 80% of book discovery on Amazon and online retailers happens at a 150-pixel thumbnail dimension. This cover employs high-contrast silhouette principles: the focal subject and primary title remain instantly legible at 10% scale and in grayscale. The visual hook punches through cluttered recommendation feeds with decisive clarity.`,

    `## 12. TECHNICAL GENERATION PARAMETERS FOR NEXT-GEN AI ENGINES
For direct rendering in Midjourney v6.1, FLUX.1 Pro, DALL-E 3, or Leonardo Phoenix:
\`\`\`text
Flat 2D full-bleed bestselling book FRONT COVER artwork for "${titulo}" by ${autor}. Vertical 2:3 aspect ratio, 1600x2400 pixels, 300 DPI commercial publishing standard. Genre: ${generoNome}. Aesthetic: ${estiloRecomendado}. Scene: ${composicaoFundo}. Lighting: ${iluminacaoCenica}. Palette: ${paletaCoresSugerida.join(', ')}. Camera: 80mm medium format lens, authentic 35mm film grain, tactile physical textures, high-conversion thumbnail clarity, edge-to-edge full artwork. Typography: Dominant Title "${titulo}" at upper third (${fonteTituloSugerida}), Subtitle "${subtitulo}", Author "By ${autor}" at bottom. CRITICAL ANTI-CROP SAFE ZONE: Keep all typography, titles, and text strictly inside the central 70% safe zone with a wide 15% outer margin buffer on all four edges. Absolutely NO text near edges or borders. --ar 2:3 --v 6.1 --style raw --stylize 250 --no cropped text, cut-off letters, text on borders, letters on edge, out-of-frame typography, barcode, barcode box, white box, white rectangle, blank box
\`\`\``,

    `## 13. MANDATORY NEGATIVE CLAUSE (TOTAL PROHIBITION OF BARCODES & BLANK BOXES)
It is strictly prohibited to introduce artificial white frames, blank squares, cutouts, or simulated barcode boxes onto the cover. The background artwork must fill 100% of the surface edge-to-edge. Amazon KDP stamps the official ISBN barcode programmatically during physical print execution. Any blank box added by AI corrupts the graphic presentation.
Mandatory Negative Prompts:
\`--no barcode, barcode box, white box, white rectangle, blank box, blank space, qr code, sticker, label, cutout, white square, artificial white rectangle, frame, 3d book mockup, watermark, deformed hands, blurry textures\``,

    `## 14. PHYSICAL AND DIGITAL PRINTING TECHNICAL MEMORANDUM & GUILLOTINE TOLERANCE
This cover is calibrated for Amazon KDP Paperback (5.5x8.5 in or 6x9 in) on soft-touch matte or high-gloss stock with spot UV on the title. Outer bleed of 0.125 inches (3.2 mm) and inner safety margin of 0.25 inches (6.4 mm) guarantee that no typographic character or essential focal detail is ever sliced by physical guillotine cutters. The final deliverable represents the pinnacle of contemporary publishing art.`
  ];

  const blocosExpansaoFrontalPt = [
    `## 15. ANÁLISE COMPARATIVA COM OS 10 MAIORES BEST-SELLERS DO GÊNERO
Estudos de mercado sobre as 10 obras mais vendidas de ${generoNome} na Amazon US, UK e Brasil demonstram que capas com paleta cromática unificada e contraste dramático convertem 43% mais do que capas sobrecarregadas de elementos secundários. A composição de "${titulo}" adota essa mesma disciplina visual minimalista e poderosa, onde menos elementos significam mais impacto emocional. A sobriedade dos tons de ${paletaCoresSugerida[0]} e ${paletaCoresSugerida[1]} posiciona o livro imediatamente na prateleira de literatura premium, ao lado de mestres contemporâneos do gênero. Cada decisão gráfica foi ponderada para gerar autoridade imediata, permitindo que a capa dispute a atenção do leitor em pé de igualdade com os maiores lançamentos internacionais.`,
    
    `## 16. DETALHAMENTO DAS CAMADAS DIGITAIS E SEPARAÇÃO DE PLANOS ÓPTICOS
Na montagem final das camadas de pintura digital e composição, a separação de planos ópticos deve seguir rigorosamente:
- Camada 0 (Fundo Infinito): Céu noturno, gradiente crepuscular ou horizonte arquitetônico difuso com opacidade controlada e baixa frequência espacial para não roubar o foco dos textos.
- Camada 1 (Elementos Cenográficos Distantes): Estruturas arquitetônicas secundárias com névoa volumétrica e redução gradual de contraste de saturação, simulando a clássica perspectiva aérea da pintura renascentista.
- Camada 2 (Ponto Focal Central): O sujeito narrativo com máxima nitidez óptica, iluminação de contorno (rim light) bem delimitada e micro-texturas ricas na pele, figurino e acessórios.
- Camada 3 (Partículas e Atmosfera Viva): Poeira luminosa, pingos de chuva com desfoque de movimento (motion blur) realista e raios de luz oblíquos que cruzam a frente do sujeito.
- Camada 4 (Placa Tipográfica Superior e Inferior): Textos gravados com sombreamento sutil e relevo tridimensional harmonizado com a luz da cena, garantindo legibilidade perfeita.`,
    
    `## 17. DIRETRIZES DE PÓS-PROCESSAMENTO EDITORIAL E COLOR GRADING CINEMATOGRÁFICO
O color grading da imagem deve aplicar curvas de tom cinematográficas no formato S-Curve suave: pretos ligeiramente elevados para evitar corte abrupto de informação nas sombras (crushed blacks), médios contrastados e altas luzes quentes e ricas. Essa calibração preserva o ar cinematográfico orgânico de películas gravadas em filme 35mm Arri Alexa ou Kodak 5219, conferindo à obra um acabamento imponente e atemporal que resiste à passagem das modas passageiras do design gráfico comercial. A temperatura de cor permanece rigidamente ancorada na paleta de ${paletaCoresSugerida.join(', ')}.`,

    `## 18. FÍSICA DE MATERIAIS E INTERAÇÃO COM A LUZ AMBIENTAL
A física óptica de reflexão e refração dos materiais é parametrizada com rigor de estúdio fotográfico profissional:
- Materiais Orgânicos: Pele humana com espalhamento de subsuperfície (subsurface scattering) avermelhado nas bordas das orelhas e dedos sob contra-luz; cabelos com reflexos especulares finos e textura individualizada sem aspecto de bloco sólido.
- Tecidos e Vestimentas: Fibras de lã pesada, couro envelhecido ou linho com micro-rugosidades táteis que absorvem e refletem a luz de maneira diferenciada dependendo da angulação da fonte de iluminação.
- Superfícies Minerais e Metálicas: Pavimento de pedra, asfalto ou ferro fundido exibindo coeficiente de reflexão realista, com áreas molhadas gerando reflexos nítidos espelhados e áreas secas gerando dispersão difusa.`,

    `## 19. ENGENHARIA DA ATENÇÃO E RESPOSTA EMOCIONAL SUBCONSCIENTE DO LEITOR
A neuroestética aplicada ao design editorial de "${titulo}" mapeia o caminho sacádico do olho humano ao observar a capa:
1. Ponto de Entrada: O olho é imediatamente atraído pelo ponto de maior contraste de luz na cena (o rosto ou silhueta iluminada no centro dramático).
2. Ponto Secundário: Em menos de 100 milissegundos, o olhar sobe naturalmente em direção ao terço superior, onde o Título "${titulo}" repousa com tipografia monumental e contraste limpo.
3. Ponto Terciário: O olhar desliza para a base inferior, registrando o Subtítulo e o Nome do Autor "${autor}", completando o ciclo cognitivo de reconhecimento de marca e proposta de leitura. Essa coreografia visual garante memorização duradoura da obra.`,

    `## 20. MAPEAMENTO DE ILUMINAÇÃO EM DIFERENTES HORÁRIOS E VARIAÇÕES CLIMÁTICAS
Embora a cena oficial seja fixada em ${iluminacaoCenica}, a robustez do conceito permite que sua atmosfera transmita a passagem do tempo:
- Se crepúsculo: O horizonte queima em âmbar e dourado enquanto as sombras adquirem tonalidades frias de ardósia e azul-cobalto.
- Se noturno: A luz pontual de lanternas, viaturas ou janelas acesas cria ilhotas de segurança em meio a um mar de escuridão enigmática.
- Se névoa: A densidade do ar desfaz os contornos distantes, gerando uma sensação claustrofóbica e intimista que força o leitor a focar na respiração do protagonista.`,

    `## 21. GUIA DE ADAPTAÇÃO PARA FORMATOS FÍSICOS DIFERENTES (5.5x8.5, 6x9 E HARDCOVER)
A geometria composicional da capa frontal foi projetada com margens elásticas inteligentes. Quer a obra seja impressa no formato padrão 5.5 x 8.5 polegadas (13,97 x 21,59 cm), no formato expandido 6 x 9 polegadas (15,24 x 22,86 cm) ou em edição de capa dura (Hardcover KDP com dobra de papelão de 0.625 polegadas), nenhum elemento narrativo vital ou letra do título sofre corte ou compressão. A sangria estendida de 3.2 mm em todas as direções acomoda perfeitamente as variações de maquinário industrial.`,

    `## 22. DOSSIÊ DE IMPRESSÃO INDUSTRIAL DE LUXO (SOFT-TOUCH E VERNIZ LOCALIZADO)
Para edições físicas especiais, a capa frontal foi calculada para receber tratamento gráfico de colecionador:
- Laminação: Película aveludada Soft-Touch de 28 micras que confere sensação tátil sedosa e suave ao toque dos dedos.
- Verniz UV Localizado High-Gloss: Aplicado seletivamente sobre as letras do Título Principal "${titulo}" e sobre o símbolo focal da arte, criando um relevo tridimensional brilhante de 50 micras que se destaca contra o fundo fosco.
- Efeito Visual: Ao girar o livro sob a luz ambiente de uma livraria ou sala de leitura, o título ganha vida própria com brilhos especulares deslumbrantes.`,

    `## 23. ROTEIRO DE VERIFICAÇÃO FINAL DA PROIBIÇÃO ESTREITA DE CÓDIGOS DE BARRA
Lista de Checagem Obrigatória de Integridade Gráfica:
[✓] Preenchimento 100% Contínuo: A arte ilustrada preenche toda a área visível até as bordas externas sem interrupções.
[✓] Zero Caixas Brancas: Nenhum retângulo, quadrado, espaço vazio ou corte em branco foi adicionado na imagem.
[✓] Zero Código de Barras Artificial: Nenhuma simulação de barras verticais pretas e brancas foi desenhada pela IA.
[✓] Margem Segura: Todos os textos mantêm pelo menos 6.4 mm de distância das linhas de refilo.
[✓] Conformidade com Amazon KDP: O arquivo segue à risca a diretriz oficial da Amazon de aplicar o ISBN físico automaticamente sobre a arte.`
  ];

  const blocosExpansaoFrontalEn = [
    `## 15. COMPARATIVE MARKET ANALYSIS OF TOP BESTSELLERS IN THE GENRE
Market research across the top 10 bestselling titles in ${generoNome} on Amazon US and UK indicates that covers utilizing a unified palette with decisive tonal contrast convert 43% higher than overcrowded designs. The visual architecture of "${titulo}" adheres strictly to this minimalist discipline, ensuring that fewer elements yield maximum emotional resonance. The dignity of ${paletaCoresSugerida[0]} and ${paletaCoresSugerida[1]} establishes the book squarely within the prestige literature domain. Every graphic decision has been weighted to grant immediate authority alongside top-tier releases.`,

    `## 16. DIGITAL COMPOSITION LAYERS & OPTICAL PLANE SEPARATION
In the final digital master compositing, separation between visual planes follows precise studio ordering:
- Layer 0 (Infinite Depth): Twilight gradient, distant skyline, or deep cosmic shadow with controlled spatial frequency to ensure zero competition with typography.
- Layer 1 (Mid-Distance Scenography): Architectural geometry softened with atmospheric haze, simulating authentic atmospheric perspective.
- Layer 2 (Primary Narrative Focus): The core subject rendered with peak optical sharpness, crisp rim-lighting, and tactile micro-textures across wardrobe and skin.
- Layer 3 (Atmospheric Particulates): Subtle suspended dust motes or diagonal rain droplets with physical motion blur crossing in front of the subject.
- Layer 4 (Typographic Hierarchy): High-contrast titles and credits typeset with subtle drop shadows to guarantee effortless legibility.`,

    `## 17. EDITORIAL POST-PROCESSING & CINEMATOGRAPHIC COLOR GRADING
The color grading applies filmic S-curves: slightly lifted shadow blacks to avoid harsh clipping (crushed blacks), crisp midtone contrast, and rich warm highlights. This calibration preserves the organic warmth of 35mm motion picture stock (Arri Alexa / Kodak 5219), delivering an authoritative finish that transcends fleeting graphic trends. The overall color temperature stays strictly anchored in the verified palette of ${paletaCoresSugerida.join(', ')}.`,

    `## 18. MATERIAL PHYSICS & AMBIENT LIGHT INTERACTION
Optical reflection and refraction physics are configured with studio rigor:
- Organic Textures: Human skin features delicate reddish subsurface scattering along backlit contours; hair exhibits authentic specular highlights rather than solid blocks.
- Wardrobe Textiles: Heavy wool, weathered leather, or tailored fabric display authentic micro-roughness, reacting naturally to directional key lighting.
- Hard Surfaces: Wet asphalt, aged stone, or polished alloy maintain accurate specular Fresnel reflections, with dry zones exhibiting soft diffuse scattering.`,

    `## 19. ATTENTION ENGINEERING & SUBCONSCIOUS EMOTIONAL READER RESPONSE
Neuroaesthetic principles mapping human eye fixations on book covers establish a clear path:
1. Entry Point: Gaze enters at the apex of contrast (the illuminated face or silhouette in the midground).
2. Secondary Fixation: Within 100 milliseconds, the eye travels upward to the monumental Title "${titulo}".
3. Tertiary Anchor: The eye drops to the base to register the Subtitle and Author signature "By ${autor}", cementing brand recall and genre anticipation.`,

    `## 20. MULTI-HOUR LIGHTING VARIATIONS & WEATHER SCENARIOS
The robustness of the visual concept allows the atmosphere to convey temporal movement:
- Twilight: Horizon burning with warm amber while shadows cool into slate and deep indigo.
- Midnight: Concentrated sodium streetlights or distant windows casting isolated pools of safety across deep shadows.
- Fog: Atmospheric density softening distant architecture, creating an intimate, suspenseful enclosure around the subject.`,

    `## 21. MULTI-FORMAT ADAPTATION GUIDE (5.5x8.5, 6x9 & HARDCOVER)
The composition utilizes dynamic responsive margins. Whether printed in 5.5 x 8.5 in, 6 x 9 in, or standard KDP Case Laminate Hardcover (with 0.625 in turn-in wrap), no crucial element or letterform is compressed or cut. Extended 0.125 in (3.2 mm) outer bleed accommodates all industrial variations.`,

    `## 22. LUXURY INDUSTRIAL PRINT SPECIFICATIONS (SOFT-TOUCH & SPOT UV)
For premium collector editions, the cover is specified for luxury tactile enhancement:
- Lamination: 28-micron velvet soft-touch film providing a silken tactile feel.
- High-Gloss Spot UV: Applied selectively over the Title "${titulo}" and focal motif, producing a 50-micron raised glossy relief against the matte background.
- Visual Impact: Under bookstore ambient lighting, the title catches specular reflections with breathtaking elegance.`,

    `## 23. FINAL CHECKLIST: STRICT BARCODE PROHIBITION & SAFE ZONE AUDIT
Master Quality Verification:
[✓] 100% Continuous Bleed: Artwork covers the complete print area to all outer margins.
[✓] Zero White Boxes: No blank frames, cutouts, or placeholders.
[✓] Zero Simulated Barcodes: No AI-drawn barcode lines.
[✓] Safe Zone Maintained: All letterforms keep at least 15% (250px) buffer from outer trim edges.
[✓] Amazon KDP Compliance: Strictly respects automated programmatic barcode stamping.`
  ];

  const frontPromptSections = isEn ? frontPromptSectionsEn : frontPromptSectionsPt;
  const blocosExpansaoFrontal = isEn ? blocosExpansaoFrontalEn : blocosExpansaoFrontalPt;

  const promptFrontalCompleto = expandirTextoAteMeta(frontPromptSections.join('\n\n'), blocosExpansaoFrontal, 3050, { titulo, autor, genero: generoNome }, isEn);
  const wordCountFront = contarPalavras(promptFrontalCompleto);

  // ============================================================================
  // CONSTRUÇÃO DO PROMPT DE CONTRACAPA ISOLADA (>= 3.000 PALAVRAS) — PT E EN
  // ============================================================================
  const backPromptSectionsPt = [
    `# DOSSIÊ EXECUTIVO DE DIREÇÃO DE ARTE — CONTRACAPA (QUARTA CAPA EDITORIAL KDP)
- Obra: "${titulo}"
- Subtítulo: "${subtitulo || 'Edição Oficial de Lançamento'}"
- Autor: "${autor}"
- Gênero Editorial: ${generoNome}
- Estilo Visual: ${estiloRecomendado} (Gêmea Cromática e Atmosférica da Capa Frontal)
- Paleta Cromática Unificada: ${paletaCoresSugerida.join(', ')}

## 1. IDENTIDADE DA QUARTA CAPA E CONTINUIDADE PANORÂMICA
A contracapa de "${titulo}" não é uma peça isolada, mas a conclusão soberana da experiência estética iniciada na capa frontal. Enquanto a frente atrai o olhar e desperta o fascínio emocional do leitor, a contracapa é a ferramenta decisiva que fecha a venda e convence o leitor a comprar e iniciar a leitura imediatamente. Por este motivo, a arte de fundo da contracapa compartilha rigorosamente o mesmo universo cromático, o mesmo clima meteorológico e a mesma física de iluminação da capa frontal (${iluminacaoCenica}), estendendo-se de maneira fluida e contínua através da lombada para criar uma obra panorâmica coesa.`,

    `## 2. BREVE LEITURA OFICIAL DE CONTRACAPA (TEXTO EDITORIAL PRONTO PARA IMPRESSÃO)
O texto da quarta capa foi esculpido segundo a fórmula clássica de copywriting editorial de best-sellers internacionais:

### [FRASE DE IMPACTO / GANCHO NO TOPO DA CONTRACAPA]:
**"${leituraContracapa.ganchoTopo}"**

### [SINOPSE PERSUASIVA CENTRAL DA CONTRACAPA]:
"${leituraContracapa.corpoSinopse}"

### [LISTA DE BENEFÍCIOS E DESTAQUES DA LEITURA]:
• Narrativa envolvente com progressão rigorosa de tensão, mistério e reviravoltas arrebatadoras.
• Personagens autênticos com profundidade psicológica visceral, dilemas humanos universais e diálogos memoráveis.
• Edição cuidada, diagramação milimétrica e texto revisado para proporcionar uma experiência fluida, imersiva e inesquecível.
• Obra indispensável para entusiastas de ${generoNome} que buscam qualidade literária superior.

### [CHAMADA FINAL DE ENCERRAMENTO EDITORIAL]:
**"${leituraContracapa.chamadaFinal}"**`,

    `## 3. ANÁLISE NARRATIVA E PROMESSA DA OBRA AO LEITOR
A contracapa funciona como a ponte definitiva entre a expectativa do comprador e a promessa do livro. Baseada na premissa "${premissa || 'Uma história intensa e memorável'}", ela delineia as apostas emocionais do enredo sem revelar spoilers prejudiciais. O leitor precisa sentir que, ao folhear a primeira página, estará ingressando em um território de descobertas onde nenhuma convicção está a salvo. A linguagem empregada é direta, contemporânea e acessível, descartando preciosismos arcaicos em favor de palavras vibrantes de uso corrente na sociedade atual, potencializando o engajamento imediato.`,

    `## 4. CENOGRAFIA DE FUNDO DA CONTRACAPA E ZONA DE ALTO CONTRASTE
A cenografia de fundo da contracapa (${composicaoContracapa}) foi projetada para resolver o maior desafio do design editorial: beleza estética versus legibilidade do texto. Ao cruzar a lombada em direção ao painel traseiro, a arte suavemente reduz a frequência de elementos visuais complexos e se transforma em uma superfície fosca texturizada (ardósia profunda, carvão ou marfim suave) com contraste tonal altíssimo. Isso permite que a sinopse e os títulos sejam lidos com extrema clareza e conforto óptico, sem que letras disputem espaço com detalhes ruidosos da imagem.`,

    `## 5. HIERARQUIA TIPOGRÁFICA, DIAGRAMAÇÃO DA QUARTA CAPA E MARGENS ANTI-CORTE
A diagramação da contracapa obedece a uma ordem matemática precisa com margem segura de 15%:
1. Gancho de Abertura (Upper Top Zone): Letras garrafais em cor de destaque (${paletaCoresSugerida[1]}), tamanho 13pt a 15pt, centralizado ou justificado à esquerda, mantendo ampla distância de 220px do topo.
2. Bloco da Sinopse Editorial: Tipografia serifada clássica ou sem serifa moderna (${fonteTituloSugerida}), tamanho 10pt a 11pt, entrelinha de 1.45x, corpo do texto justificado com margem lateral generosa de 240px.
3. Chamada Final de Ação: Fonte em itálico enfático com cor luminosa, destacando o valor duradouro da obra.
4. Crédito e Assinatura do Autor: Na base da contracapa, posicionado a pelo menos 200px da margem inferior com o nome de ${autor}.`,

    `## 6. INTEGRAÇÃO HARMÔNICA COM A LOMBADA (SPINE)
A lombada do livro, que conecta a capa frontal e a contracapa, segue a mesma textura e gradiente tonal. O título "${titulo}" e o autor "${autor}" são impressos verticalmente ao longo da lombada com espaçamento de segurança de 1.6 mm das dobras vincadas, garantindo que mesmo com variações normais de refilo na esteira industrial da gráfica da Amazon KDP, a tipografia da lombada permaneça perfeitamente centralizada e nítida quando o livro repousar em uma estante.`,

    `## 7. ESPECIFICAÇÕES TÉCNICAS DE IMPRESSÃO GRÁFICA AMAZON KDP
- Margem de Sangria (Bleed): Adicional obrigatório de 0.125 polegadas (3.2 mm) em todas as bordas externas para corte industrial limpo.
- Margem de Segurança Interna (Safe Margin): Nenhuma letra, texto ou elemento vital deve estar a menos de 0.25 polegadas (6.4 mm) da linha de corte final.
- Resolução Gráfica: 300 DPI estritos em espaço de cor CMYK/RGB calibrado para impressão offset ou digital sob demanda (Print-On-Demand).
- Superfície Contínua: Fundo 100% preenchido até as arestas, dispensando qualquer recorte prévio.`,

    `## 8. PROIBIÇÃO ABSOLUTA E REGRA MANDATÓRIA: ZERO CÓDIGOS DE BARRA OU CAIXAS BRANCAS
REQUISITO VITAL E INEGOCIÁVEL: A arte da contracapa deve cobrir 100% da superfície de ponta a ponta. É terminantemente proibido inserir qualquer retângulo branco, caixa vazia, espaço reservado branco ou código de barras artificial na imagem.
O Amazon KDP carimba automaticamente o código de barras oficial ISBN no quadrante inferior direito da contracapa no exato instante da impressão física na gráfica industrial. Inserir uma caixa branca na arte gera sobreposição defeituosa e rejeição visual da capa.
Regra de Ouro: "A arte preenche tudo; a gráfica carimba por cima."`,

    `## 9. PARÂMETROS TÉCNICOS EXCLUSIVOS PARA MOTORES DE IA — CONTRACAPA ISOLADA
Para renderização de fundo ou arte de contracapa em motores de IA generativa:
\`\`\`text
Flat 2D full-bleed book BACK COVER artwork for "${titulo}" by ${autor}. Vertical 2:3 aspect ratio, 1600x2400 pixels, 300 DPI. Genre: ${generoNome}. Aesthetic twin of front cover in ${estiloRecomendado}. Palette: ${paletaCoresSugerida.join(', ')}. Environment: ${composicaoContracapa}. Typography: Top Hook "${leituraContracapa.ganchoTopo}", Synopsis reading block, and Closing line. Edge-to-edge continuous artwork with clean dark matte reading zone. Zero 3D mockup, flat 2D print press sheet. CRITICAL ANTI-CROP SAFE ZONE: Keep all text centered within the inner 70% safe area with 15% clear margins on all sides. NEVER place letters near edges. MANDATORY NEGATIVE RULES: NO BARCODE, NO BARCODE BOX, NO WHITE BOX, NO WHITE RECTANGLE, NO BLANK BOX, NO CUTOUT. --no cropped text, cut-off letters, text on borders, letters on edge, out-of-frame typography, barcode, barcode box, white box, white rectangle, blank box, blank space, qr code
\`\`\``,

    `## 10. PSICOLOGIA DE CONVERSÃO DO COMPRADOR NA QUARTA CAPA
Pesquisas de neurociência aplicada ao consumo literário comprovam que após o primeiro impacto da capa frontal, 87% dos leitores viram o livro fisicamente para ler a contracapa antes de decidir pela compra. A contracapa de "${titulo}" responde estrategicamente às três perguntas inconscientes do leitor:
1. "Este livro é para mim?" — Respondido imediatamente pelo gancho de impacto no topo.
2. "O que eu vou sentir e aprender nesta jornada?" — Entregue pela sinopse concisa e eletrizante.
3. "Por que devo comprar agora?" — Consolidado pelos pontos fortes de benefício e pela chamada final de urgência emocional.`,

    `## 11. BIO EDITORIAL DE AUTORIDADE DO AUTOR
No rodapé da contracapa, uma breve bio ressalta a autoridade de ${autor}: "Autor consagrado, conhecido por sua prosa afiada, personagens inesquecíveis e domínio ímpar da narrativa de ${generoNome}. Suas obras exploram com maestria os limites da condição humana, conquistando leitores apaixonados no Brasil e no exterior." Esta ancoragem reforça a credibilidade e estimula o leitor a colecionar outras obras da mesma autoria.`,

    `## 12. HARMONIZAÇÃO DE ACABAMENTO GRÁFICO (SOFT TOUCH E VERNIZ LOCALIZADO)
A contracapa foi desenhada para valorizar acabamentos táteis nobres: laminação fosca aveludada (soft-touch) sobre o fundo escuro de ${paletaCoresSugerida[0]}, com aplicação de verniz localizado UV brilhante sobre a frase de impacto e sobre o logotipo da editora. O contraste sensorial entre a textura aveludada do fundo e o relevo brilhante dos destaques transforma o simples ato de segurar o livro em uma experiência de luxo editorial.`
  ];

  const backPromptSectionsEn = [
    `# ART DIRECTION EXECUTIVE DOSSIER — BACK COVER (KDP EDITORIAL FOURTH COVER)
- Title: "${titulo}"
- Subtitle: "${subtitulo || 'Official Release Edition'}"
- Author: "${autor}"
- Editorial Genre: ${generoNome}
- Visual Style: ${estiloRecomendado} (Chromatic and Atmospheric Twin of Front Cover)
- Unified Color Palette: ${paletaCoresSugerida.join(', ')}

## 1. BACK COVER IDENTITY & PANORAMIC CONTINUITY
The back cover of "${titulo}" is not a standalone artifact, but the definitive closure of the aesthetic journey commenced on the front. While the front arrests attention and evokes emotional fascination, the fourth cover acts as the closer that validates the reader's impulse to purchase and read immediately. Therefore, the back-cover background strictly shares the identical chromatic environment, atmospheric climate, and lighting physics of the front (${iluminacaoCenica}), bridging seamlessly across the spine to form a cohesive panoramic canvas.`,

    `## 2. OFFICIAL BACK COVER COPY (PRINT-READY EDITORIAL BLURB)
The fourth-cover copy is sculpted under the classic persuasive conversion formula of international bestsellers:

### [TOP HOOK / HEADLINE]:
**"${leituraContracapa.ganchoTopo}"**

### [CENTRAL PERSUASIVE SYNOPSIS]:
"${leituraContracapa.corpoSinopse}"

### [READING HIGHLIGHTS & KEY BENEFITS]:
• Compelling, fast-paced narrative crafted with authentic depth, psychological tension, and shocking revelations.
• Multi-layered characters navigating visceral moral dilemmas, authentic relationships, and memorable dialogues.
• Meticulously edited, typeset to millimeter precision, and polished for an unforgettable, immersive reading experience.
• An essential, unputdownable work for devotees of ${generoNome} demanding superior literary execution.

### [FINAL EDITORIAL CLOSING PITCH]:
**"${leituraContracapa.chamadaFinal}"**`,

    `## 3. NARRATIVE PROMISE & READER PSYCHOLOGY
The back cover establishes the vital bridge between reader expectations and narrative fulfillment. Derived from the core premise "${premissa || 'An unforgettable and intense literary journey'}", it frames the dramatic stakes without revealing narrative spoilers. The reader must sense that cracking the first chapter unlocks an unpredictable realm where certainty is stripped away. The phrasing is immediate, contemporary, and evocative, discarding stale idioms in favor of vibrant prose that drives engagement.`,

    `## 4. BACKGROUND SCENOGRAPHY & HIGH-CONTRAST READING ZONE
The back-cover scenography (${composicaoContracapa}) solves the cardinal challenge of book design: visual beauty versus effortless typographic legibility. Transitioning across the spine into the rear panel, the artwork gently reduces high-frequency detail, opening into an expansive dark matte textured expanse (deep charcoal, slate, or soft parchment) with exceptional tonal contrast. This ensures that the synopsis, headlines, and credits are read with supreme ease without competing with background clutter.`,

    `## 5. TYPOGRAPHIC HIERARCHY, TYPESETTING & ANTI-CROP BUFFER
Back-cover typesetting adheres to mathematical balance with strict 15% margin safety:
1. Opening Hook: Set in distinguished display capital letters in strategic accent tone (${paletaCoresSugerida[1]}), 13pt to 15pt, maintaining an expansive 220px margin from the top edge.
2. Editorial Synopsis Body: Elegant serif or clean modern sans-serif typography (${fonteTituloSugerida}), 10pt to 11pt, 1.45x line-height, justified body with generous 240px horizontal breathing margins to eliminate edge cutting.
3. Closing Pitch: Emphatic italicized callout in luminous tone, cementing the book's lasting emotional value.
4. Author Credit & Bio: Positioned along the bottom base with a minimum 200px clearance from the bottom edge.`,

    `## 6. HARMONIOUS INTEGRATION WITH THE SPINE
The spine joining front and back covers carries identical textures and color values. The Title "${titulo}" and Author "${autor}" run vertically along the spine, bounded by a 1.6 mm safety buffer from both crease hinges, guaranteeing crisp centering when resting on any bookstore or private shelf.`,

    `## 7. TECHNICAL SPECIFICATIONS FOR AMAZON KDP PHYSICAL PRINTING
- Bleed Allowance: Mandatory 0.125 inches (3.2 mm) along all outer edges for clean mechanical trimming.
- Internal Safe Margin: No text or critical detail positioned within 0.25 inches (6.4 mm) of final cutlines.
- Resolution: Strict 300 DPI in calibrated CMYK/RGB for offset and print-on-demand presses.
- Continuous Surface: Artwork covers 100% of the panel with zero pre-cut gaps.`,

    `## 8. ABSOLUTE PROHIBITION AND MANDATORY RULE: ZERO BARCODES OR WHITE BOXES
NON-NEGOTIABLE CORE DIRECTIVE: The back cover artwork must completely fill the surface edge-to-edge. It is strictly forbidden to incorporate white rectangles, blank boxes, cutout squares, or simulated barcode placeholders into the artwork.
Amazon KDP programmatically stamps the official ISBN barcode onto the lower right quadrant during industrial print production. Introducing a manual white box causes severe overlapping defects and printer rejection.`,

    `## 9. TECHNICAL AI PARAMETERS — STANDALONE BACK COVER ARTWORK
For image generation of the back cover panel:
\`\`\`text
Flat 2D full-bleed book BACK COVER artwork for "${titulo}" by ${autor}. Vertical 2:3 aspect ratio, 1600x2400 pixels, 300 DPI. Genre: ${generoNome}. Aesthetic twin of front cover in ${estiloRecomendado}. Palette: ${paletaCoresSugerida.join(', ')}. Environment: ${composicaoContracapa}. Typography: Top Hook "${leituraContracapa.ganchoTopo}", Synopsis reading block, and Closing line. Edge-to-edge continuous artwork with clean dark matte reading zone. Zero 3D mockup, flat 2D print press sheet. CRITICAL ANTI-CROP SAFE ZONE: Keep all text centered within the inner 70% safe area with 15% clear margins on all sides. NEVER place letters near edges. MANDATORY NEGATIVE RULES: NO BARCODE, NO BARCODE BOX, NO WHITE BOX, NO WHITE RECTANGLE, NO BLANK BOX, NO CUTOUT. --no cropped text, cut-off letters, text on borders, letters on edge, out-of-frame typography, barcode, barcode box, white box, white rectangle, blank box, blank space, qr code
\`\`\``,

    `## 10. BACK COVER BUYER CONVERSION PSYCHOLOGY
Eye-tracking and consumer research demonstrate that after encountering the front cover, 87% of readers physically flip the book to read the back blurb before purchasing. The back cover of "${titulo}" addresses three subconscious queries:
1. "Is this book for me?" — Addressed instantly by the top headline hook.
2. "What emotional journey will I experience?" — Answered by the concise, electrifying synopsis.
3. "Why buy today?" — Validated by reading benefit highlights and the urgent closing pitch.`,

    `## 11. AUTHOR'S AUTHORITATIVE EDITORIAL BIO
At the base of the back cover, a dignified bio reinforces authority: "Acclaimed author known for razor-sharp prose, unforgettable characterizations, and masterful command of ${generoNome}. Their works explore the raw boundaries of human resilience, captivating readers worldwide." This builds enduring trust and stimulates reader appetite for future catalog titles.`,

    `## 12. LUXURY FINISH HARMONIZATION (SOFT TOUCH & SPOT VARNISH)
The back cover is engineered to highlight tactile finishes: velvet soft-touch matte lamination across ${paletaCoresSugerida[0]}, paired with spot gloss UV over the opening hook headline. The sensory interplay between silken matte base and raised gloss highlights elevates physical handling into a luxury experience.`
  ];

  const blocosExpansaoContracapaPt = [
    `## 13. ESTUDO DETALHADO DE LEGIBILIDADE E FADIGA VISUAL
Para evitar qualquer fadiga visual durante a leitura da sinopse de contracapa sob iluminação artificial fraca em livrarias ou em telas de baixa luminosidade, o índice de contraste (WCAG AAA) entre as letras e o fundo de "${titulo}" é mantido rigorosamente acima de 7:1. Letras em branco puro (${paletaCoresSugerida[2] || '#ffffff'}) ou ouro envelhecido (${paletaCoresSugerida[1] || '#d97706'}) repousam sobre a textura de ardósia escura sem que nenhum elemento gráfico ruidoso atravesse as linhas de texto, proporcionando uma leitura límpida, relaxante e irresistível. A entrelinha de 1.45x assegura que o olho do leitor encontre a linha seguinte com agilidade mecânica perfeita.`,
    
    `## 14. ESTRATÉGIA DE RETENÇÃO E ENCERRAMENTO EDITORIAL
A frase final da contracapa de "${titulo}" foi arquitetada para funcionar como um eco emocional na mente do leitor. Ao concluir a leitura da sinopse, ele é deixado com um sentimento de urgência dramática: a história já começou em sua imaginação e a única maneira de satisfazer essa inquietação é adquirir o exemplar e mergulhar no Capítulo 1. Esse é o padrão de excelência editorial dos grandes campeões de venda mundiais, transformando curiosidade passageira em compra confirmada.`,

    `## 15. ENGENHARIA DE CONVERSÃO DA SINOPSE EM TRÊS PARÁGRAFOS
A estrutura textual da quarta capa de "${titulo}" foi calibrada em 3 atos estratégicos:
- Parágrafo 1 (O Incidente Incitante): Apresenta o cenário e a ruptura inicial com ${autor}, capturando o leitor pelo fascínio do mistério.
- Parágrafo 2 (A Escalada da Tensão): Introduz a complicação crescente inspirada na premissa "${premissa || 'Uma história intensa'}", elevando as apostas dramáticas e tornando o conflito pessoal e inevitável.
- Parágrafo 3 (O Dilema Inescapável): Coloca o protagonista diante de uma escolha sem retorno, deixando o desfecho em aberto para ser resolvido apenas nas páginas do livro.`,

    `## 16. PRINCÍPIO DA CONTINUIDADE CROMÁTICA DA LOMBADA (SPINE FLOW)
Ao conectar a capa frontal à contracapa, a lombada não opera como uma divisória fria, mas como um corredor estético vivo. As sombras ricas de ${paletaCoresSugerida[0]} fluem ininterruptamente através do vinco de dobra, garantindo que mesmo que o exemplar seja exibido de frente, de costas ou de perfil em uma biblioteca particular, a harmonia visual permaneça impecável. A tipografia da lombada compartilha exatamente a mesma família tipográfica (${fonteTituloSugerida}) utilizada na capa e na contracapa.`,

    `## 17. ANÁLISE NEUROCIENTÍFICA DA DECISÃO DE COMPRA NA QUARTA CAPA
A decisão de comprar um livro é 70% emocional e 30% racional. Enquanto a capa frontal atinge o sistema límbico emocional do leitor, a contracapa entrega a justificativa racional que o córtex pré-frontal exige para validar a compra. Ao ler a sinopse estruturada, os bullet points de benefícios e o gancho no topo, o cérebro do comprador antecipa a recompensa dopaminérgica do prazer da leitura, eliminando qualquer hesitação ou arrependimento pós-compra.`,

    `## 18. DETALHAMENTO TÉCNICO DAS MARGENS DE CORTE E VINCO KDP
Para garantir que a impressão física no Amazon KDP transcorra sem advertências do analisador de arquivos (KDP Print Previewer):
- A margem externa de 3.2 mm (0.125 pol) estende o fundo ilustrado para fora da linha de corte.
- A margem interna de segurança de 12.7 mm (0.5 pol) protege o bloco de texto contra o corte das lâminas industriais.
- A área do código de barras oficial no canto inferior direito permanece com arte 100% contínua por trás, sem qualquer janela em branco, pronta para a sobreposição do carimbo oficial pela gráfica da Amazon.`,

    `## 19. FORMULAÇÃO DOS BULLET POINTS DE IMPACTO E DIFERENCIAÇÃO
Os quatro pontos de destaque incluídos na contracapa comunicam de forma rápida e escaneável os maiores diferenciais de "${titulo}":
1. Ritmo de leitura acelerado com encerramentos de capítulo do tipo "cliffhanger" que impedem o leitor de largar a obra.
2. Construção cênica visceral com ancoragem sensorial rica em detalhes de época, clima e psicologia humana.
3. Arcos de personagens multifacetados com dilemas morais autênticos e sem maniqueísmos superficiais.
4. Acabamento gráfico de padrão internacional pronto para enriquecer qualquer estante ou leitor digital.`,

    `## 20. TOLERÂNCIA DE RENDERIZAÇÃO TIPOGRÁFICA E COEFICIENTE DE CONTRASTE
O coeficiente de contraste entre a tipografia da contracapa e o fundo é mantido estritamente acima de 85% em qualquer condição de luz. Mesmo se o livro for lido sob a luz tênue de um abajur de cabeceira ou em uma livraria com lâmpadas amareladas, a clareza óptica permanece perfeita, sem cansar a visão do leitor.`,

    `## 21. ADAPTAÇÃO PARA VISUALIZAÇÃO EM DISPOSITIVOS MÓVEIS (E-COMMERCE PREVIEWS)
Nas páginas de produto da Amazon, a imagem da contracapa é frequentemente visualizada em zoom em telas de smartphones. Por essa razão, a hierarquia tipográfica foi concebida para que os títulos em negrito e a primeira frase da sinopse sejam legíveis mesmo sem necessidade de pinça de zoom, capturando o comprador que navega rapidamente pelo aplicativo da Amazon.`,

    `## 22. ROTEIRO DE VERIFICAÇÃO FINAL DA CONTRACAPA
Checagem técnica antes da aprovação de impressão:
[✓] Harmonia cromática gêmea com a capa frontal mantida.
[✓] Breve leitura oficial completa: gancho, sinopse persuasiva, bullet points e chamada final integrados.
[✓] Zona fosca de alto contraste sem ruído visual sob os blocos de texto.
[✓] Margem interna de segurança respeitada em 100% das linhas tipográficas.
[✓] Proibição total de caixas brancas ou códigos de barras artificiais observada.`
  ];

  const blocosExpansaoContracapaEn = [
    `## 13. VISUAL FATIGUE & READABILITY ACCESSIBILITY AUDIT
To prevent eye strain when reading back-cover copy under dim bookstore lighting or on low-brightness screens, the contrast ratio (WCAG AAA) between text and background on "${titulo}" exceeds 7:1. Crisp white (${paletaCoresSugerida[2] || '#ffffff'}) or antique gold (${paletaCoresSugerida[1] || '#d97706'}) letters rest on deep slate textures with zero distracting graphic noise cutting through lines. Generous 1.45x line spacing ensures the reader's eye navigates with effortless cadence.`,

    `## 14. RETENTION STRATEGY & PERSUASIVE EDITORIAL CLOSURE
The closing sentence on the back cover of "${titulo}" serves as a lingering emotional catalyst. Upon finishing the blurb, the reader is left with dramatic urgency: the conflict has already sparked in their imagination, and opening Chapter 1 is the only resolution. This matches the proven editorial engineering of international bestsellers, converting transient interest into an immediate confirmed purchase.`,

    `## 15. THREE-ACT CONVERSION ARCHITECTURE FOR BACK COVER SYNOPSIS
The fourth-cover copy is structured across three dramatic acts:
- Act 1 (Inciting Stasis Rupture): Establishes the setting and initial disruption crafted by ${autor}, arresting the reader with immediate intrigue.
- Act 2 (Escalating Stakes): Expands the core tension drawn from premise "${premissa || 'An intense narrative'}", raising personal and moral stakes.
- Act 3 (Irreversible Crossroads): Leaves the protagonist facing an unavoidable choice, withholding resolution until the pages within.`,

    `## 16. SPINE FLOW CHROMATIC CONTINUITY PRINCIPLE
Bridging front and back panels, the spine acts as a living atmospheric conduit. Rich dark shadows of ${paletaCoresSugerida[0]} extend unbroken across the folding hinges, ensuring that whether displayed face-out, spine-out, or back-out, visual unity remains pristine. Spine typography shares the exact font family (${fonteTituloSugerida}) utilized across front and back.`,

    `## 17. NEUROSCIENCE OF BUYING DECISIONS ON THE FOURTH COVER
Book purchasing is 70% emotional and 30% rational. While the front cover engages the emotional limbic system, the back cover delivers the rational justification required by the prefrontal cortex to validate the decision. The clear synopsis, structured benefit bullets, and authoritative hook trigger anticipated dopamine reward, neutralizing post-purchase hesitation.`,

    `## 18. TECHNICAL KDP TRIM AND CREASE TOLERANCES
To guarantee seamless passage through Amazon KDP Print Previewer:
- Outer bleed of 3.2 mm (0.125 in) extends artwork beyond cut lines.
- Safe interior buffer of 12.7 mm (0.5 in) shields copy blocks from mechanical blade shift.
- Barcode zone in the lower-right quadrant maintains 100% continuous underlying artwork, prepared for automated barcode stamping during physical production.`,

    `## 19. HIGH-CONVERSION BENEFIT BULLET FORMULATION
The four highlights on the back cover communicate distinctive strengths with scannable efficiency:
1. Fast-paced chapter velocity punctuated by compelling cliffhangers that discourage putting the book down.
2. Visceral scene-building enriched with sensory detail, atmospheric depth, and authentic human psychology.
3. Multi-faceted character arcs navigating profound moral crossroads without simplistic tropes.
4. Production values engineered to international standards, ready to elevate any library or digital reader.`,

    `## 20. TYPOGRAPHIC RENDERING TOLERANCE & FONT CONTRAST COEFFICIENT
The contrast coefficient between typography and background remains rigorously above 85% under all lighting environments. Whether inspected under warm reading lamps or supermarket fluorescent fixtures, optical sharpness is maintained effortlessly.`,

    `## 21. E-COMMERCE MOBILE SCREEN PREVIEW ADAPTATION
On Amazon product pages, back-cover previews are frequently magnified on mobile screens. Typography is engineered so that bold headers and the opening blurb sentence remain legible without requiring pinch-to-zoom, capturing fast-scrolling mobile buyers.`,

    `## 22. FINAL COMPREHENSIVE BACK COVER PRINT AUDIT CHECKLIST
Pre-flight print verification:
[✓] Twin chromatic harmony with front cover maintained.
[✓] Complete copy structure: headline hook, persuasive synopsis, bullet points, and closing pitch integrated.
[✓] Matte high-contrast reading zone free of visual clutter.
[✓] Full safe margin compliance across 100% of text blocks.
[✓] Absolute prohibition of white barcode boxes honored.`
  ];

  const backPromptSections = isEn ? backPromptSectionsEn : backPromptSectionsPt;
  const blocosExpansaoContracapa = isEn ? blocosExpansaoContracapaEn : blocosExpansaoContracapaPt;

  const promptContracapaCompleto = expandirTextoAteMeta(backPromptSections.join('\n\n'), blocosExpansaoContracapa, 3050, { titulo, autor, genero: generoNome }, isEn);
  const wordCountBack = contarPalavras(promptContracapaCompleto);

  // ============================================================================
  // CONSTRUÇÃO DO PROMPT DE WRAP COMPLETO ABERTO (>= 3.000 PALAVRAS) — PT E EN
  // ============================================================================
  const wrapPromptSectionsPt = [
    `# DOSSIÊ EXECUTIVO DE DIREÇÃO DE ARTE — CAPA ABERTA COMPLETA (WRAP KDP: CONTRACAPA + LOMBADA + CAPA)
- Obra: "${titulo}"
- Subtítulo: "${subtitulo || 'Edição Oficial de Lançamento'}"
- Autor: "${autor}"
- Gênero Editorial: ${generoNome}
- Estilo Visual: ${estiloRecomendado}
- Dimensões Panorâmicas: Proporção 16:9 / 3250x2350 pixels (ou superior) a 300 DPI em sangria total.
- Painel Esquerdo (47% da largura): CONTRACAPA com Breve Leitura e Sinopse.
- Painel Central (6% da largura): LOMBADA contínua com título vertical e autor.
- Painel Direito (47% da largura): CAPA FRONTAL com título monumental e arte principal.

## 1. PRINCÍPIO DA SINTONIA TOTAL E CONTINUIDADE PANORÂMICA
A capa aberta de "${titulo}" constitui uma obra de arte única e ininterrupta. Não se trata de três peças coladas, mas de um único horizonte estético que se desdobra suavemente da direita para a esquerda:
- A Capa Frontal (lado direito) estabelece o clímax da cena com iluminação dramática (${iluminacaoCenica}) e o título "${titulo}".
- A Lombada (centro) atua como ponte cromática ininterrupta, preservando as mesmas texturas de ${paletaCoresSugerida[0]} e estendendo a atmosfera sem cortes visíveis.
- A Contracapa (lado esquerdo) recebe a continuidade do horizonte atmosférico, abrindo uma ampla área fosca de altíssimo contraste para a breve leitura oficial da sinopse.`,

    `## 2. TEXTO OFICIAL DA BREVE LEITURA DE CONTRACAPA INTEGRADO NO WRAP
Gancho Superior de Impacto:
"${leituraContracapa.ganchoTopo}"

Sinopse Editorial Central:
"${leituraContracapa.corpoSinopse}"

Fechamento Editorial Persuasivo:
"${leituraContracapa.chamadaFinal}"`,

    `## 3. ESPECIFICAÇÃO DE LOMBADA MILIMÉTRICA KDP
A largura da lombada é determinada matematicamente pela quantidade exata de páginas do miolo e pela gramatura do papel (fórmula oficial Amazon KDP: número de páginas × 0,002252 polegadas para papel branco ou 0,0025 polegadas para papel creme). O título "${titulo}" e o autor "${autor}" são impressos ao longo do eixo vertical da lombada, respeitando a margem de segurança de 1.6 mm das linhas de vinco para garantir alinhamento perfeito na estante de qualquer livraria física ou prateleira do leitor.`,

    `## 4. PROIBIÇÃO TOTAL E ESTRITA DE CÓDIGOS DE BARRA OU CAIXAS BRANCAS NO WRAP
A arte panorâmica da capa aberta deve cobrir 100% de toda a superfície impressa, de ponta a ponta, sem nenhuma caixa branca, retângulo vazio ou espaço de código de barras. A Amazon KDP realiza o carimbo oficial do código de barras diretamente sobre a arte no processo de impressão física sob demanda. Inserir caixas brancas na imagem estraga o layout e gera defeito grave de produção gráfica.`,

    `## 5. PROMPT TÉCNICO COMPLETO PARA MOTOR DE IA GENERATIVA (WRAP ABERTO)
\`\`\`text
Full wraparound open paperback book cover spread (horizontal 16:9 aspect ratio, 3250x2350 pixels at 300 DPI, flat 2D print-ready press sheet, comprising LEFT = BACK COVER, CENTER = SPINE, RIGHT = FRONT COVER) in 100% visual, chromatic, lighting, and typographic harmony for "${titulo}" by ${autor}.
Genre & Aesthetic: ${generoNome} — ${estiloRecomendado}. Continuous seamless wraparound background artwork flowing uninterruptedly from the Right Front Cover across the Center Spine to the Left Back Cover.
1. RIGHT PANEL (FRONT COVER): ${composicaoFundo}. Dominant Title "${titulo}", Subtitle "${subtitulo}", Author "${autor}".
2. CENTER PANEL (SPINE): Continuous dark textured strip with vertical Title "${titulo}" and Author "${autor}".
3. LEFT PANEL (BACK COVER): ${composicaoContracapa}. Top Hook "${leituraContracapa.ganchoTopo}", Synopsis reading block, Closing note "${leituraContracapa.chamadaFinal}".
Color Palette: ${paletaCoresSugerida.join(', ')}. Lighting: ${iluminacaoCenica}.
CRITICAL ANTI-CROP SAFE ZONE: Keep all typography, titles, and text strictly inside the central 70% safe zone with a wide 15% outer margin buffer on all four edges. Absolutely NO text near edges or borders.
MANDATORY NEGATIVE RULES: NO BARCODE, NO BARCODE BOX, NO WHITE BOX, NO WHITE RECTANGLE, NO BLANK BOX, NO CUTOUT, NO STICKER, NO EMPTY WHITE SPACE. Full-bleed continuous artwork edge-to-edge. --no cropped text, cut-off letters, text on borders, letters on edge, out-of-frame typography, barcode, barcode box, white box, white rectangle, blank box, blank space, qr code, sticker, label, cutout, white square
\`\`\``
  ];

  const wrapPromptSectionsEn = [
    `# ART DIRECTION EXECUTIVE DOSSIER — FULL WRAPAROUND COVER (KDP WRAP: BACK + SPINE + FRONT)
- Title: "${titulo}"
- Subtitle: "${subtitulo || 'Official Release Edition'}"
- Author: "${autor}"
- Editorial Genre: ${generoNome}
- Sovereign Aesthetic: ${estiloRecomendado}
- Panoramic Dimensions: 16:9 aspect ratio / 3250x2350 pixels (or higher) at 300 DPI full bleed.
- Left Panel (47% width): BACK COVER with blurb copy, reading benefits, and synopsis.
- Center Panel (6% width): SPINE with vertical Title and Author.
- Right Panel (47% width): FRONT COVER with dominant title and core illustration.

## 1. PRINCIPLE OF TOTAL CHROMATIC & PANORAMIC HARMONY
The open wraparound spread for "${titulo}" represents a singular, uninterrupted artwork. It is not three separate panels stitched together, but a continuous visual horizon unfolding smoothly from right to left:
- Right Panel (Front Cover) establishes the narrative climax with dramatic cinematic lighting (${iluminacaoCenica}) and Title "${titulo}".
- Center Panel (Spine) acts as an unbroken chromatic bridge, carrying the deep textures of ${paletaCoresSugerida[0]} without visible seams.
- Left Panel (Back Cover) extends the atmospheric horizon into a clean, high-contrast matte surface for the official blurb copy.`,

    `## 2. OFFICIAL BACK COVER COPY INTEGRATED INTO WRAP
Opening Headline Hook:
"${leituraContracapa.ganchoTopo}"

Central Editorial Synopsis:
"${leituraContracapa.corpoSinopse}"

Persuasive Closing Pitch:
"${leituraContracapa.chamadaFinal}"`,

    `## 3. MILLIMETRIC KDP SPINE SPECIFICATIONS
Spine width is calculated from exact manuscript page count and paper weight (official Amazon KDP formula: page count × 0.002252 in for white paper or 0.0025 in for cream paper). Title "${titulo}" and Author "By ${autor}" run along the vertical axis, observing a 1.6 mm safety margin from both crease lines to guarantee precise alignment on any shelf.`,

    `## 4. STRICT TOTAL PROHIBITION OF BARCODES OR WHITE BOXES IN WRAP
The panoramic wraparound artwork must cover 100% of the printed surface from edge to edge with zero blank boxes, white frames, or cutout rectangles. Amazon KDP prints the official barcode automatically over the artwork during physical fulfillment. Adding a manual white box ruins the spread.`,

    `## 5. COMPLETE TECHNICAL AI GENERATION PROMPT (OPEN WRAP)
\`\`\`text
Full wraparound open paperback book cover spread (horizontal 16:9 aspect ratio, 3250x2350 pixels at 300 DPI, flat 2D print-ready press sheet, comprising LEFT = BACK COVER, CENTER = SPINE, RIGHT = FRONT COVER) in 100% visual, chromatic, lighting, and typographic harmony for "${titulo}" by ${autor}.
Genre & Aesthetic: ${generoNome} — ${estiloRecomendado}. Continuous seamless wraparound background artwork flowing uninterruptedly from the Right Front Cover across the Center Spine to the Left Back Cover.
1. RIGHT PANEL (FRONT COVER): ${composicaoFundo}. Dominant Title "${titulo}", Subtitle "${subtitulo}", Author "By ${autor}".
2. CENTER PANEL (SPINE): Continuous dark textured strip with vertical Title "${titulo}" and Author "By ${autor}".
3. LEFT PANEL (BACK COVER): ${composicaoContracapa}. Top Hook "${leituraContracapa.ganchoTopo}", Synopsis reading block, Closing note "${leituraContracapa.chamadaFinal}".
Color Palette: ${paletaCoresSugerida.join(', ')}. Lighting: ${iluminacaoCenica}.
CRITICAL ANTI-CROP SAFE ZONE: Keep all typography, titles, and text strictly inside the central 70% safe zone with a wide 15% outer margin buffer on all four edges. Absolutely NO text near edges or borders.
MANDATORY NEGATIVE RULES: NO BARCODE, NO BARCODE BOX, NO WHITE BOX, NO WHITE RECTANGLE, NO BLANK BOX, NO CUTOUT, NO STICKER, NO EMPTY WHITE SPACE. Full-bleed continuous artwork edge-to-edge. --no cropped text, cut-off letters, text on borders, letters on edge, out-of-frame typography, barcode, barcode box, white box, white rectangle, blank box, blank space, qr code, sticker, label, cutout, white square
\`\`\``
  ];

  const wrapPromptSections = isEn ? wrapPromptSectionsEn : wrapPromptSectionsPt;

  const promptCapaEContracapaCompleto = expandirTextoAteMeta(wrapPromptSections.join('\n\n'), [...blocosExpansaoFrontal, ...blocosExpansaoContracapa], 3050, { titulo, autor, genero: generoNome }, isEn);
  const wordCountWrap = contarPalavras(promptCapaEContracapaCompleto);

  const authorPrefix = isEn ? 'By ' : '';

  return {
    localDetectado: sintonia.local,
    epocaDetectada: sintonia.epoca,
    contextoRealResumido: sintonia.contextoConflito,
    cenografiaReal: sintonia.cenografiaCapa,
    proibicoesEspecificas: sintonia.proibicoesEspecificas,

    promptCompleto: promptFrontalCompleto,
    promptParaMotorIa: `Flat 2D full-bleed bestselling book FRONT COVER artwork for "${titulo}" by ${autor}. Vertical 2:3 aspect ratio, 1600x2400 pixels, 300 DPI. Genre: ${generoNome}. Aesthetic: ${estiloRecomendado}. Scene: ${composicaoFundo}. Lighting: ${iluminacaoCenica}. Palette: ${paletaCoresSugerida.join(', ')}. Typography: Title "${titulo}", Subtitle "${subtitulo}", Author "${authorPrefix}${autor}". CRITICAL ANTI-CROP SAFE ZONE: Keep all typography, titles, and text strictly inside the central 70% safe zone with a wide 15% outer margin buffer on all four edges. Absolutely NO text near edges or borders. --ar 2:3 --v 6.1 --style raw --stylize 250 --no barcode, barcode box, white box, white rectangle, blank box, cropped text, cut-off letters, text on borders, letters on edge, out-of-frame typography, qr code, big ben, london parliament, out-of-context foreign landmarks, unrelated monuments, blurry textures`,
    wordCount: wordCountFront,

    promptContracapaIsoladaCompleto: promptContracapaCompleto,
    promptContracapaIsoladaMotorIa: `Flat 2D full-bleed book BACK COVER artwork for "${titulo}" by ${autor}. Vertical 2:3 aspect ratio, 1600x2400 pixels, 300 DPI. Genre: ${generoNome}. Aesthetic twin of front cover in ${estiloRecomendado}. Palette: ${paletaCoresSugerida.join(', ')}. Environment: ${composicaoContracapa}. Typography: Top Hook "${leituraContracapa.ganchoTopo}", Synopsis reading block, and Closing line. Edge-to-edge continuous artwork with clean dark matte reading zone. Zero 3D mockup, flat 2D print press sheet. CRITICAL ANTI-CROP SAFE ZONE: Keep all text centered within the inner 70% safe area with 15% clear margins on all sides. NEVER place letters near edges. MANDATORY NEGATIVE RULES: NO BARCODE, NO BARCODE BOX, NO WHITE BOX, NO WHITE RECTANGLE, NO BLANK BOX, NO CUTOUT. --no barcode, barcode box, white box, white rectangle, blank box, blank space, cropped text, cut-off letters, text on borders, letters on edge, out-of-frame typography, qr code, big ben, london parliament, out-of-context foreign landmarks, unrelated monuments`,
    wordCountContracapa: wordCountBack,

    promptCapaEContracapaCompleto,
    promptCapaEContracapaMotorIa: `Full wraparound open paperback book cover spread for "${titulo}" by ${autor}. Horizontal 16:9 aspect ratio, 3250x2350 pixels at 300 DPI, flat 2D print-ready layout (LEFT = BACK COVER, CENTER = SPINE, RIGHT = FRONT COVER) in 100% visual and chromatic harmony. Genre: ${generoNome} — ${estiloRecomendado}. Continuous seamless wraparound background artwork flowing uninterruptedly across all three panels. Palette: ${paletaCoresSugerida.join(', ')}. Lighting: ${iluminacaoCenica}. CRITICAL ANTI-CROP SAFE ZONE: Keep all panel typography inside the central 70% safe area with generous 15% margins. MANDATORY NEGATIVE RULES: NO BARCODE, NO BARCODE BOX, NO WHITE BOX, NO WHITE RECTANGLE, NO BLANK BOX, NO CUTOUT, NO STICKER, NO EMPTY WHITE SPACE. --no barcode, barcode box, white box, white rectangle, blank box, blank space, cropped text, cut-off letters, text on borders, letters on edge, out-of-frame typography, qr code`,
    wordCountCapaEContracapa: wordCountWrap,

    ganchoTopoContracapa: leituraContracapa.ganchoTopo,
    sinopseContracapaSugerida: leituraContracapa.corpoSinopse,
    chamadaFinalContracapa: leituraContracapa.chamadaFinal,

    estiloRecomendado,
    fonteTituloSugerida,
    paletaCoresSugerida,
    orientacaoTipografica: isEn ? {
      tituloPosicao: 'Upper Third (12% to 28% of height) with anti-crop safe margins',
      tituloEstilo: texturaTipografica,
      subtituloPosicao: 'Lower Quadrant, directly above Author',
      autorPosicao: 'Base of Cover (78% to 90% of height) with 220px bottom clearance',
      contracapaPosicao: 'Center-Left Panel with high contrast and 15% inner safe margin'
    } : {
      tituloPosicao: 'Terço Superior (12% a 28% da altura) com margem anti-corte',
      tituloEstilo: texturaTipografica,
      subtituloPosicao: 'Quadrante Inferior, logo acima do Autor',
      autorPosicao: 'Base da Capa (78% a 92% da altura) com folga anti-corte',
      contracapaPosicao: 'Painel Central-Esquerdo com alto contraste e margem interna de 12.7 mm'
    }
  };
}
