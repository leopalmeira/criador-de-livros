// ================================================================
// KDP COVER MASTER PROMPT GENERATOR — DIRETOR DE ARTE EDITORIAL
// Gera Master Prompts de Alta Densidade (entre 600 e 1200 palavras)
// O Gênero dita o estilo da capa: Tipografia, Paleta, Fundo e Composição.
// Hierarquia: Título no topo, Subtítulo um pouco maior, Autor na base.
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
  promptCompleto: string;
  promptParaMotorIa: string;
  wordCount: number;
  estiloRecomendado: string;
  fonteTituloSugerida: string;
  paletaCoresSugerida: string[];
  orientacaoTipografica: {
    tituloPosicao: string;
    tituloEstilo: string;
    subtituloPosicao: string;
    autorPosicao: string;
  };
}

/**
 * Conta palavras reais em um texto
 */
export function contarPalavras(texto: string): number {
  return (texto || '').trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Gera um Master Prompt de Capa de 600 a 1200 palavras
 * com extrema riqueza de detalhes, adaptado rigorosamente ao gênero da obra.
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

  // Diretrizes específicas por gênero (o gênero que dita o estilo da capa)
  let generoNome = 'Geral';
  let estiloRecomendado = '';
  let fonteTituloSugerida = '';
  let paletaCoresSugerida: string[] = [];
  let iluminacaoCenica = '';
  let composicaoFundo = '';
  let texturaTipografica = '';

  if (g.includes('thriller') || g.includes('suspense') || g.includes('policial') || g.includes('mister') || g.includes('crime')) {
    generoNome = isEn ? 'Psychological Thriller & Suspense' : 'Thriller Psicológico e Suspense';
    estiloRecomendado = isEn ? 'Cinematic Neo-Noir Mystery' : 'Mistério Neo-Noir Cinematográfico';
    fonteTituloSugerida = 'Impact, Bebas Neue ou Montserrat Bold com textura de erosão e desgaste sutil (distressed/grunge edge)';
    paletaCoresSugerida = ['#090d16 (Preto Obsidiana)', '#dc2626 (Vermelho Carmesim Sangue)', '#f8fafc (Branco Giz Frio)', '#f59e0b (Âmbar de Luz na Janela)', '#1e293b (Ardósia Profunda)'];
    iluminacaoCenica = isEn
      ? 'Chiaroscuro high-contrast lighting with cold atmospheric mist, slivers of pale moonlight slicing through thick pine boughs, and a single warm tungsten ember glow emanating from a solitary focal point.'
      : 'Iluminação chiaroscuro de altíssimo contraste, névoa volumétrica gélida, feixes de luar prateado cortando galhos retorcidos e um único foco de luz âmbar quente emanando de uma janela solitária no breu da floresta.';
    composicaoFundo = isEn
      ? 'Dense nocturnal woodland expanse shrouded in rolling mist, weathered wooden log cabin architecture, slick damp pine needle ground reflecting dim ambient moonlight, volumetric fog weaving through ancient towering fir trees.'
      : 'Vasta floresta noturna envolta em neblina espessa, arquitetura de toras rústicas de cabana de madeira escura envelhecida pelo tempo, solo úmido coberto de musgo e folhas de pinheiro refletindo o reflexo prateado da lua.';
    texturaTipografica = isEn
      ? 'Distressed weathered texture on title lettering, subtle micro-chipping along letter edges evoking decay, isolation, and imminent danger.'
      : 'Textura áspera e levemente desgastada no título, conferindo a sensação de corrosão pelo tempo, perigo iminente e isolamento claustrofóbico.';
  } else if (g.includes('romance') || g.includes('drama') || g.includes('poesia') || g.includes('amor')) {
    generoNome = isEn ? 'Literary Romance & Drama' : 'Romance Literário e Drama Emocional';
    estiloRecomendado = isEn ? 'Warm Atmospheric Fine-Art Editorial' : 'Fine-Art Editorial Caloroso e Intimista';
    fonteTituloSugerida = 'Playfair Display, Cormorant Garamond ou Cinzel com ligaduras elegantes e serifa refinada';
    paletaCoresSugerida = ['#451a03 (Terracota Profundo)', '#fef3c7 (Ouro Marfim Pálido)', '#f43f5e (Rosa Pétala Suave)', '#38bdf8 (Azul Crepúsculo)', '#1e293b (Azul Marinho)'];
    iluminacaoCenica = isEn
      ? 'Luminous golden-hour sunset, soft diffused natural daylight casting gentle organic foliage shadows, delicate lens flare, and warm cinematic depth of field.'
      : 'Luz dourada mágica de golden hour ao entardecer, sombras botânicas suaves e translúcidas, leve flare óptico natural e profundidade de campo que evoca saudade e beleza.';
    composicaoFundo = isEn
      ? 'Sun-drenched coastal terrace overlooking turquoise waters or misty heritage botanical greenhouse, billowing natural linen, textured stone or tactile petals.'
      : 'Terraço ensolarado voltado para águas tranquilas ou jardim botânico orvalhado na alvorada, cortinas de linho flutuando na brisa e atmosfera de romance poético.';
    texturaTipografica = isEn
      ? 'Crisp refined serif letterforms with subtle gold foil sheen or soft matte ivory finish, evoking premium literary prestige.'
      : 'Tipografia serifada de alto luxo com acabamento marfim luminoso ou toque dourado sutil, digno das mais nobres editoras de ficção.';
  } else if (g.includes('sci-fi') || g.includes('ficcao') || g.includes('ficção') || g.includes('cyber') || g.includes('futuro')) {
    generoNome = isEn ? 'Science Fiction & Cyberpunk' : 'Ficção Científica e Futurismo';
    estiloRecomendado = isEn ? 'Futuristic Crystalline Concept Art' : 'Concept Art Futurista e Atmosférico';
    fonteTituloSugerida = 'Orbitron, Montserrat Ultra-Bold ou Inter Display condensado moderno';
    paletaCoresSugerida = ['#020617 (Espaço Profundo)', '#38bdf8 (Ciano Neon)', '#a855f7 (Violeta Cósmico)', '#f1f5f9 (Titânio Branco)', '#0f172a (Grafite Espacial)'];
    iluminacaoCenica = isEn
      ? 'Bioluminescent volumetric lighting, atmospheric cyan and amber anamorphic lens flares, iridescent rim lighting on brushed metallic and crystalline textures.'
      : 'Iluminação volumétrica bioluminescente, feixes anamórficos de luz ciano e âmbar, contra-luz suave em superfícies de titânio escovado e reflexos nebulares.';
    composicaoFundo = isEn
      ? 'Biophilic megacity spires piercing through low atmospheric storm clouds, sleek orbital transport trails, distant planetary rings on a twilight horizon.'
      : 'Metrópole futurista com espirais arquitetônicas arrojadas furando nuvens crepusculares, trilhas de transporte aéreo e horizonte com nebulosa cósmica.';
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
      : 'Raios crepusculares rompendo a névoa ancestral sobre picos montanhosos escarpados, runas místicas com pulsação suave e atmosfera de magia esquecida.';
    composicaoFundo = isEn
      ? 'Towering ancient stone citadel carved into sheer mountain cliffs, sea of clouds below, mythical wildlife silhouettes soaring in distant skies.'
      : 'Cidadela esculpida na rocha de montanhas alpinas, mar de nuvens aos pés da fortaleza e vastidão mítica que promete uma grande saga épica.';
    texturaTipografica = isEn
      ? 'Chiseled antique gold foil with micro-embossing and regal weathered stone patina.'
      : 'Entalhe clássico em ouro envelhecido com textura de pedra nobre e micro-relevo de capa dura de luxo.';
  } else if (g.includes('finan') || g.includes('negoc') || g.includes('gestao') || g.includes('gestão') || g.includes('lider')) {
    generoNome = isEn ? 'Business, Leadership & Wealth' : 'Negócios, Finanças e Liderança';
    estiloRecomendado = isEn ? 'Corporate Prestige Architectural Minimalism' : 'Minimalismo Arquitetônico de Prestígio Corporativo';
    fonteTituloSugerida = 'Montserrat Extra-Bold, Oswald ou Inter com kerning estrito';
    paletaCoresSugerida = ['#0f172a (Azul Marinho Corporativo)', '#0284c7 (Azul Safira Líquido)', '#ffffff (Branco Puro Editorial)', '#d97706 (Ouro Nobre de Investimento)', '#334155 (Ardósia)'];
    iluminacaoCenica = isEn
      ? 'Crisp natural morning daylight with sharp specular architectural highlights, clear infinite blue sky evoking intellectual clarity, strategic mastery and ascension.'
      : 'Luz natural matinal límpida e cristalina, reflexos especulares em vidro e aço, horizonte azul aberto simbolizando visão estratégica, clareza e autoridade.';
    composicaoFundo = isEn
      ? 'Towering crystalline monolith of glass and brushed platinum soaring toward pristine skies, dynamic vertical upward perspective, minimalist symmetry.'
      : 'Monólito geométrico de vidro e platina ascendendo em direção ao céu aberto, perspectiva vertical dinâmica e simetria arquitetônica contemporânea.';
    texturaTipografica = isEn
      ? 'Matte white embossed typography with subtle drop shadow and gold accent underline, exuding authority and trust.'
      : 'Tipografia em branco fosco imponente com sutil sombra de profundidade e acento dourado, transmitindo prestígio e autoridade definitiva.';
  } else if (g.includes('autoajuda') || g.includes('desenvolvimento') || g.includes('habito') || g.includes('mente')) {
    generoNome = isEn ? 'Personal Growth & Mindset' : 'Desenvolvimento Pessoal e Mentalidade';
    estiloRecomendado = isEn ? 'Inspirational Serene Horizon' : 'Horizonte Inspirador e Clareza Interior';
    fonteTituloSugerida = 'Montserrat Semi-Bold, Inter ou Cormorant Garamond elegante';
    paletaCoresSugerida = ['#0f172a (Azul Noturno)', '#f59e0b (Luz da Alvorada)', '#0d9488 (Teal Sereno)', '#ffffff (Branco Cristalino)', '#f1f5f9 (Névoa Suave)'];
    iluminacaoCenica = isEn
      ? 'Gentle radiant sunrise breaking through morning mist over a tranquil mountain ridge, warm golden rays instilling hope, clarity, and personal transformation.'
      : 'Alvorada radiante e acolhedora rompendo a névoa matinal sobre o topo de uma colina pacífica, raios solares que inspiram renovação, clareza e paz mental.';
    composicaoFundo = isEn
      ? 'Winding peaceful path leading through organic landscape toward a glowing dawn horizon, balanced zen composition with ample breathing space.'
      : 'Caminho sinuoso em meio à natureza serena conduzindo o olhar em direção ao horizonte iluminado pela alvorada, composição zen com equilíbrio visual.';
    texturaTipografica = isEn
      ? 'Clean, spacious modern typography with luminous gradient and pristine contrast.'
      : 'Tipografia limpa e arejada com gradiente luminoso suave, contraste impecável e elegância atemporal.';
  } else if (g.includes('terror') || g.includes('horror') || g.includes('sobrenatural') || g.includes('fantasma') || g.includes('pesadelo')) {
    generoNome = isEn ? 'Gothic Horror & Supernatural' : 'Horror Gótico e Sobrenatural';
    estiloRecomendado = isEn ? 'Dark Atmospheric Gothic Dread' : 'Dread Gótico e Atmosfera Macabra Sofisticada';
    fonteTituloSugerida = 'Cinzel Bold, Alegreya SC ou Montserrat distressed com espinhos discretos e acabamento lúgubre';
    paletaCoresSugerida = ['#050505 (Preto Carvão Profundo)', '#7f1d1d (Sangue Coagulado Escuro)', '#94a3b8 (Branco Espectral / Névoa Fúnebre)', '#450a0a (Bordô Envelhecido)', '#1c1917 (Sombra de Pedra Fúnebre)'];
    iluminacaoCenica = isEn
      ? 'Chiaroscuro moonlight slicing through dense suffocating shadows, ominous dim candlelight flickering, sickly green or cold blue ambient twilight.'
      : 'Luar espectral cortando sombras sufocantes em chiaroscuro violento, vela solitária bruxuleante no escuro absoluto e gradiente gélido de meia-noite.';
    composicaoFundo = isEn
      ? 'Dilapidated Victorian manor silhouette against a storm-churned sky, twisted dead boughs, iron cemetery gates, heavy clinging mist and decaying architectural masonry.'
      : 'Silhueta de casarão vitoriano decadente sob tempestade soturna, galhos retorcidos desfolhados, portão de ferro forjado e névoa rasteira sobre lápides centenárias.';
    texturaTipografica = isEn
      ? 'Chiseled weathered stone with hairline cracks and subtle crimson back-glow.'
      : 'Tipografia entalhada em pedra fúnebre com micro-rachaduras e brilho residual carmesim nas sombras.';
  } else if (g.includes('infantil') || g.includes('crianca') || g.includes('criança') || g.includes('juvenil') || g.includes('picture')) {
    generoNome = isEn ? 'Children\'s Picture Book & Middle Grade' : 'Infantil Ilustrado e Infantojuvenil';
    estiloRecomendado = isEn ? 'Enchanting Digital Watercolor & Warm 3D Storybook' : 'Aquarela Digital Encantada e Storybook 3D Acolhedor';
    fonteTituloSugerida = 'Quicksand Bold, Poppins ou Baloo com curvas orgânicas alegres e legibilidade infantil cristalina';
    paletaCoresSugerida = ['#f59e0b (Amarelo Sol Acolhedor)', '#38bdf8 (Azul Céu Claro)', '#10b981 (Verde Floresta Encantada)', '#ec4899 (Rosa Flor Silvestre)', '#ffffff (Branco Nuvem Pura)'];
    iluminacaoCenica = isEn
      ? 'Bright, magical dappled daylight through canopy leaves, luminous fairy motes, gentle golden sunshine evoking safety, wonder, and adventure.'
      : 'Luz solar mágica filtrada pelas copas das árvores, pontos de luz cintilantes no ar, atmosfera calorosa e luminosa que inspira afeto, curiosidade e fantasia.';
    composicaoFundo = isEn
      ? 'Enchanted woodland meadow with oversized friendly mushrooms, whimsical treehouse nestled in blossoming branches, soft undulating grassy hills under puffy white clouds.'
      : 'Clareira mágica de floresta com cogumelos coloridos, casa na árvore acolhedora aninhada entre galhos floridos, colinas verdejantes e céu ensolarado de conto de fadas.';
    texturaTipografica = isEn
      ? 'Smooth organic volumetric letterforms with soft playful drop shadow and radiant joyful rim light.'
      : 'Tipografia volumétrica com cantos arredondados, leve relevo tátil macio e contorno claro para contraste absoluto sobre as ilustrações.';
  } else if (g.includes('biografia') || g.includes('historia') || g.includes('história') || g.includes('memoria') || g.includes('memória')) {
    generoNome = isEn ? 'Biography, Memoir & History' : 'Biografia, Memórias e História';
    estiloRecomendado = isEn ? 'Timeless Fine-Art Historical Portraiture' : 'Retrato Histórico Fine-Art Atemporal e Dignificante';
    fonteTituloSugerida = 'Baskerville, Cormorant Garamond ou Playfair Display Bold com kerning de prestígio acadêmico';
    paletaCoresSugerida = ['#1e1b4b (Azul Índigo Histórico)', '#d97706 (Ouro Nobre Envelhecido)', '#fef3c7 (Papiro Marfim)', '#334155 (Grafite Editorial)', '#78350f (Couro Pátina)'];
    iluminacaoCenica = isEn
      ? 'Rembrandt-style directional side lighting, warm atmospheric archival warmth, soft chiaroscuro evoking historical gravitas and human dignity.'
      : 'Iluminação lateral clássica estilo Rembrandt, tons quentes de arquivo histórico, chiaroscuro elegante transmitindo gravidade, verdade e dignidade documental.';
    composicaoFundo = isEn
      ? 'Monochrome archival document textures, textured vintage parchment subtly overlaid with iconic architectural relics or timeless landscape silhouettes.'
      : 'Textura refinada de papiro e velino histórico, silhuetas arquitetônicas de época e composição digna de arquivos nacionais de grandes personalidades.';
    texturaTipografica = isEn
      ? 'Regal hot-stamped gold foil or crisp ivory serif lettering with subtle letterpress indentation.'
      : 'Hot-stamping dourado nobre ou tipografia serifada em marfim com leve relevo de tipografia clássica prensada.';
  } else {
    generoNome = isEn ? 'Literary Fiction' : 'Ficção Literária e Contemporânea';
    estiloRecomendado = isEn ? 'Artistic Fine-Art Narrative' : 'Narrativa Artística Fine-Art';
    fonteTituloSugerida = 'Playfair Display, Montserrat Bold ou Georgia com serifa de prestígio';
    paletaCoresSugerida = ['#0f172a (Ardósia)', '#d97706 (Âmbar Envelhecido)', '#ffffff (Branco Giz)', '#334155 (Grafite)', '#e2e8f0 (Cinza Claro)'];
    iluminacaoCenica = isEn
      ? 'Subtle studio directional gallery light, tactile organic textures, rich painterly depth.'
      : 'Luz direcional de estúdio de arte, texturas táteis orgânicas e rica profundidade pictórica.';
    composicaoFundo = isEn
      ? 'Thoughtfully staged conceptual still-life or atmospheric setting inspired by the central premise.'
      : 'Cenografia conceitual marcante inspirada no enredo central, com equilíbrio visual de galeria de arte.';
    texturaTipografica = isEn
      ? 'Refined editorial letterforms with high tactile contrast.'
      : 'Formas tipográficas editoriais refinadas com alto contraste táctil.';
  }

  // Bloco 1: Visão Editorial Completa (em português ou inglês dependendo do livro)
  const secao1_Visao = isEn
    ? `### 1. EDITORIAL IDENTITY & ART DIRECTION DOSSIER
- **Book Title**: "${titulo}"
- **Commercial Subtitle**: "${subtitulo}"
- **Author byline**: "${autor}"
- **Genre Category**: ${generoNome}
- **Quality Benchmark Rule**: The reference bestseller cover serves exclusively as a BENCHMARK OF ARTISTIC AND CINEMATIC FINISH (volumetric lighting, photorealistic textures, clean negative space, and authoritative typography). The SPECIFIC GENRE of the book strictly dictates the visual style, scenery, color grading, atmosphere, and font family.
- **Target Aesthetic**: ${estiloRecomendado}
- **Narrative Premise**: "${premissa}"
- **Core Emotional Hook**: An immediate, visceral visual promise of high-stakes immersion and literary distinction that captivates prospective readers scrolling through Amazon KDP best-seller shelves.`
    : `### 1. DOSSIÊ DE DIREÇÃO DE ARTE E IDENTIDADE EDITORIAL
- **Título do Livro**: "${titulo}"
- **Subtítulo Comercial**: "${subtitulo}"
- **Nome do Autor**: "${autor}"
- **Gênero Literário**: ${generoNome}
- **Regra de Padrão de Qualidade**: A capa de referência best-seller atua exclusivamente como MÉTRICA DE EXCELÊNCIA TÉCNICA E ACABAMENTO CINEMATOGRÁFICO (iluminação volumétrica, realismo tátil, ausência de deformações e hierarquia tipográfica imersiva). O GÊNERO ESPECÍFICO DA OBRA e a sua trama ditam soberanamente o cenário, a paleta de cores, a atmosfera e a família tipográfica.
- **Estilo Visual Recomendado**: ${estiloRecomendado}
- **Premissa da Trama**: "${premissa}"
- **Gancho Emocional Central**: Uma promessa visual marcante e magnética de imersão de alta qualidade, inspirando curiosidade irresistível e prestígio de best-seller internacional na Amazon KDP.`;

  // Bloco 2: Cenografia & Composição de Fundo
  const secao2_Cenografia = isEn
    ? `### 2. CINEMATIC BACKGROUND SCENOGRAPHY & ENVIRONMENT
The background scene must be an evocative, masterpiece-grade visual world specifically built for ${generoNome}.
- **Setting & Geography**: ${composicaoFundo}
- **Camera Lens & Perspective**: Shot on an 80mm medium-format architectural lens, eye-level or three-quarter low angle, establishing cinematic depth without distortion. The focal center of the composition captures tactile realism: authentic textures of damp wood, weathered bark, dew-slicked pine needles, misty stone, or brushed metal.
- **Atmospheric Conditions**: Volumetric morning mist or swirling twilight fog rolling across the ground plane, subtle moisture particles catching glancing light rays, creating rich layers of foreground, midground, and deep background horizon.
- **Typographic Integration Zones**: The upper third is deliberately composed to integrate the bold, monumental Book Title "${titulo}". The lower quadrant provides rich, shadowed contrast to display the Subtitle "${subtitulo}" and the authoritative Author line "Author: ${autor}" with pristine legibility.
- **Strict Negative Constraints**: NO GIBBERISH TEXT, NO MISSPELLED GLYPHS, NO UNWANTED LABELS, NO WATERMARKS, NO RANDOM LOGOS, NO BADGES, NO MEDALS, NO CIRCULAR SEALS, NO PRE-RENDERED 3D BOOK FRAMES OR MOCKUPS. Only the exact intended typography (Title, Subtitle, and Author) with pristine spelling.`
    : `### 2. CENOGRAFIA CINEMATOGRÁFICA E COMPOSIÇÃO DE FUNDO
A arte de fundo deve constituir um mundo visual autêntico e de nível de obra-prima, desenhado especificamente para o universo de ${generoNome}.
- **Ambientação e Cenário**: ${composicaoFundo}
- **Perspectiva e Lente de Câmera**: Enquadramento cinematográfico vertical 2:3 fotografado com lente média de 80mm em formato médio, ângulo nivelado ou sutilmente inferior, transmitindo imponência sem distorções artificiais. A textura da madeira úmida, das pedras encharcadas de orvalho, dos troncos centenários e da névoa viva deve transmitir realismo tátil de alto padrão.
- **Atmosfera e Condições Climáticas**: Névoa volumétrica densa deslizando pelo solo, partículas sutis de umidade suspensas no ar refratando a luz difusa, criando planos de profundidade claros entre primeiro plano, plano médio e horizonte.
- **Zonas de Integração Tipográfica na Capa**: O terço superior é composto especialmente para integrar com imponência o Título oficial "${titulo}". A zona inferior oferece contraste elegante e sombreado para acomodar com legibilidade cristalina o Subtítulo "${subtitulo}" e a chancela do autor "Author: ${autor}" (ou "por ${autor}").
- **Regras Negativas Inegociáveis**: NENHUM TEXTO ALEATÓRIO OU DEFORMADO (NO GIBBERISH), NENHUMA LETRA BORRADA, NENHUM SELO, NENHUMA MEDALHA, NENHUM LOGOTIPO, NENHUMA MARCA D'ÁGUA, NENHUMA MOLDURA ARTIFICIAL OU MOCKUP 3D. Apenas a tipografia oficial exata da obra (Título, Subtítulo e Autor) renderizada com escrita perfeita.`;

  // Bloco 3: Iluminação e Paleta Cromática
  const secao3_Iluminacao = isEn
    ? `### 3. LIGHTING DESIGN & COLOR GRADING
- **Lighting Atmosphere**: ${iluminacaoCenica}
- **Color Palette Specification**:
${paletaCoresSugerida.map(c => `  • ${c}`).join('\n')}
- **Contrast & Tonal Separation**: Precise balance between deep, cinematic shadow values and luminous specular highlights. Deep obsidian blacks ground the composition while accent tones bring instant visual magnetism to the focal subject, ensuring optimal thumbnail conversion on digital book storefronts.`
    : `### 3. DESIGN DE ILUMINAÇÃO E COLOR GRADING EDITORIAL
- **Atmosfera de Luz**: ${iluminacaoCenica}
- **Especificação da Paleta de Cores**:
${paletaCoresSugerida.map(c => `  • ${c}`).join('\n')}
- **Separação Tonal e Contraste**: Equilíbrio minucioso entre tons escuros profundos e pontos de luz especulares vibrantes. A profundidade cromática garante que a capa se destaque com nitidez espetacular tanto na versão ampliada quanto em miniaturas de catálogos e telas de dispositivos móveis.`;

  // Bloco 4: Tipografia Estruturada KDP (Título, Subtítulo e Autor na Capa)
  const secao4_Tipografia = isEn
    ? `### 4. COVER TYPOGRAPHY & LAYOUT ARCHITECTURE (MANDATORY ELEMENTS)
The cover artwork MUST display the complete editorial identity directly on the cover with impeccable typographic finish:
- **Book Title Rendered on Cover**: Prominently displayed in the UPPER THIRD (y: 12% to 26% from top).
  - **Exact Title Text**: "${titulo}"
  - **Font Style & Tone**: ${fonteTituloSugerida}.
  - **Typographic Treatment**: Monumental scale, authoritative letter-spacing, ${texturaTipografica}. Subtle drop shadow and micro-stroke ensuring total separation and legibility against the background.
- **Commercial Subtitle Rendered on Cover**: Positioned SLIGHTLY LARGER, located directly ABOVE the author's name in the lower quadrant.
  - **Exact Subtitle Text**: "${subtitulo}"
  - **Font Style**: Clean, modern serif or high-contrast sans-serif, uppercase with generous tracking (0.12em), crisp contrast against shadowed base ground.
- **Author Line Rendered on Cover**: Positioned directly BELOW the commercial subtitle, resting in the dignified baseline of the cover.
  - **Exact Author Text**: "Author: ${autor}" or "by ${autor}"
  - **Font Style**: Distinguished small caps with refined tracking, perfectly proportioned to communicate author brand prestige and credibility.`
    : `### 4. ARQUITETURA TIPOGRÁFICA DA CAPA (ELEMENTOS OBRIGATÓRIOS NA CAPA)
A capa DEVE conter gravada na sua composição a identidade editorial completa da obra com acabamento de excelência:
- **Título do Livro Gravado na Capa**: Exibido com imponência no TERÇO SUPERIOR DA CAPA (y: 12% a 26% do topo).
  - **Texto Exato do Título**: "${titulo}"
  - **Estilo da Fonte e Tom**: ${fonteTituloSugerida}.
  - **Tratamento Tipográfico**: Escala monumental, tracking marcante, ${texturaTipografica}. Contorno sutil e sombra projetada suave garantindo contraste total e legibilidade perfeita sobre a arte.
- **Subtítulo Comercial Gravado na Capa**: Posicionado UM POUCO MAIOR, logo ACIMA DO NOME DO AUTOR no quadrante inferior.
  - **Texto Exato do Subtítulo**: "${subtitulo}"
  - **Estilo da Fonte do Subtítulo**: Tipografia refinada em versalete ou itálico elegante, kerning harmonioso e contraste garantindo leitura rápida da promessa do livro.
- **Nome do Autor Gravado na Capa**: Posicionado logo ABAIXO DO SUBTÍTULO, na linha de base definitiva da capa.
  - **Texto Exato do Autor**: "Author: ${autor}" (ou "por ${autor}")
  - **Estilo da Fonte do Autor**: Versalete nobre com espaçamento equilibrado entre caracteres, estabelecendo a chancela de autoridade da autoria.`;

  // Bloco 5: Prompt Técnico Otimizado com Tipografia (Título, Subtítulo e Autor) para Motores de Imagem (FLUX / Midjourney / Replicate / Ideogram)
  const authorDisplay = isEn ? `Author: ${autor} (by ${autor})` : `Author: ${autor} (por ${autor})`;
  const promptTecnicoMotor = [
    `Masterpiece bestselling book cover artwork for "${titulo}".`,
    `Genre and tone: ${generoNome}. Visual aesthetic: ${estiloRecomendado}.`,
    `Cover Typography & Mandatory Text Elements Rendered Directly on Cover:`,
    `- Book Title on Cover: Large bold monumental lettering reading exactly "${titulo}" positioned across the upper third in ${fonteTituloSugerida}.`,
    `- Subtitle on Cover: Clear, readable typography reading exactly "${subtitulo}" positioned in the lower quadrant directly above the author credit.`,
    `- Author on Cover: Prominent author credit reading exactly "${authorDisplay}" centered along the dignified baseline of the cover.`,
    `Subject setting & background environment: ${composicaoFundo}`,
    `Lighting & atmosphere: ${iluminacaoCenica}`,
    `Color grading: ${paletaCoresSugerida.join(', ')}.`,
    `Camera perspective & technical quality: Shot on 80mm medium-format lens, fine 35mm cinematic film grain, shallow depth of field, tactile real-world materials, ultra-photorealistic 8k render, prestigious bestseller commercial finish.`,
    `Framing: Vertical 2:3 aspect ratio (1600x2400 standard book cover proportions). Flawless typographic hierarchy with total contrast and legibility, crisp letterforms, no misspelled words, no distorted glyphs, no mockups, pristine print-ready publication.`
  ].join('\n\n');

  // Bloco 6: Diretrizes Finais de Renderização Editorial
  const secao6_Diretrizes = isEn
    ? `### 5. TECHNICAL RENDERING & PRODUCTION SPECIFICATIONS
- **Target Resolution**: 1600 x 2400 pixels at 300 DPI (Amazon KDP 6x9 Paperback and Kindle eBook standard).
- **Aspect Ratio**: 1:1.5 (Vertical 2:3).
- **Execution Target**: Replicate FLUX.1 Schnell / FLUX.1 Dev, Midjourney v6 or Stable Diffusion XL.
- **Harmonious Synthesis**: Every element—the background scene, the font choices, the lighting, and the spatial distribution—acts in unison to reflect the authentic heart of "${titulo}".`
    : `### 5. DIRETRIZES TÉCNICAS DE RENDERIZAÇÃO E PRODUÇÃO EDITORIAL
- **Resolução Final**: 1600 x 2400 pixels a 300 DPI (Padrão oficial Amazon KDP Capa Comum 6x9 e Kindle eBook).
- **Proporção da Imagem**: Proporção vertical 2:3 (1:1.5).
- **Compatibilidade de Motores**: API do Replicate (FLUX.1 Schnell / Dev), Midjourney v6 ou SDXL.
- **Síntese Harmônica**: Todos os elementos visuais—o cenário de fundo, a escolha da fonte do título no tom da obra, a iluminação e a hierarquia do subtítulo e autor—trabalham em conjunto sinérgico para refletir com fidelidade absoluta a essência de "${titulo}".`;

  // Monta o prompt completo e expande para atingir entre 600 e 1200 palavras
  let promptCompleto = [
    secao1_Visao,
    secao2_Cenografia,
    secao3_Iluminacao,
    secao4_Tipografia,
    isEn ? `### 5. PROMPT READY TO COPY FOR AI IMAGE ENGINE (FLUX.1 / REPLICATE / MIDJOURNEY)\n\`\`\`text\n${promptTecnicoMotor}\n\`\`\`` : `### 5. PROMPT ESTRUTURADO PARA MOTOR DE IMAGEM IA (REPLICATE / FLUX.1 / MIDJOURNEY)\n\`\`\`text\n${promptTecnicoMotor}\n\`\`\``,
    secao6_Diretrizes
  ].join('\n\n');

  // Verifica a contagem de palavras e adiciona aprofundamento de direção de arte se necessário para garantir o intervalo 600 - 1200
  let totalPalavras = contarPalavras(promptCompleto);

  if (totalPalavras < 650) {
    const aprofundamento = isEn
      ? `\n\n### 6. DETAILED CINEMATIC SCENE DESCRIPTION & ATMOSPHERIC NUANCES
To ensure the generative model captures the full depth and emotional gravity of "${titulo}", the visual composition must emphasize micro-details. In the foreground, subtle environmental elements—such as glistening moisture on rough surfaces, fine dust motes illuminated by grazing shafts of light, or weathered organic materials—anchor the scene in palpable reality. The midground establishes the primary thematic anchor of the narrative, balanced with precision to avoid crowding the central visual field. The deep background recedes into soft atmospheric falloff, where distant silhouettes and gentle luminance gradients evoke the infinite expanse of the book's setting. Every hue in the palette has been curated to resonate with psychological resonance: dark undertones convey tension, mystery, and depth, while carefully targeted specular highlights direct the viewer's eye with deliberate narrative intent. This comprehensive art direction guarantees that the resulting book cover stands out as a genuine bestseller caliber piece of commercial art.`
      : `\n\n### 6. APROFUNDAMENTO CENOGRÁFICO E NUANCES ATMOSFÉRICAS
Para garantir que o modelo generativo capture com fidelidade a gravidade emocional e a profundidade de "${titulo}", a composição visual deve valorizar minúcias e texturas tácteis. No primeiro plano, elementos ambientais sutis—como o brilho da umidade sobre superfícies ásperas, micropartículas de poeira ou névoa suspensas iluminadas por feixes rasantes de luz, e materiais orgânicos envelhecidos pelas estações—ancoram a cena em um realismo tangível. O plano médio estabelece o ponto focal simbólico da narrativa, perfeitamente equilibrado para não poluir o centro da cena. O plano de fundo profundo recua suavemente em gradientes atmosféricos, onde silhuetas distantes e luzes tênues no horizonte evocam a vastidão imersiva da história. Cada tom da paleta de cores foi calibrado para gerar ressonância emocional instantânea: os contrastes profundos despertam expectativa e fascínio, enquanto os acentos luminosos conduzem o olhar com rigor editorial. Essa direção de arte minuciosa assegura que a capa final possua a presença magnética e o prestígio de um best-seller de destaque mundial.`;

    promptCompleto += aprofundamento;
    totalPalavras = contarPalavras(promptCompleto);
  }

  return {
    promptCompleto,
    promptParaMotorIa: promptTecnicoMotor,
    wordCount: totalPalavras,
    estiloRecomendado,
    fonteTituloSugerida,
    paletaCoresSugerida,
    orientacaoTipografica: {
      tituloPosicao: 'Terço Superior (12% a 26% do topo, grande e dominante)',
      tituloEstilo: fonteTituloSugerida,
      subtituloPosicao: 'Acima do Autor (quadrante inferior, um pouco maior)',
      autorPosicao: 'Base da Capa (logo abaixo do subtítulo, no rodapé clássico)'
    }
  };
}
