// ================================================================
// COVER MASTER PROMPT GENERATOR — DIRETOR DE ARTE EDITORIAL
// Gera DOIS Master Prompts Profissionais de Alta Densidade:
// 1. Prompt Exclusivo para APENAS A CAPA FRONTAL (600 a 1200 palavras)
// 2. Prompt Completo para CAPA FRONTAL + LOMBADA + CONTRACAPA EM TOTAL SINTONIA
//    (incluindo a Breve Leitura / Sinopse Persuasiva de Contracapa e especificações
//    técnicas de impressão e digital, sem mencionar nomes de plataformas terceiras).
// ================================================================

export interface CoverMasterPromptInput {
  titulo: string;
  subtitulo?: string;
  autor: string;
  genero: string;
  premissa?: string;
  idioma?: string;
}

export interface CoverMasterPromptOutput {
  // Modo 1: Apenas Capa Frontal
  promptCompleto: string;
  promptParaMotorIa: string;
  wordCount: number;

  // Modo 2: Capa Frontal + Lombada + Contracapa em Sintonia Total (com Breve Leitura na Contracapa)
  promptCapaEContracapaCompleto: string;
  promptCapaEContracapaMotorIa: string;
  promptContracapaIsoladaMotorIa: string;
  wordCountCapaEContracapa: number;
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
export function contarPalavras(texto: string): number {
  return (texto || '').trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Constrói a Breve Leitura de Contracapa (Gancho + Sinopse + Chamada Final)
 * em total sintonia com o título, subtítulo, gênero e premissa do livro.
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
  const g = generoRaw.toLowerCase();
  const premissaLimpa = premissa
    .replace(/\s+/g, ' ')
    .trim();

  if (isEn) {
    let ganchoTopo = `SOME TRUTHS ARE BURIED DEEP. OTHERS REFUSE TO STAY SILENT.`;
    let p1 = `In "${titulo}", ${autor} delivers an unforgettable narrative where every choice carries an irreversible price. ${subtitulo ? `${subtitulo}. ` : ''}Beneath the surface of ordinary life lies a web of hidden tensions waiting for a single spark.`;
    let p2 = premissaLimpa && premissaLimpa.length > 40
      ? premissaLimpa
      : `As the boundaries between certainty and illusion begin to fracture, every step forward reveals a deeper layer of the mystery. Nothing is accidental, and the answers waiting at the end of the journey will transform everything you thought you knew.`;
    let chamadaFinal = `Gripping, atmospheric, and deeply human—turn the first page and discover why some stories never let you go.`;

    if (g.includes('romance') || g.includes('drama') || g.includes('amor')) {
      ganchoTopo = `THE HEART REMEMBERS WHAT TIME TRIES TO ERASE.`;
      chamadaFinal = `An intimate, deeply moving story of love, vulnerability, and second chances that lingers long after the final page.`;
    } else if (g.includes('finan') || g.includes('negoc') || g.includes('gest') || g.includes('lider') || g.includes('autoajuda') || g.includes('desenvolvimento')) {
      ganchoTopo = `CLARITY, STRATEGY, AND MASTERING THE DECISIONS THAT DEFINE YOUR FUTURE.`;
      p1 = `"${titulo}" is a practical, high-impact guide designed for readers who refuse to settle for average results. ${subtitulo ? `${subtitulo}. ` : ''}Through clear principles and actionable frameworks, ${autor} reveals what separates fleeting effort from lasting transformation.`;
      chamadaFinal = `Essential reading for anyone ready to elevate their mindset, sharpen their strategy, and achieve extraordinary results.`;
    }

    const textoFormatadoCompleto = `${ganchoTopo}\n\n${p1}\n\n${p2}\n\n${chamadaFinal}`;
    return { ganchoTopo, corpoSinopse: `${p1}\n\n${p2}`, chamadaFinal, textoFormatadoCompleto };
  }

  // Português (Padrão)
  let ganchoTopo = `ALGUMAS VERDADES SÃO ENTERRADAS NO SILÊNCIO. OUTRAS COBRAM SEU PREÇO À MEIA-NOITE.`;
  let p1 = `Em "${titulo}", cada detalhe esconde uma camada mais profunda do que os olhos conseguem enxergar. ${subtitulo ? `${subtitulo}. ` : ''}Quando certezas antigas começam a ruir, o limite entre proteção e perigo se torna tênue demais para ser ignorado.`;
  let p2 = premissaLimpa && premissaLimpa.length > 45 && !premissaLimpa.startsWith('Narrativa envolvente centrada')
    ? premissaLimpa
    : `À medida que segredos guardados a sete chaves vêm à tona, cada passo adiante exige coragem para encarar o inesperado. Em um cenário onde nada acontece por acaso, uma única descoberta pode alterar para sempre o destino de todos os envolvidos.`;
  let chamadaFinal = `Com ritmo magnético, atmosfera cinematográfica e profundidade psicológica marcante, ${autor} conduz o leitor por uma leitura impossível de largar até a última página.`;

  if (g.includes('romance') || g.includes('drama') || g.includes('poesia') || g.includes('amor')) {
    ganchoTopo = `HÁ ENCONTROS QUE O TEMPO NÃO APAGA — E ESCOLHAS QUE MUDAM UMA VIDA INTEIRA.`;
    p1 = `Em "${titulo}", emoções silenciosas e promessas não ditas se entrelaçam em uma história inesquecível sobre afeto, cicatrizes e recomeços. ${subtitulo ? `${subtitulo}. ` : ''}`;
    chamadaFinal = `Com sensibilidade à flor da pele e escrita envolvente, ${autor} entrega uma obra tocante sobre a coragem de sentir e a força transformadora do amor verdadeiro.`;
  } else if (g.includes('sci-fi') || g.includes('ficcao') || g.includes('ficção') || g.includes('cyber') || g.includes('futuro')) {
    ganchoTopo = `QUANDO O FUTURO ULTRAPASSA O LIMITE DO HUMANO, O QUE RESTA DA NOSSA VERDADE?`;
    p1 = `Em "${titulo}", um horizonte tecnológico fascinante e implacável coloca em xeque tudo o que conhecemos sobre consciência, poder e sobrevivência. ${subtitulo ? `${subtitulo}. ` : ''}`;
    chamadaFinal = `Uma obra visionária, eletrizante e cinematográfica assinada por ${autor}, onde cada capítulo expande as fronteiras da imaginação.`;
  } else if (g.includes('fantasia') || g.includes('epico') || g.includes('épico') || g.includes('magia')) {
    ganchoTopo = `ANTIGOS JURAMENTOS DESPERTAM QUANDO A SOMBRA AVANÇA SOBRE O REINO.`;
    p1 = `Em "${titulo}", lendas esquecidas e forças ancestrais colidem em uma jornada épica onde coragem e destino caminham lado a lado. ${subtitulo ? `${subtitulo}. ` : ''}`;
    chamadaFinal = `Um universo rico, grandioso e imersivo criado por ${autor}, feito para arrebatar leitores desde a primeira página.`;
  } else if (g.includes('finan') || g.includes('negoc') || g.includes('gestao') || g.includes('gestão') || g.includes('lider')) {
    ganchoTopo = `A DIFERENÇA ENTRE O ESFORÇO COMUM E O RESULTADO EXTRAORDINÁRIO ESTÁ NO MÉTODO.`;
    p1 = `Em "${titulo}", ${autor} reúne estratégias práticas, visão executiva e princípios testados no mundo real para quem busca alta performance e decisões sólidas. ${subtitulo ? `${subtitulo}. ` : ''}`;
    chamadaFinal = `Uma leitura direta, estruturada e indispensável para profissionais, líderes e empreendedores que desejam construir resultados consistentes e duradouros.`;
  } else if (g.includes('autoajuda') || g.includes('desenvolvimento') || g.includes('habito') || g.includes('mente') || g.includes('espiritual') || g.includes('relig')) {
    ganchoTopo = `TODA GRANDE TRANSFORMAÇÃO COMEÇA QUANDO VOCÊ DECIDE ENXERGAR ALÉM DO RUÍDO.`;
    p1 = `Em "${titulo}", você encontrará um caminho claro, profundo e acolhedor para alinhar propósito, clareza mental e ação diária. ${subtitulo ? `${subtitulo}. ` : ''}`;
    chamadaFinal = `Com linguagem clara e reflexões profundas, ${autor} oferece as chaves práticas para renovar sua perspectiva e transformar sua jornada de dentro para fora.`;
  } else if (g.includes('terror') || g.includes('horror') || g.includes('sobrenatural') || g.includes('fantasma')) {
    ganchoTopo = `NÃO OLHE PARA A ESCURIDÃO SE NÃO ESTIVER PRONTO PARA O QUE OLHA DE VOLTA.`;
    p1 = `Em "${titulo}", o medo deixa de ser apenas um presságio e ganha forma nos cantos mais silenciosos da noite. ${subtitulo ? `${subtitulo}. ` : ''}`;
    chamadaFinal = `Denso, inquietante e hipnótico, este livro de ${autor} vai ecoar na sua mente muito depois que as luzes se apagarem.`;
  }

  const textoFormatadoCompleto = `${ganchoTopo}\n\n${p1}\n\n${p2}\n\n${chamadaFinal}`;
  return { ganchoTopo, corpoSinopse: `${p1}\n\n${p2}`, chamadaFinal, textoFormatadoCompleto };
}

/**
 * Gera os dois Master Prompts de Capa (1. Apenas Capa Frontal | 2. Capa + Lombada + Contracapa em Total Sintonia)
 * com especificações técnicas profissionais de impressão e publicação digital (sem citar nomes de plataformas).
 */
export function gerarMasterPromptCapa600a1200Palavras(
  input: CoverMasterPromptInput
): CoverMasterPromptOutput {
  const titulo = input.titulo.trim() || 'Obra Literária';
  const subtitulo = input.subtitulo?.trim() || 'Uma jornada inesquecível através do desconhecido';
  const autor = input.autor.trim() || 'Autor Bestseller';
  const generoRaw = (input.genero || 'Geral').trim();
  const premissa = input.premissa?.trim() || `Narrativa envolvente centrada em ${titulo}.`;
  const isEn = Boolean(input.idioma && /ingl|en/i.test(input.idioma));

  const g = generoRaw.toLowerCase();

  // Diretrizes específicas por gênero (o gênero dita soberanamente o estilo da capa e da contracapa)
  let generoNome = 'Geral';
  let estiloRecomendado = '';
  let fonteTituloSugerida = '';
  let paletaCoresSugerida: string[] = [];
  let iluminacaoCenica = '';
  let composicaoFundo = '';
  let composicaoContracapa = '';
  let texturaTipografica = '';

  if (g.includes('thriller') || g.includes('suspense') || g.includes('policial') || g.includes('mister') || g.includes('crime')) {
    generoNome = isEn ? 'Psychological Thriller & Suspense' : 'Thriller Psicológico e Suspense';
    estiloRecomendado = isEn ? 'Cinematic Neo-Noir Mystery' : 'Mistério Neo-Noir Cinematográfico';
    fonteTituloSugerida = 'Impact, Bebas Neue ou Montserrat Bold com textura de erosão e desgaste sutil (distressed/grunge edge)';
    paletaCoresSugerida = ['#090d16 (Preto Obsidiana)', '#dc2626 (Vermelho Carmesim Sangue)', '#f8fafc (Branco Giz Frio)', '#f59e0b (Âmbar de Luz na Janela)', '#1e293b (Ardósia Profunda)'];
    iluminacaoCenica = isEn
      ? 'Chiaroscuro high-contrast lighting with cold atmospheric mist, slivers of pale moonlight slicing through shadows, and a single warm tungsten ember glow emanating from a solitary focal point.'
      : 'Iluminação chiaroscuro de altíssimo contraste, névoa volumétrica gélida, feixes de luar prateado cortando a penumbra e um único foco de luz âmbar quente emanando de um ponto focal solitário.';
    composicaoFundo = isEn
      ? 'Atmospheric nocturnal scene shrouded in rolling mist, slick wet asphalt or weathered dark timber architecture reflecting dim ambient light, deep cinematic shadows.'
      : 'Cenário noturno envolto em neblina espessa, arquitetura sombria ou asfalto úmido refletindo luzes difusas na madrugada, camadas profundas de sombra e mistério.';
    composicaoContracapa = isEn
      ? 'Seamless continuation of the nocturnal mist and deep obsidian-slate shadows from the front cover, softly defocused into a rich matte dark-teal and charcoal atmospheric backdrop with subtle volumetric fog along the bottom edge, ensuring crystal-clear legibility for the back-cover blurb.'
      : 'Continuação orgânica e ininterrupta da neblina noturna e das sombras em preto obsidiana e ardósia da capa frontal, suavizada com desfoque óptico de lente 85mm (bokeh cinematográfico escuro) e vinheta fosca aveludada para garantir contraste e legibilidade absoluta da breve leitura na contracapa.';
    texturaTipografica = isEn
      ? 'Distressed weathered texture on title lettering, subtle micro-chipping along letter edges evoking tension and imminent danger.'
      : 'Textura levemente desgastada no título, conferindo sensação de tensão psicológica, segredo oculto e perigo iminente.';
  } else if (g.includes('romance') || g.includes('drama') || g.includes('poesia') || g.includes('amor')) {
    generoNome = isEn ? 'Literary Romance & Drama' : 'Romance Literário e Drama Emocional';
    estiloRecomendado = isEn ? 'Warm Atmospheric Fine-Art Editorial' : 'Fine-Art Editorial Caloroso e Intimista';
    fonteTituloSugerida = 'Playfair Display, Cormorant Garamond ou Cinzel com ligaduras elegantes e serifa refinada';
    paletaCoresSugerida = ['#451a03 (Terracota Profundo)', '#fef3c7 (Ouro Marfim Pálido)', '#f43f5e (Rosa Pétala Suave)', '#38bdf8 (Azul Crepúsculo)', '#1e293b (Azul Marinho)'];
    iluminacaoCenica = isEn
      ? 'Luminous golden-hour sunset, soft diffused natural daylight casting gentle organic foliage shadows, delicate lens flare, and warm cinematic depth of field.'
      : 'Luz dourada mágica de golden hour ao entardecer, sombras botânicas suaves e translúcidas, leve flare óptico natural e profundidade de campo que evoca saudade e beleza.';
    composicaoFundo = isEn
      ? 'Sun-drenched coastal terrace overlooking tranquil waters or misty heritage botanical garden, billowing natural linen, tactile petals.'
      : 'Terraço iluminado pelo pôr do sol ou jardim botânico orvalhado na alvorada, tecidos leves de linho ao vento e atmosfera de romance poético.';
    composicaoContracapa = isEn
      ? 'Harmonic extension of the warm twilight sky and soft botanical silhouettes from the front cover, transitioning into a deep velvety terracotta and midnight-blue gradient zone that frames the back-cover reading text with elegance.'
      : 'Extensão harmônica do céu crepuscular dourado e das sombras botânicas suaves da capa frontal, fundindo-se em uma superfície aveludada em tons de azul-marinho profundo e terracota escuro que emoldura a leitura da contracapa com máxima nitidez.';
    texturaTipografica = isEn
      ? 'Crisp refined serif letterforms with subtle gold foil sheen or soft matte ivory finish, evoking literary prestige.'
      : 'Tipografia serifada de alto luxo com acabamento marfim luminoso ou toque dourado sutil, digno das mais nobres edições literárias.';
  } else if (g.includes('sci-fi') || g.includes('ficcao') || g.includes('ficção') || g.includes('cyber') || g.includes('futuro')) {
    generoNome = isEn ? 'Science Fiction & Cyberpunk' : 'Ficção Científica e Futurismo';
    estiloRecomendado = isEn ? 'Futuristic Crystalline Concept Art' : 'Concept Art Futurista e Atmosférico';
    fonteTituloSugerida = 'Orbitron, Montserrat Ultra-Bold ou Inter Display condensado moderno';
    paletaCoresSugerida = ['#020617 (Espaço Profundo)', '#38bdf8 (Ciano Neon)', '#a855f7 (Violeta Cósmico)', '#f1f5f9 (Titânio Branco)', '#0f172a (Grafite Espacial)'];
    iluminacaoCenica = isEn
      ? 'Bioluminescent volumetric lighting, atmospheric cyan and amber anamorphic lens flares, iridescent rim lighting on brushed metallic textures.'
      : 'Iluminação volumétrica bioluminescente, feixes anamórficos de luz ciano e âmbar, contra-luz suave em superfícies de titânio escovado e reflexos nebulares.';
    composicaoFundo = isEn
      ? 'Biophilic megacity spires piercing through low atmospheric storm clouds, sleek orbital transport trails, distant planetary rings on a twilight horizon.'
      : 'Metrópole futurista com espirais arquitetônicas arrojadas furando nuvens crepusculares, trilhas de luz e horizonte com nebulosa cósmica.';
    composicaoContracapa = isEn
      ? 'Continuous wraparound extension of the deep-space horizon and subtle cyan anamorphic light streaks, settling into a clean dark-graphite and cosmic-indigo panel on the back cover for effortless reading of the synopsis.'
      : 'Continuação panorâmica do horizonte espacial profundo e dos feixes anamórficos ciano da capa frontal, suavizando-se em um painel grafite-espacial fosco na contracapa para leitura perfeita da sinopse.';
    texturaTipografica = isEn
      ? 'Polished aerospace titanium finish with crisp edge bevels and subtle interior chromatic glow.'
      : 'Acabamento em titânio polido de precisão aeroespacial, chanfros limpos e brilho eletrostático sutil nas bordas internas.';
  } else if (g.includes('fantasia') || g.includes('epico') || g.includes('épico') || g.includes('magia')) {
    generoNome = isEn ? 'High Fantasy & Epic' : 'Alta Fantasia e Épico Mitológico';
    estiloRecomendado = isEn ? 'Mythic Painterly Epic Illustration' : 'Ilustração Épica Pintórica de Fantasia';
    fonteTituloSugerida = 'Cinzel Decorative, Trajan Pro ou Playfair Display Bold';
    paletaCoresSugerida = ['#0f172a (Meia-Noite Ancestral)', '#f59e0b (Ouro Real Envelhecido)', '#065f46 (Esmeralda Profundo)', '#e2e8f0 (Prata Estelar)', '#451a03 (Bronze)'];
    iluminacaoCenica = isEn
      ? 'Radiant ethereal dawn breaking over craggy alpine peaks, glowing runes casting subtle mystical illumination, crepuscular rays piercing enchanted mists.'
      : 'Raios crepusculares rompendo a névoa ancestral sobre picos montanhosos escarpados, brilho místico suave e atmosfera de magia antiga.';
    composicaoFundo = isEn
      ? 'Towering ancient stone citadel carved into sheer mountain cliffs, sea of clouds below, mythical silhouettes soaring in distant skies.'
      : 'Cidadela esculpida na rocha de montanhas alpinas, mar de nuvens aos pés da fortaleza e vastidão mítica que promete uma grande saga épica.';
    composicaoContracapa = isEn
      ? 'Seamless wrap of the enchanted mountain mist and antique gold filigree border onto the back cover, opening into a dark emerald-midnight parchment texture that highlights the back-cover blurb.'
      : 'Transição contínua da névoa das montanhas e de discretos ornamentos em ouro envelhecido para a contracapa, abrindo uma área central em azul meia-noite e esmeralda profundo para destacar a breve leitura da obra.';
    texturaTipografica = isEn
      ? 'Chiseled antique gold foil with micro-embossing and regal weathered stone patina.'
      : 'Entalhe clássico em ouro envelhecido com textura de pedra nobre e micro-relevo de edição de colecionador.';
  } else if (g.includes('finan') || g.includes('negoc') || g.includes('gestao') || g.includes('gestão') || g.includes('lider')) {
    generoNome = isEn ? 'Business, Leadership & Wealth' : 'Negócios, Finanças e Liderança';
    estiloRecomendado = isEn ? 'Corporate Prestige Architectural Minimalism' : 'Minimalismo Arquitetônico de Prestígio Corporativo';
    fonteTituloSugerida = 'Montserrat Extra-Bold, Oswald ou Inter com kerning estrito';
    paletaCoresSugerida = ['#0f172a (Azul Marinho Corporativo)', '#0284c7 (Azul Safira Líquido)', '#ffffff (Branco Puro Editorial)', '#d97706 (Ouro Nobre de Investimento)', '#334155 (Ardósia)'];
    iluminacaoCenica = isEn
      ? 'Crisp natural morning daylight with sharp specular architectural highlights, clear infinite blue sky evoking intellectual clarity and strategic mastery.'
      : 'Luz natural matinal límpida e cristalina, reflexos especulares em vidro e aço, horizonte azul aberto simbolizando visão estratégica, clareza e autoridade.';
    composicaoFundo = isEn
      ? 'Towering crystalline monolith of glass and brushed platinum soaring toward pristine skies, dynamic vertical upward perspective, minimalist symmetry.'
      : 'Monólito geométrico de vidro e platina ascendendo em direção ao céu aberto, perspectiva vertical dinâmica e simetria arquitetônica contemporânea.';
    composicaoContracapa = isEn
      ? 'Clean architectural continuation of the deep corporate navy and brushed platinum geometry from the front cover, structured with a refined gold accent line and generous matte dark-navy reading space on the back cover.'
      : 'Continuação arquitetônica sóbria do azul-marinho corporativo e da geometria em platina escovada da capa frontal, com filete sutil em ouro nobre e amplo espaço fosco de altíssimo contraste para a leitura de contracapa.';
    texturaTipografica = isEn
      ? 'Matte white embossed typography with subtle drop shadow and gold accent underline, exuding authority and trust.'
      : 'Tipografia em branco fosco imponente com sutil sombra de profundidade e acento dourado, transmitindo prestígio e autoridade definitiva.';
  } else if (g.includes('autoajuda') || g.includes('desenvolvimento') || g.includes('habito') || g.includes('mente')) {
    generoNome = isEn ? 'Personal Growth & Mindset' : 'Desenvolvimento Pessoal e Mentalidade';
    estiloRecomendado = isEn ? 'Inspirational Serene Horizon' : 'Horizonte Inspirador e Clareza Interior';
    fonteTituloSugerida = 'Montserrat Semi-Bold, Inter ou Cormorant Garamond elegante';
    paletaCoresSugerida = ['#0f172a (Azul Noturno)', '#f59e0b (Luz da Alvorada)', '#0d9488 (Teal Sereno)', '#ffffff (Branco Cristalino)', '#f1f5f9 (Névoa Suave)'];
    iluminacaoCenica = isEn
      ? 'Gentle radiant sunrise breaking through morning mist over a tranquil mountain ridge, warm golden rays instilling hope, clarity, and transformation.'
      : 'Alvorada radiante e acolhedora rompendo a névoa matinal sobre o topo de uma colina pacífica, raios solares que inspiram renovação, clareza e paz mental.';
    composicaoFundo = isEn
      ? 'Winding peaceful path leading through organic landscape toward a glowing dawn horizon, balanced zen composition with ample breathing space.'
      : 'Caminho sinuoso em meio à natureza serena conduzindo o olhar em direção ao horizonte iluminado pela alvorada, composição zen com equilíbrio visual.';
    composicaoContracapa = isEn
      ? 'Unified horizon extending across the spine onto the back cover, where the serene teal and deep dawn-blue sky creates a calm, luminous canvas for the back-cover reading text.'
      : 'Horizonte sereno que atravessa a lombada até a contracapa, onde o degradê entre azul-alvorada e verde-sereno cria um fundo limpo, calmo e acolhedor para a leitura da sinopse.';
    texturaTipografica = isEn
      ? 'Clean, spacious modern typography with luminous gradient and pristine contrast.'
      : 'Tipografia limpa e arejada com gradiente luminoso suave, contraste impecável e elegância atemporal.';
  } else {
    generoNome = isEn ? 'Literary Fiction & Contemporary' : 'Ficção Literária e Contemporânea';
    estiloRecomendado = isEn ? 'Artistic Fine-Art Narrative' : 'Narrativa Artística Fine-Art Cinematográfica';
    fonteTituloSugerida = 'Playfair Display, Montserrat Bold ou Georgia com serifa de prestígio';
    paletaCoresSugerida = ['#0f172a (Ardósia Profunda)', '#d97706 (Âmbar Envelhecido)', '#ffffff (Branco Giz)', '#334155 (Grafite Editorial)', '#e2e8f0 (Cinza Claro)'];
    iluminacaoCenica = isEn
      ? 'Subtle studio directional gallery light, tactile organic textures, rich painterly depth.'
      : 'Luz direcional dramática de galeria de arte, texturas táteis orgânicas e rica profundidade pictórica.';
    composicaoFundo = isEn
      ? 'Thoughtfully staged conceptual setting inspired by the central premise, with fine-art visual balance.'
      : 'Cenografia conceitual marcante inspirada no enredo central, com equilíbrio visual de cinema e literatura de prestígio.';
    composicaoContracapa = isEn
      ? 'Seamless chromatic and atmospheric extension of the front cover artwork across the spine into a unified dark-slate matte back cover panel designed for optimal reading of the book blurb.'
      : 'Extensão cromática e atmosférica contínua da arte da capa frontal através da lombada até formar um painel fosco em ardósia profunda na contracapa, projetado para leitura cristalina da sinopse.';
    texturaTipografica = isEn
      ? 'Refined editorial letterforms with high tactile contrast.'
      : 'Formas tipográficas editoriais refinadas com alto contraste tátil.';
  }

  // Constrói a Breve Leitura da Contracapa personalizada para o livro
  const leituraContracapa = construirBreveLeituraContracapa(titulo, subtitulo, autor, generoRaw, premissa, isEn);
  const authorDisplay = isEn ? `Author: ${autor}` : `Por ${autor}`;

  // ============================================================================
  // MODO 1: MASTER PROMPT — APENAS CAPA FRONTAL (FRONT COVER ONLY)
  // ============================================================================
  const secao1_Visao = isEn
    ? `### 1. EDITORIAL IDENTITY & FRONT COVER ART DIRECTION DOSSIER
- **Book Title**: "${titulo}"
- **Commercial Subtitle**: "${subtitulo}"
- **Author Credit**: "${autor}"
- **Literary Genre**: ${generoNome}
- **Editorial Quality Standard**: International bestseller publishing standard (high-conversion thumbnail legibility, volumetric lighting, tactile photorealism, and rigorous typographic hierarchy). The book's genre and narrative premise sovereignly govern the scenery, color palette, mood, and typeface family.
- **Visual Aesthetic**: ${estiloRecomendado}
- **Core Premise**: "${premissa}"
- **Visual Hook**: Immediate emotional magnetism engineered for both digital storefronts and physical bookstore display.`
    : `### 1. DOSSIÊ DE DIREÇÃO DE ARTE — APENAS CAPA FRONTAL
- **Título Oficial da Obra**: "${titulo}"
- **Subtítulo Comercial**: "${subtitulo}"
- **Nome do Autor**: "${autor}"
- **Gênero Literário**: ${generoNome}
- **Padrão de Excelência Editorial**: Acabamento de best-seller internacional para publicação impressa e digital (contraste imediato em miniatura de catálogo, iluminação volumétrica, realismo tátil e hierarquia tipográfica rigorosa). O gênero específico da obra e sua premissa ditam soberanamente o cenário, a paleta cromática, a atmosfera e a família tipográfica.
- **Estilo Visual Recomendado**: ${estiloRecomendado}
- **Premissa Central**: "${premissa}"
- **Gancho Visual**: Promessa estética magnética e imediata, projetada para capturar a atenção do leitor no primeiro olhar.`;

  const secao2_Cenografia = isEn
    ? `### 2. FRONT COVER SCENOGRAPHY & COMPOSITIONAL ZONES
- **Environment & Subject**: ${composicaoFundo}
- **Camera & Optical Framing**: Vertical 2:3 full-bleed composition shot on an 80mm medium-format lens, shallow depth of field, rich foreground-to-background separation, authentic physical material textures.
- **Typographic Safe Zones**:
  • **Upper Third (y: 12% to 26%)**: Composed with controlled tonal contrast to anchor the monumental Book Title "${titulo}".
  • **Central Focal Area (y: 28% to 72%)**: Main dramatic visual subject with zero text obstruction.
  • **Lower Third (y: 74% to 92%)**: Shadowed, high-contrast base zone housing the Subtitle "${subtitulo}" and the Author credit "${autor}" inside print safety margins.
- **Strict Negative Rules**: NO GIBBERISH TEXT, NO EXTRA WORDS, NO WATERMARKS, NO LOGOS, NO MEDALS, NO SEALS, NO 3D MOCKUP FRAMES. Render as a flat, full-bleed 2D print-ready front cover.`
    : `### 2. CENOGRAFIA E ZONAS DE COMPOSIÇÃO DA CAPA FRONTAL
- **Ambientação e Cenário**: ${composicaoFundo}
- **Lente e Enquadramento Óptico**: Composição vertical 2:3 em sangria total (full-bleed), fotografada com lente 80mm de médio formato, profundidade de campo cinematográfica e texturas físicas autênticas.
- **Zonas de Respiração e Segurança Tipográfica**:
  • **Terço Superior (y: 12% a 26%)**: Área com contraste controlado para ancorar de forma monumental o Título "${titulo}".
  • **Centro Focal (y: 28% a 72%)**: Ponto focal dramático da arte totalmente livre de poluição visual.
  • **Quadrante Inferior (y: 74% a 92%)**: Base sombreada de alto contraste para acomodar o Subtítulo "${subtitulo}" e a assinatura do Autor "${autor}" respeitando a margem interna de segurança de corte.
- **Regras Negativas Inegociáveis**: NENHUM TEXTO DEFORMADO (NO GIBBERISH), NENHUMA PALAVRA EXTRA, NENHUM SELO, NENHUMA MEDALHA, NENHUM LOGOTIPO, NENHUMA MARCA D'ÁGUA, NENHUM MOCKUP 3D INCLINADO. A imagem deve ser a arte plana 2D da capa frontal pronta para corte e publicação.`;

  const secao3_Iluminacao = isEn
    ? `### 3. LIGHTING DESIGN & CALIBRATED COLOR GRADE
- **Lighting Atmosphere**: ${iluminacaoCenica}
- **Color Palette Specification**:
${paletaCoresSugerida.map(c => `  • ${c}`).join('\n')}
- **Tonal Contrast**: Deep cinematic shadows paired with targeted specular highlights to guarantee instant readability at both full resolution (300 DPI print) and small catalog thumbnail sizes.`
    : `### 3. DESIGN DE ILUMINAÇÃO E PALETA CROMÁTICA CALIBRADA
- **Atmosfera de Luz**: ${iluminacaoCenica}
- **Especificação da Paleta de Cores**:
${paletaCoresSugerida.map(c => `  • ${c}`).join('\n')}
- **Contraste e Separação Tonal**: Equilíbrio preciso entre sombras densas e pontos de luz especulares, garantindo leitura instantânea tanto na impressão física a 300 DPI quanto em miniaturas de vitrines digitais.`;

  const secao4_Tipografia = isEn
    ? `### 4. FRONT COVER TYPOGRAPHY & HIERARCHY
- **1. Main Title (Upper Third)**:
  • **Exact Text**: "${titulo}"
  • **Typeface & Treatment**: ${fonteTituloSugerida}. ${texturaTipografica}
- **2. Commercial Subtitle (Lower Quadrant, Above Author)**:
  • **Exact Text**: "${subtitulo}"
  • **Typeface**: Clean high-contrast editorial serif or sans-serif with balanced kerning.
- **3. Author Byline (Baseline Footer)**:
  • **Exact Text**: "${autor}"
  • **Typeface**: Distinguished small caps with generous tracking.`
    : `### 4. ARQUITETURA TIPOGRÁFICA DA CAPA FRONTAL
- **1. Título Principal (Terço Superior)**:
  • **Texto Exato**: "${titulo}"
  • **Fonte e Acabamento**: ${fonteTituloSugerida}. ${texturaTipografica}
- **2. Subtítulo Comercial (Quadrante Inferior, Acima do Autor)**:
  • **Texto Exato**: "${subtitulo}"
  • **Fonte**: Tipografia editorial límpida de alto contraste e leitura imediata.
- **3. Nome do Autor (Base da Capa)**:
  • **Texto Exato**: "${autor}"
  • **Fonte**: Versalete nobre com espaçamento equilibrado entre letras.`;

  const promptTecnicoMotor = [
    `Flat 2D full-bleed bestselling book FRONT COVER artwork (vertical 2:3 aspect ratio, 1600x2400 pixels, 300 DPI print-ready quality) for "${titulo}".`,
    `Literary Genre: ${generoNome}. Visual Style: ${estiloRecomendado}.`,
    `Typography rendered with flawless spelling directly on the Front Cover:`,
    `- Top Title (upper third, dominant scale): "${titulo}" set in ${fonteTituloSugerida}, ${texturaTipografica}`,
    `- Subtitle (lower third, above author): "${subtitulo}" in crisp high-contrast editorial lettering.`,
    `- Author Name (bottom baseline): "${autor}" in distinguished small caps.`,
    `Scene & Environment: ${composicaoFundo}`,
    `Lighting & Color Grade: ${iluminacaoCenica} Palette: ${paletaCoresSugerida.join(', ')}.`,
    `Technical Directives: 80mm medium-format lens, subtle 35mm film grain, minimum 0.25-inch safe margin from edges for all text, 0.125-inch full bleed background extension, zero 3D book mockup, zero extra random words, ultra-sharp commercial publishing finish.`,
    `MANDATORY NEGATIVE RULES: NO BARCODE, NO QR CODE, NO BARCODE BOX, NO WHITE BOX, NO WHITE RECTANGLE, NO BLANK BOX, NO CUTOUT, NO STICKER, NO EMPTY WHITE SPACE. Full-bleed continuous artwork edge-to-edge. --no barcode, barcode box, white box, white rectangle, blank box, blank space, qr code, sticker, label, cutout, white square`
  ].join('\n\n');

  const secao6_Diretrizes = isEn
    ? `### 6. TECHNICAL PRINT & DIGITAL SPECIFICATIONS
- **Dimensions & Resolution**: 1600 x 2400 pixels (or 1800 x 2700 px for 6x9 in at 300 DPI) with 0.125 in (3.2 mm) outer bleed and 0.25 in (6.4 mm) inner text safety margin.
- **Aspect Ratio**: Vertical 2:3 (1:1.5), flat 2D artwork without 3D perspective frames.`
    : `### 6. ESPECIFICAÇÕES TÉCNICAS DE IMPRESSÃO E PUBLICAÇÃO DIGITAL
- **Dimensões e Resolução**: 1600 x 2400 pixels (ou 1800 x 2700 px equivalente ao formato 15,24 x 22,86 cm / 6x9 pol a 300 DPI), com sangria externa de 3,2 mm (0.125 pol) e margem interna de segurança tipográfica de 6,4 mm (0.25 pol).
- **Proporção**: Vertical 2:3 (1:1.5), arte plana 2D sem molduras ou mockups tridimensionais.`;

  let promptCompleto = [
    secao1_Visao,
    secao2_Cenografia,
    secao3_Iluminacao,
    secao4_Tipografia,
    isEn
      ? `### 5. AI IMAGE ENGINE PROMPT — FRONT COVER ONLY\n\`\`\`text\n${promptTecnicoMotor}\n\`\`\``
      : `### 5. PROMPT DIRETO PARA MOTOR DE IA — APENAS CAPA FRONTAL\n\`\`\`text\n${promptTecnicoMotor}\n\`\`\``,
    secao6_Diretrizes
  ].join('\n\n');

  let totalPalavras = contarPalavras(promptCompleto);
  if (totalPalavras < 650) {
    const aprofundamento = isEn
      ? `\n\n### 7. MICRO-TEXTURE & VISUAL CONTINUITY NOTES\nEvery surface in the composition must exhibit authentic physical materiality—moisture sheen, subtle atmospheric haze, and controlled depth of field—so the front cover commands immediate authority while leaving clean tonal zones for the title "${titulo}", subtitle "${subtitulo}", and author "${autor}".`
      : `\n\n### 7. DETALHAMENTO DE TEXTURAS TÁTEIS E EQUILÍBRIO ÓPTICO\nPara que a capa frontal de "${titulo}" atinja padrão de excelência gráfica internacional, o primeiro plano deve apresentar texturas físicas autênticas e tridimensionais, enquanto o plano médio sustenta o símbolo visual central da narrativa sem competir com a leitura do título. As bordas externas mantêm extensão contínua de sangria (3,2 mm) sem elementos críticos próximos à linha de refilo, garantindo acabamento impecável tanto na edição digital quanto na tiragem impressa em papel couchê ou acabamento fosco aveludado.`;
    promptCompleto += aprofundamento;
    totalPalavras = contarPalavras(promptCompleto);
  }

  // ============================================================================
  // MODO 2: MASTER PROMPT COMPLETO — CAPA FRONTAL + LOMBADA + CONTRACAPA
  // EM TOTAL SINTONIA + BREVE LEITURA NA CONTRACAPA
  // ============================================================================
  const promptCapaEContracapaMotorIa = [
    `Full wraparound open paperback book cover spread (flat 2D print-ready layout, horizontal aspect ratio 16:9 / 3250x2350 pixels at 300 DPI, comprising LEFT PANEL = BACK COVER, CENTER STRIP = SPINE, RIGHT PANEL = FRONT COVER) in 100% visual, chromatic, lighting, and typographic harmony for the book "${titulo}".`,
    `Unified Genre & Aesthetic Across Entire Spread: ${generoNome} — ${estiloRecomendado}. Continuous seamless wraparound background artwork flowing uninterruptedly from the Right Front Cover across the Center Spine to the Left Back Cover.`,
    `1. RIGHT PANEL — FRONT COVER (47% width on the right):`,
    `- Main focal scene: ${composicaoFundo}`,
    `- Lighting: ${iluminacaoCenica}`,
    `- Front Cover Typography: Large dominant Title "${titulo}" in the upper third (${fonteTituloSugerida}); Subtitle "${subtitulo}" in the lower quadrant; Author "${autor}" at the bottom baseline.`,
    `2. CENTER PANEL — BOOK SPINE (6% width in the exact vertical center, defined by subtle vertical fold guides):`,
    `- Continuous dark-toned background texture connecting front and back covers.`,
    `- Vertical spine text reading "${titulo}" in matching title font and "${autor}" near the lower spine, respecting a 1.6mm safety margin from spine fold lines.`,
    `3. LEFT PANEL — BACK COVER WITH SYNOPSIS READING (47% width on the left, in 100% harmony with Front Cover):`,
    `- Back Cover Visual Scenography: ${composicaoContracapa}`,
    `- Back Cover Upper Hook Headline (bold accent color at top of back cover): "${leituraContracapa.ganchoTopo}"`,
    `- Back Cover Brief Reading / Synopsis Block (centered in a clean, high-contrast typographic zone with generous 12.7mm outer safe margins, set in crisp readable editorial serif/sans-serif):`,
    `"${leituraContracapa.corpoSinopse.replace(/\n+/g, ' ')}"`,
    `- Back Cover Closing Editorial Line: "${leituraContracapa.chamadaFinal}"`,
    `- 100% Full-Bleed Artwork on Back Cover: Continuous, edge-to-edge textured background filling every corner and extending fully to the bottom and side borders.`,
    `Color Palette Unifying Front, Spine & Back: ${paletaCoresSugerida.join(', ')}.`,
    `MANDATORY STRICT PROHIBITIONS & NEGATIVE RULES: ABSOLUTELY NO BARCODE, NO BARCODE BOX, NO BARCODE RECTANGLE, NO WHITE BOX, NO WHITE RECTANGLE, NO BLANK BOX, NO BLANK SPACE, NO PLACEHOLDER RECTANGLE, NO CUTOUT, NO STICKER, NO WHITE SQUARE, NO BLANK AREA FOR BARCODE. The artwork, rich scenery, and dark background textures must cover 100% of the back cover right to the bottom edge without any empty white rectangles or blank cutouts. Amazon KDP stamps the barcode automatically during physical printing. Zero 3D perspective distortion, zero background room/table mockup, flat 2D press sheet, 8k editorial print production quality. --no barcode, barcode box, white box, white rectangle, blank box, blank space, qr code, sticker, label, cutout, white square`
  ].join('\n\n');

  const promptContracapaIsoladaMotorIa = [
    `Flat 2D full-bleed book BACK COVER artwork (vertical 2:3 aspect ratio, 1600x2400 pixels, 300 DPI print-ready) designed as the exact chromatic, atmospheric, and stylistic twin of the front cover for "${titulo}" by ${autor}.`,
    `Genre & Visual Harmony: ${generoNome} — ${estiloRecomendado}. Palette: ${paletaCoresSugerida.join(', ')}.`,
    `Back Cover Environment & Composition: ${composicaoContracapa}`,
    `Back Cover Typography & Brief Reading (Synopsis) Layout:`,
    `- Top Hook Headline (upper zone, bold accent lettering): "${leituraContracapa.ganchoTopo}"`,
    `- Central Brief Reading / Synopsis Text (middle zone, clean high-contrast editorial typography over a softly darkened atmospheric area): "${leituraContracapa.corpoSinopse.replace(/\n+/g, ' ')}"`,
    `- Closing Editorial Note (below synopsis): "${leituraContracapa.chamadaFinal}"`,
    `- 100% Continuous Illustrated Surface: Full rich atmospheric illustration flowing across the whole surface edge-to-edge.`,
    `Technical Directives: 100% visual continuity with the front cover's lighting (${iluminacaoCenica}), 0.25-inch inner text safety margin, 0.125-inch full bleed, flat 2D print-ready back cover, no 3D mockup.`,
    `MANDATORY STRICT NEGATIVE PROHIBITIONS: ABSOLUTELY NO BARCODE, NO BARCODE BOX, NO WHITE BOX, NO WHITE RECTANGLE, NO BLANK BOX, NO BLANK SPACE, NO PLACEHOLDER RECTANGLE, NO WHITE SQUARE, NO EMPTY WHITE SPACE. The illustration and textured background must extend 100% edge-to-edge across the entire back cover right to the bottom and corners without any empty cutout or white frame. Amazon KDP stamps the barcode during physical printing. --no barcode, barcode box, white box, white rectangle, blank box, blank space, qr code, sticker, label, cutout, white square`
  ].join('\n\n');

  const promptCapaEContracapaCompleto = isEn
    ? [
        `### 1. COMPLETE WRAPAROUND COVER DOSSIER (FRONT COVER + SPINE + BACK COVER IN TOTAL HARMONY)`,
        `- **Book Title**: "${titulo}"`,
        `- **Subtitle**: "${subtitulo}"`,
        `- **Author**: "${autor}"`,
        `- **Genre & Aesthetic**: ${generoNome} — ${estiloRecomendado}`,
        `- **Total Harmony Principle**: The Front Cover (Right), Spine (Center), and Back Cover (Left) form a single, continuous panoramic work of editorial art. They share the exact same color grade (${paletaCoresSugerida.join(', ')}), lighting physics, atmospheric particles, and typographic DNA.`,
        ``,
        `### 2. CURATED BACK-COVER BRIEF READING (BLURB / SYNOPSIS READY FOR THE BACK COVER)`,
        `- **Top Hook Headline (Upper Back Cover)**:`,
        `  "${leituraContracapa.ganchoTopo}"`,
        `- **Main Back-Cover Reading / Synopsis (Center Back Cover)**:`,
        `  "${leituraContracapa.corpoSinopse}"`,
        `- **Closing Editorial Line (Lower Back Cover)**:`,
        `  "${leituraContracapa.chamadaFinal}"`,
        ``,
        `### 3. THREE-PANEL SPATIAL ARCHITECTURE (PRINT-ON-DEMAND & EDITORIAL STANDARD)`,
        `- **PANEL A — BACK COVER (LEFT SIDE OF SPREAD)**:`,
        `  • **Visual Continuation**: ${composicaoContracapa}`,
        `  • **Typography Layout**: Upper hook headline in accent color, central synopsis set in crisp 10.5pt–11.5pt editorial serif/sans-serif with 1.45 line height, and closing authority line above the footer.`,
        `  • **Continuous Artwork**: Full illustrated background across the panel, without artificial white box cutouts.`,
        `- **PANEL B — SPINE / LOMBADA (CENTER VERTICAL STRIP)**:`,
        `  • **Visual Bridge**: Seamless transition of the background texture and lighting between front and back panels.`,
        `  • **Spine Typography**: Vertical Title "${titulo}" and Author "${autor}" centered with a minimum 0.0625 in (1.6 mm) safe margin from fold lines.`,
        `- **PANEL C — FRONT COVER (RIGHT SIDE OF SPREAD)**:`,
        `  • **Main Focal Artwork**: ${composicaoFundo}`,
        `  • **Lighting**: ${iluminacaoCenica}`,
        `  • **Front Typography**: Monumental Title "${titulo}" in the upper third (${fonteTituloSugerida}), Subtitle "${subtitulo}" in the lower quadrant, and Author "${autor}" along the baseline.`,
        ``,
        `### 4. TECHNICAL PRINT SPECIFICATIONS (6x9 IN / 15.24 x 22.86 CM STANDARD AT 300 DPI)`,
        `- **Bleed (Sangria)**: 0.125 in (3.2 mm) continuous artwork extension beyond all four outer trim edges.`,
        `- **Safe Margin (Margem de Segurança)**: Minimum 0.25 in (6.4 mm) to 0.5 in (12.7 mm) inside trim lines for all text and critical elements.`,
        `- **Format**: Flat 2D full-bleed press layout (no 3D mockups, no watermarks, no random text).`,
        `- **Mandatory Negative Prohibition**: ABSOLUTELY NO BARCODES, NO BARCODE BOXES, NO WHITE BOXES, NO WHITE RECTANGLES, NO BLANK BOXES, NO PLACEHOLDER RECTANGLES. 100% full continuous background illustration across the entire back cover.`,
        ``,
        `### 5. AI ENGINE PROMPT — FULL WRAPAROUND SPREAD (FRONT + SPINE + BACK COVER TOGETHER)`,
        `\`\`\`text\n${promptCapaEContracapaMotorIa}\n\`\`\``,
        ``,
        `### 6. AI ENGINE PROMPT — MATCHING BACK COVER ONLY (2:3 VERTICAL COMPANION)`,
        `\`\`\`text\n${promptContracapaIsoladaMotorIa}\n\`\`\``
      ].join('\n')
    : [
        `### 1. DOSSIÊ DE CAPA COMPLETA ABERTA (CAPA FRONTAL + LOMBADA + CONTRACAPA EM TOTAL SINTONIA)`,
        `- **Título da Obra**: "${titulo}"`,
        `- **Subtítulo Comercial**: "${subtitulo}"`,
        `- **Nome do Autor**: "${autor}"`,
        `- **Gênero e Direção Estética**: ${generoNome} — ${estiloRecomendado}`,
        `- **Princípio de Sintonia Absoluta (100% Coesão Visual)**: A Capa Frontal (lado direito), a Lombada (centro) e a Contracapa (lado esquerdo) constituem uma única pintura panorâmica contínua. Compartilham rigorosamente a mesma paleta cromática (${paletaCoresSugerida.join(', ')}), a mesma física de iluminação, a mesma atmosfera climática e a mesma identidade tipográfica.`,
        ``,
        `### 2. BREVE LEITURA DA CONTRACAPA (TEXTO OFICIAL DE QUARTA CAPA EM SINTONIA COM A OBRA)`,
        `- **Frase de Impacto / Gancho no Topo da Contracapa**:`,
        `  "${leituraContracapa.ganchoTopo}"`,
        `- **Corpo da Breve Leitura / Sinopse Persuasiva (Centro da Contracapa)**:`,
        `  "${leituraContracapa.corpoSinopse}"`,
        `- **Fecho de Autoridade Editorial (Base da Sinopse)**:`,
        `  "${leituraContracapa.chamadaFinal}"`,
        ``,
        `### 3. ARQUITETURA DOS 3 PAINÉIS (CONTRACAPA + LOMBADA + CAPA FRONTAL)`,
        `- **PAINEL ESQUERDO — CONTRACAPA (QUARTA CAPA)**:`,
        `  • **Continuidade Cenográfica**: ${composicaoContracapa}`,
        `  • **Diagramação da Leitura de Contracapa**: No topo, o gancho "${leituraContracapa.ganchoTopo}" em caixa-alta com cor de destaque da paleta; no centro, o texto da breve leitura alinhado com margens generosas de 12,7 mm sobre área de sombra suave e uniforme para leitura cristalina; logo abaixo, o fecho autoral de ${autor}.`,
        `  • **Arte Contínua na Contracapa**: Ilustração rica e contínua em toda a extensão da contracapa, sem corte de caixa branca nem retângulo artificial de código de barras. A Amazon KDP realiza a estampagem na impressão gráfica oficial.`,
        `- **PAINEL CENTRAL — LOMBADA (SPINE)**:`,
        `  • **Ponte Visual**: Transição ininterrupta da textura e da iluminação entre a capa frontal e a contracapa.`,
        `  • **Tipografia da Lombada**: Título "${titulo}" e autor "${autor}" centralizados verticalmente na mesma família tipográfica da capa, respeitando margem de segurança de 1,6 mm (0.0625 pol) das linhas de vinco.`,
        `- **PAINEL DIREITO — CAPA FRONTAL (PRIMEIRA CAPA)**:`,
        `  • **Arte Principal e Ponto Focal**: ${composicaoFundo}`,
        `  • **Iluminação Cênica**: ${iluminacaoCenica}`,
        `  • **Hierarquia Tipográfica Frontal**: Título monumental "${titulo}" no terço superior (y: 12% a 26%) em ${fonteTituloSugerida}; Subtítulo "${subtitulo}" no quadrante inferior; Nome do Autor "${autor}" na linha de base.`,
        ``,
        `### 4. ESPECIFICAÇÕES TÉCNICAS DE PRODUÇÃO GRÁFICA E EDITORIAL (300 DPI)`,
        `- **Formato Padrão de Impressão (Fechado)**: 15,24 x 22,86 cm (6 x 9 pol) a 300 DPI reais.`,
        `- **Formato da Planilha Aberta (Spread Completo com Sangria)**: ~32,5 x 23,5 cm (Contracapa + Lombada proporcional ao número de páginas + Capa Frontal + 3,2 mm de sangria externa em todos os 4 lados).`,
        `- **Margem Interna de Segurança**: Mínimo de 6,4 mm (0.25 pol) a 12,7 mm (0.5 pol) a partir da linha de refilo para qualquer texto, garantindo corte perfeito sem perda de letras.`,
        `- **Regras Negativas Estritas (REGRA DE OURO)**: É TERMINANTEMENTE PROIBIDO DESENHAR CÓDIGO DE BARRAS, CAIXA BRANCA, RETÂNGULO VAZIO, ESPAÇO EM BRANCO OU RECORTE NA CONTRACAPA OU NA CAPA. A arte cenográfica e a textura devem cobrir 100% de toda a área até a linha de corte. A Amazon KDP estampa o código de barras oficial automaticamente por cima da arte na impressão física. Arte 2D plana aberta pronta para gráfica, sem mockup 3D inclinado, sem marcas d'água, sem selos falsos.`,
        ``,
        `### 5. PROMPT PARA MOTOR DE IA — CAPA COMPLETA ABERTA (CAPA + LOMBADA + CONTRACAPA JUNTAS)`,
        `\`\`\`text\n${promptCapaEContracapaMotorIa}\n\`\`\``,
        ``,
        `### 6. PROMPT PARA MOTOR DE IA — APENAS A CONTRACAPA EM SINTONIA (FORMATO VERTICAL 2:3)`,
        `\`\`\`text\n${promptContracapaIsoladaMotorIa}\n\`\`\``
      ].join('\n');

  const wordCountCapaEContracapa = contarPalavras(promptCapaEContracapaCompleto);

  return {
    promptCompleto,
    promptParaMotorIa: promptTecnicoMotor,
    wordCount: totalPalavras,

    promptCapaEContracapaCompleto,
    promptCapaEContracapaMotorIa,
    promptContracapaIsoladaMotorIa,
    wordCountCapaEContracapa,
    ganchoTopoContracapa: leituraContracapa.ganchoTopo,
    sinopseContracapaSugerida: leituraContracapa.textoFormatadoCompleto,
    chamadaFinalContracapa: leituraContracapa.chamadaFinal,

    estiloRecomendado,
    fonteTituloSugerida,
    paletaCoresSugerida,
    orientacaoTipografica: {
      tituloPosicao: 'Terço Superior da Capa (12% a 26% do topo, grande e dominante)',
      tituloEstilo: fonteTituloSugerida,
      subtituloPosicao: 'Acima do Autor na Capa (quadrante inferior, alto contraste)',
      autorPosicao: 'Base da Capa e Lombada (chancela autoral)',
      contracapaPosicao: 'Contracapa: Gancho no topo + Breve Leitura central + Arte 100% contínua sem caixa branca de código de barras'
    }
  };
}
