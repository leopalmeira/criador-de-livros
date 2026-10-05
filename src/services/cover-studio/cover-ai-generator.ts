// Serviço Profissional de Geração de Conceitos e Capas de Livros com IA
// Implementa o pipeline editorial: Análise do Livro -> Direção de Arte -> 4 Conceitos Distintos -> Renderização
import { BookProject } from '../../types/book-project';

export interface CoverVisualConcept {
  id: string;
  optionNumber: number; // 1, 2, 3, 4
  directionName: string; // ex: "Bestseller Editorial", "Cinematográfica", "Minimalista Premium", "Conceitual / Impactante"
  conceptDescription: string;
  artisticRationale: string;
  visualPrompt: string;
  artUrl: string;
  fontFamily: string;
  titleColor: string;
  subtitleColor: string;
  authorColor: string;
  badgeText: string;
  badgeBg: string;
  scrimOpacity: number;
  isFavorite?: boolean;
}

export interface CoverCustomizationOptions {
  style: string;
  mood: string;
  palette: string;
}

export interface CoverGenerationPackage {
  versionNumber: number;
  timestamp: number;
  concepts: CoverVisualConcept[];
}

export class CoverAiGeneratorService {
  /**
   * Constrói e retorna 4 conceitos completamente diferentes de capa para o livro
   */
  public static generate4CoverConcepts(
    project: BookProject,
    customOptions: CoverCustomizationOptions = { style: 'Você decide', mood: 'Você decide', palette: 'IA decide' },
    seedOffset: number = 0
  ): CoverVisualConcept[] {
    const title = project.title || 'Livro Sem Título';
    const subtitle = project.subtitle || '';
    const author = project.author || 'Autor da Obra';
    const rawGenre = (project.genre || project.kdpBookType || 'não-ficção').toLowerCase();
    const topic = project.topic || title;
    const audience = project.targetAudience || 'Leitores interessados no tema';
    const synopsis = project.stageData?.synopsis?.commercialShortDescription || project.description || topic;
    const purpose = project.stageData?.purpose?.generatedProposal || topic;

    const baseSeed = Math.floor(Math.random() * 900000) + 100000 + seedOffset;

    // Detecta famílias editoriais
    const isKidsOrFamily = rawGenre.includes('children') || rawGenre.includes('infantil') || rawGenre.includes('picture') || topic.toLowerCase().includes('vovó') || topic.toLowerCase().includes('criança') || topic.toLowerCase().includes('bolo');
    const isRomance = rawGenre.includes('romance');
    const isThriller = rawGenre.includes('thriller') || rawGenre.includes('mistério') || rawGenre.includes('suspense');
    const isBusinessFinance = rawGenre.includes('business') || rawGenre.includes('finance') || rawGenre.includes('negócio') || rawGenre.includes('invest');
    const isCookbook = rawGenre.includes('culinária') || rawGenre.includes('receita') || rawGenre.includes('cooking');
    const isFantasySciFi = rawGenre.includes('fantasy') || rawGenre.includes('fantasia') || rawGenre.includes('sci-fi');

    // Mapeamento de modificadores opcionais
    const styleModifier = customOptions.style !== 'Você decide' ? `, in a ${customOptions.style.toLowerCase()} art style` : '';
    const moodModifier = customOptions.mood !== 'Você decide' ? `, with an intense ${customOptions.mood.toLowerCase()} mood and atmosphere` : '';
    let paletteModifier = '';
    if (customOptions.palette === 'Escura') paletteModifier = ', deep dark moody palette, dramatic chiaroscuro';
    else if (customOptions.palette === 'Clara') paletteModifier = ', bright airy ethereal palette, luminous soft lighting';
    else if (customOptions.palette === 'Quente') paletteModifier = ', warm golden amber and terracotta color tones';
    else if (customOptions.palette === 'Fria') paletteModifier = ', cool slate blue, emerald and icy cyan palette';
    else if (customOptions.palette === 'Vibrante') paletteModifier = ', vibrant saturated high contrast expressive colors';
    else if (customOptions.palette === 'Neutra') paletteModifier = ', refined neutral organic earthy tones, ivory and bronze';

    // Diretiva universal para evitar textos deformados e falsos selos na imagem (renderizados via camada gráfica)
    const antiTextDirective = 'empty breathing space in the upper and bottom thirds for typography placement, clean vertical background composition, no text, no letters, no words, no titles, no watermarks, no bestseller badge, no sticker, no awards ribbon, no fake labels, 8k resolution, prestigious editorial composition';

    if (isKidsOrFamily) {
      // 4 CONCEITOS PARA LIVRO INFANTIL / FAMÍLIA
      return [
        {
          id: `concept_1_${baseSeed}`,
          optionNumber: 1,
          directionName: 'Edição Editorial / Cozy Hygge',
          conceptDescription: 'Aconchego familiar atemporal com aquarela suave, iluminação de tarde dourada e conexão sensorial imediata.',
          artisticRationale: 'Inspira confiança e afeto imediato em mães, pais e avós na hora da compra para rotinas de ninar.',
          visualPrompt: `storybook cover illustration of a warm and cozy home kitchen bathed in gentle golden sunset light, a loving grandmother and young grandchild happily baking carrot cake together with flour on their aprons, steam rising from fresh cake, rustic wooden table, whimsical hygge aesthetic, soft watercolor and digital gouache textures${styleModifier}${moodModifier}${paletteModifier}, ${antiTextDirective}`,
          artUrl: this.buildImageUrl(`storybook watercolor kitchen grandmother grandchild baking warm golden sunlight hygge${styleModifier}${moodModifier}${paletteModifier}`, baseSeed + 11),
          fontFamily: "'Playfair Display', Georgia, serif",
          titleColor: '#ffffff',
          subtitleColor: '#fde68a',
          authorColor: '#f1f5f9',
          badgeText: 'EDIÇÃO ESPECIAL ILUSTRADA',
          badgeBg: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
          scrimOpacity: 65
        },
        {
          id: `concept_2_${baseSeed}`,
          optionNumber: 2,
          directionName: 'Cinematográfica / Pixar Magic',
          conceptDescription: 'Animação 3D luminosa com cores vibrantes, expressividade lúdica e personagens carismáticos.',
          artisticRationale: 'Chama a atenção instantânea das crianças e se destaca fortemente nas miniaturas da Amazon KDP.',
          visualPrompt: `cinematic 3d animated storybook style, adorable curious little kid and smiling sweet grandmother laughing together in a colorful kitchen, carrot cake with glowing magical sparkles of cinnamon and joy, warm sunlight rays, cute disney pixar style lighting and soft character render${styleModifier}${moodModifier}${paletteModifier}, ${antiTextDirective}`,
          artUrl: this.buildImageUrl(`cinematic 3d animation pixar style kid and grandmother baking carrot cake glowing sparkles kitchen${styleModifier}${moodModifier}${paletteModifier}`, baseSeed + 22),
          fontFamily: "'Montserrat', sans-serif",
          titleColor: '#ffffff',
          subtitleColor: '#38bdf8',
          authorColor: '#f8fafc',
          badgeText: 'EDIÇÃO ILUSTRADA',
          badgeBg: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          scrimOpacity: 60
        },
        {
          id: `concept_3_${baseSeed}`,
          optionNumber: 3,
          directionName: 'Minimalista Poético / Livro de Arte',
          conceptDescription: 'Design limpo com foco no elemento central afetivo: bolo caseiro aromático com detalhes de carinho.',
          artisticRationale: 'Posiciona o livro como obra de arte e presente refinado para datas comemorativas e escolas.',
          visualPrompt: `elegant modern minimalist picture book art, a delicious homemade carrot cake with a warm candle and recipe note resting on an antique lace cloth next to a window overlooking autumn trees, gentle afternoon breeze, refined folk-art style, poetic and serene atmosphere${styleModifier}${moodModifier}${paletteModifier}, ${antiTextDirective}`,
          artUrl: this.buildImageUrl(`minimalist poetic picture book art carrot cake window autumn afternoon breeze folk art${styleModifier}${moodModifier}${paletteModifier}`, baseSeed + 33),
          fontFamily: "'Cinzel', Georgia, serif",
          titleColor: '#ffffff',
          subtitleColor: '#fef08a',
          authorColor: '#cbd5e1',
          badgeText: 'HISTÓRIA AFETIVA',
          badgeBg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
          scrimOpacity: 70
        },
        {
          id: `concept_4_${baseSeed}`,
          optionNumber: 4,
          directionName: 'Conceitual / Memórias & Fantasia Doce',
          conceptDescription: 'Aroma do bolo se transformando em nuvens de memórias e estrelas aconchegantes de ninar.',
          artisticRationale: 'Explora o poder da imaginação infantil, ideal para leitura noturna que prepara para o sono tranquilo.',
          visualPrompt: `whimsical magical realism children book illustration, gentle sweet scent of baking swirling into soft starry clouds and dreamlike gentle shapes over a peaceful cozy cottage, comforting bedtime story vibe, warm lantern light, enchanting deep blue and warm amber contrasts${styleModifier}${moodModifier}${paletteModifier}, ${antiTextDirective}`,
          artUrl: this.buildImageUrl(`whimsical dreamlike children book sweet baking scent starry clouds bedtime cottage lantern${styleModifier}${moodModifier}${paletteModifier}`, baseSeed + 44),
          fontFamily: "'Playfair Display', Georgia, serif",
          titleColor: '#fef3c7',
          subtitleColor: '#fdba74',
          authorColor: '#ffffff',
          badgeText: 'ROTINA DO SONO',
          badgeBg: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
          scrimOpacity: 75
        }
      ];
    } else if (isRomance) {
      // 4 CONCEITOS PARA ROMANCE
      return [
        {
          id: `concept_1_${baseSeed}`,
          optionNumber: 1,
          directionName: 'Edição Editorial / BookTok Sensation',
          conceptDescription: 'Tipografia dominante com fotografia dramática de alto contraste e silhueta sofisticada.',
          artisticRationale: 'O padrão de maior tração orgânica no BookTok e no topo do Kindle Unlimited.',
          visualPrompt: `luxurious contemporary romance book cover background, mysterious handsome billionaire silhouette and elegant woman in a dimly lit penthouse overlooking city lights at midnight, deep chiaroscuro, subtle golden bokeh reflections${styleModifier}${moodModifier}${paletteModifier}, ${antiTextDirective}`,
          artUrl: this.buildImageUrl(`luxury billionaire romance penthouse night city skyline lights silhouette chiaroscuro${styleModifier}${moodModifier}${paletteModifier}`, baseSeed + 101),
          fontFamily: "'Cinzel', Georgia, serif",
          titleColor: '#ffffff',
          subtitleColor: '#fbbf24',
          authorColor: '#f8fafc',
          badgeText: 'EDIÇÃO ESPECIAL ROMANCE',
          badgeBg: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
          scrimOpacity: 70
        },
        {
          id: `concept_2_${baseSeed}`,
          optionNumber: 2,
          directionName: 'Cinematográfica / Paixão & Atmosfera',
          conceptDescription: 'Enquadramento fotográfico de cinema em Golden Hour com praia, penhasco ou cidadezinha encantadora.',
          artisticRationale: 'Gera conexão emocional imediata em leitoras de romances intensos e arrebatadores.',
          visualPrompt: `breathtaking cinematic romance scene, emotional dramatic sunset on coastal cliff, gentle ocean breeze, rich amber violet and rose gold twilight sky, cinematic depth of field, romantic elegance${styleModifier}${moodModifier}${paletteModifier}, ${antiTextDirective}`,
          artUrl: this.buildImageUrl(`cinematic romance coastal cliff sunset amber violet sky dramatic depth of field${styleModifier}${moodModifier}${paletteModifier}`, baseSeed + 102),
          fontFamily: "'Playfair Display', Georgia, serif",
          titleColor: '#ffffff',
          subtitleColor: '#f43f5e',
          authorColor: '#f1f5f9',
          badgeText: 'ROMANCE INESQUECÍVEL',
          badgeBg: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
          scrimOpacity: 65
        },
        {
          id: `concept_3_${baseSeed}`,
          optionNumber: 3,
          directionName: 'Minimalista Bold / Rom-Com Moderna',
          conceptDescription: 'Ilustração vetorizada moderna em tons vibrantes com dinâmica divertida de opostos.',
          artisticRationale: 'Alta legibilidade em miniaturas e apelo com comédias românticas contemporâneas.',
          visualPrompt: `modern illustrated romantic comedy cover art, two stylish illustrated characters in fun grumpy and sunshine rivalry, cute coffee shop or small town pastel storefront background, bold contemporary vector aesthetic${styleModifier}${moodModifier}${paletteModifier}, ${antiTextDirective}`,
          artUrl: this.buildImageUrl(`modern illustrated rom-com cute characters grumpy sunshine small town pastel background${styleModifier}${moodModifier}${paletteModifier}`, baseSeed + 103),
          fontFamily: "'Montserrat', sans-serif",
          titleColor: '#0f172a',
          subtitleColor: '#2563eb',
          authorColor: '#334155',
          badgeText: 'COMÉDIA ROMÂNTICA',
          badgeBg: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
          scrimOpacity: 35
        },
        {
          id: `concept_4_${baseSeed}`,
          optionNumber: 4,
          directionName: 'Conceitual / Dark Luxury Gothic',
          conceptDescription: 'Rosas negras, joias e elementos metálicos sombrios com ar de suspense mafioso.',
          artisticRationale: 'Conversão garantida para nichos de Dark Romance e suspense romântico intenso.',
          visualPrompt: `dark luxury romantic suspense art, delicate black velvet roses intertwined with a glittering diamond necklace and ornate dagger, dramatic studio spotlight on dark obsidian backdrop, luxurious brooding tension${styleModifier}${moodModifier}${paletteModifier}, ${antiTextDirective}`,
          artUrl: this.buildImageUrl(`dark luxury romance black roses diamond necklace dagger dark obsidian dramatic spotlight${styleModifier}${moodModifier}${paletteModifier}`, baseSeed + 104),
          fontFamily: "'Cinzel', Georgia, serif",
          titleColor: '#fef08a',
          subtitleColor: '#e2e8f0',
          authorColor: '#ffffff',
          badgeText: 'DARK ROMANCE',
          badgeBg: 'linear-gradient(135deg, #881337 0%, #4c0519 100%)',
          scrimOpacity: 75
        }
      ];
    } else if (isThriller) {
      // 4 CONCEITOS PARA THRILLER / SUSPENSE
      return [
        {
          id: `concept_1_${baseSeed}`,
          optionNumber: 1,
          directionName: 'Edição Editorial / Domestic Thriller',
          conceptDescription: 'Fachada de casa suburbana escura à noite com apenas uma janela iluminada e cortinas misteriosas.',
          artisticRationale: 'O arquétipo clássico de suspense que lidera o ranking KDP de Freida McFadden e Shari Lapena.',
          visualPrompt: `psychological domestic thriller book cover art, eerie quiet suburban two-story house at twilight shrouded in thick fog, only one second-floor window glows with ominous warm light, mysterious dark silhouette inside${styleModifier}${moodModifier}${paletteModifier}, ${antiTextDirective}`,
          artUrl: this.buildImageUrl(`domestic psychological thriller quiet house twilight fog single glowing window silhouette${styleModifier}${moodModifier}${paletteModifier}`, baseSeed + 201),
          fontFamily: "'Montserrat', sans-serif",
          titleColor: '#fef08a',
          subtitleColor: '#ef4444',
          authorColor: '#f8fafc',
          badgeText: 'SUSPENSE & MISTÉRIO KDP',
          badgeBg: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
          scrimOpacity: 75
        },
        {
          id: `concept_2_${baseSeed}`,
          optionNumber: 2,
          directionName: 'Cinematográfica / Noir Noturno',
          conceptDescription: 'Avenida molhada pela chuva com neblina noturna e reflexos de néon sombrios.',
          artisticRationale: 'Cria imersão imediata de investigação e perigo iminente.',
          visualPrompt: `cinematic neo-noir crime suspense avenue at midnight, glistening rain-slicked asphalt reflecting pale yellow streetlights, solitary figure walking away into mist, volumetric deep shadows and intense mood${styleModifier}${moodModifier}${paletteModifier}, ${antiTextDirective}`,
          artUrl: this.buildImageUrl(`cinematic neo-noir rain asphalt mist solitary figure shadows crime thriller${styleModifier}${moodModifier}${paletteModifier}`, baseSeed + 202),
          fontFamily: "'Cinzel', Georgia, serif",
          titleColor: '#ffffff',
          subtitleColor: '#38bdf8',
          authorColor: '#cbd5e1',
          badgeText: 'SUSPENSE ELETRIZANTE',
          badgeBg: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          scrimOpacity: 70
        },
        {
          id: `concept_3_${baseSeed}`,
          optionNumber: 3,
          directionName: 'Minimalista Alto Impacto / Signal Red',
          conceptDescription: 'Contraste gritante de preto, cinza e uma fita ou objeto em vermelho vivo.',
          artisticRationale: 'Extrema legibilidade na miniatura da Amazon; prende a visão em meio a centenas de concorrentes.',
          visualPrompt: `high impact minimalist thriller concept, stark monochromatic black and concrete background with a single striking crimson red shattered key resting in the center, dramatic top lighting, razor sharp tension${styleModifier}${moodModifier}${paletteModifier}, ${antiTextDirective}`,
          artUrl: this.buildImageUrl(`minimalist thriller black concrete stark red shattered key dramatic lighting tension${styleModifier}${moodModifier}${paletteModifier}`, baseSeed + 203),
          fontFamily: "'Montserrat', sans-serif",
          titleColor: '#ffffff',
          subtitleColor: '#ef4444',
          authorColor: '#94a3b8',
          badgeText: 'FINAL CHOCANTE',
          badgeBg: 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)',
          scrimOpacity: 65
        },
        {
          id: `concept_4_${baseSeed}`,
          optionNumber: 4,
          directionName: 'Conceitual / Labirinto Psicológico',
          conceptDescription: 'Metáfora de espelho quebrado ou corredor infinito representando a mente e memórias perdidas.',
          artisticRationale: 'Apelo direto para leitores que adoram jogos mentais e reviravoltas na trama.',
          visualPrompt: `conceptual psychological thriller, surreal endless corridor with antique mirrors reflecting distorted shadows, eerie atmospheric haze, dark slate and cold blue tones, psychological vertigo and secrets${styleModifier}${moodModifier}${paletteModifier}, ${antiTextDirective}`,
          artUrl: this.buildImageUrl(`conceptual psychological thriller endless corridor mirrors shadows cold blue haze${styleModifier}${moodModifier}${paletteModifier}`, baseSeed + 204),
          fontFamily: "'Playfair Display', Georgia, serif",
          titleColor: '#ffffff',
          subtitleColor: '#f59e0b',
          authorColor: '#f1f5f9',
          badgeText: 'TRAMA PSICOLÓGICA',
          badgeBg: 'linear-gradient(135deg, #475569 0%, #1e293b 100%)',
          scrimOpacity: 75
        }
      ];
    } else {
      // 4 CONCEITOS PARA NÃO-FICÇÃO / AUTOAJUDA / NEGÓCIOS / DESENVOLVIMENTO PESSOAL
      return [
        {
          id: `concept_1_${baseSeed}`,
          optionNumber: 1,
          directionName: 'Edição Editorial / Gold Prestige',
          conceptDescription: 'Design executivo imponente em azul profundo (Navy) com acentos dourados e arquitetura moderna.',
          artisticRationale: 'O padrão de ouro de livros corporativos e de alta performance de Harvard e Wall Street.',
          visualPrompt: `prestigious business and leadership book cover background, modern corporate glass skyscraper summit at dusk reflecting warm golden sunlight, sleek geometric lines, deep slate blue shadows with subtle luminous 24k gold leaf accents${styleModifier}${moodModifier}${paletteModifier}, ${antiTextDirective}`,
          artUrl: this.buildImageUrl(`prestigious business book cover skyscraper summit golden sunlight slate blue 24k gold accents${styleModifier}${moodModifier}${paletteModifier}`, baseSeed + 301),
          fontFamily: "'Cinzel', Georgia, serif",
          titleColor: '#ffffff',
          subtitleColor: '#fbbf24',
          authorColor: '#f1f5f9',
          badgeText: 'EDIÇÃO OFICIAL KDP',
          badgeBg: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
          scrimOpacity: 70
        },
        {
          id: `concept_2_${baseSeed}`,
          optionNumber: 2,
          directionName: 'Cinematográfica / Amanhecer de Conquista',
          conceptDescription: 'Horizonte expansivo com raio de sol atravessando a névoa matinal sobre o topo de montanhas.',
          artisticRationale: 'Transmite clareza mental, superação e triunfo inabalável para o leitor.',
          visualPrompt: `cinematic self-help atmosphere, majestic panoramic mountain peak at early morning sunrise, single powerful ray of warm light piercing through dramatic clouds, expansive scale, breathtaking clarity and triumph${styleModifier}${moodModifier}${paletteModifier}, ${antiTextDirective}`,
          artUrl: this.buildImageUrl(`cinematic self-help mountain peak sunrise golden light clouds clarity triumph${styleModifier}${moodModifier}${paletteModifier}`, baseSeed + 302),
          fontFamily: "'Montserrat', sans-serif",
          titleColor: '#ffffff',
          subtitleColor: '#38bdf8',
          authorColor: '#f8fafc',
          badgeText: 'EDIÇÃO DEFINITIVA',
          badgeBg: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          scrimOpacity: 65
        },
        {
          id: `concept_3_${baseSeed}`,
          optionNumber: 3,
          directionName: 'Minimalista Bold / Impacto Direto',
          conceptDescription: 'Escultura geométrica minimalista em fundo contrastado com foco absoluto na mensagem.',
          artisticRationale: 'Estilo consagrado por Atomic Habits e Deep Work com foco em autoridade e sem ruído.',
          visualPrompt: `ultra clean minimalist book cover concept representing ${topic}, striking solitary geometric form in polished obsidian and white stone, razor-sharp focus, pristine studio gradient lighting, conceptual purity${styleModifier}${moodModifier}${paletteModifier}, ${antiTextDirective}`,
          artUrl: this.buildImageUrl(`ultra clean minimalist book cover geometric form obsidian white stone studio lighting${styleModifier}${moodModifier}${paletteModifier}`, baseSeed + 303),
          fontFamily: "'Montserrat', sans-serif",
          titleColor: '#ffffff',
          subtitleColor: '#34d399',
          authorColor: '#cbd5e1',
          badgeText: 'MÉTODO PRÁTICO',
          badgeBg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
          scrimOpacity: 60
        },
        {
          id: `concept_4_${baseSeed}`,
          optionNumber: 4,
          directionName: 'Conceitual / Arquitetura de Foco',
          conceptDescription: 'Metáfora visual de engrenagens de precisão ou feixe de bússola dourada em fundo fosco.',
          artisticRationale: 'Atrai profissionais analíticos, líderes e leitores que valorizam sistemas e métodos comprovados.',
          visualPrompt: `intellectual conceptual book cover art, intricate golden mechanical compass and luminous pathways resting on deep dark graphite surface, dramatic focal light beam, theme of strategic vision and discipline${styleModifier}${moodModifier}${paletteModifier}, ${antiTextDirective}`,
          artUrl: this.buildImageUrl(`intellectual conceptual book cover golden compass luminous pathways dark graphite focal light${styleModifier}${moodModifier}${paletteModifier}`, baseSeed + 304),
          fontFamily: "'Cinzel', Georgia, serif",
          titleColor: '#fef08a',
          subtitleColor: '#e2e8f0',
          authorColor: '#ffffff',
          badgeText: 'BASEADO EM CIÊNCIA',
          badgeBg: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
          scrimOpacity: 75
        }
      ];
    }
  }

  /**
   * Refina uma capa existente com base em uma instrução de melhoria com IA
   */
  public static refineCoverConcept(
    concept: CoverVisualConcept,
    improvementType: string,
    userCustomText: string = '',
    project: BookProject
  ): CoverVisualConcept {
    const newSeed = Math.floor(Math.random() * 900000) + 100000;
    let addedPrompt = '';
    let newFamily = concept.fontFamily;
    let newTitleColor = concept.titleColor;
    let newSubtitleColor = concept.subtitleColor;
    let newScrim = concept.scrimOpacity;

    switch (improvementType) {
      case 'Mais profissional':
        addedPrompt = ', prestigious corporate editorial look, cleaner lighting, symmetrical golden ratio framing';
        newFamily = "'Cinzel', Georgia, serif";
        newScrim = Math.min(85, concept.scrimOpacity + 10);
        break;
      case 'Mais comercial':
        addedPrompt = ', vibrant punchy contrast, bold commercial appeal, high saturation focal point for amazon thumbnail';
        newFamily = "'Montserrat', sans-serif";
        newTitleColor = '#ffffff';
        newSubtitleColor = '#fbbf24';
        break;
      case 'Mais elegante':
        addedPrompt = ', high fashion luxury aesthetic, refined muted palette, delicate gold accents, subtle chiaroscuro';
        newFamily = "'Playfair Display', Georgia, serif";
        newTitleColor = '#fef08a';
        break;
      case 'Mais impactante':
        addedPrompt = ', dramatic high contrast, volumetric rim lighting, powerful focal subject, bold scale';
        newFamily = "'Montserrat', sans-serif";
        newScrim = Math.min(90, concept.scrimOpacity + 15);
        break;
      case 'Mais minimalista':
        addedPrompt = ', extreme negative space, single striking focal element, clean neutral background';
        newScrim = 60;
        break;
      case 'Melhorar composição':
        addedPrompt = ', perfect rule of thirds composition, ample negative space at top third for title, balanced harmony';
        break;
      case 'Melhorar tipografia':
        newFamily = concept.fontFamily.includes('Cinzel') ? "'Montserrat', sans-serif" : "'Cinzel', Georgia, serif";
        newTitleColor = '#ffffff';
        newSubtitleColor = '#fde68a';
        newScrim = 75;
        break;
      case 'Alterar cores':
        addedPrompt = ', alternative color harmony, rich atmospheric twilight grading with warm accents';
        break;
      default:
        break;
    }

    if (userCustomText.trim()) {
      addedPrompt += `, custom user directive: ${userCustomText.trim()}`;
    }

    const updatedPrompt = `${concept.visualPrompt}${addedPrompt}`;
    const newArtUrl = this.buildImageUrl(updatedPrompt, newSeed);

    return {
      ...concept,
      id: `concept_refined_${newSeed}`,
      directionName: `${concept.directionName} (Refinada IA)`,
      conceptDescription: `${concept.conceptDescription} • Ajuste: ${improvementType}${userCustomText ? ` ("${userCustomText}")` : ''}`,
      visualPrompt: updatedPrompt,
      artUrl: newArtUrl,
      fontFamily: newFamily,
      titleColor: newTitleColor,
      subtitleColor: newSubtitleColor,
      scrimOpacity: newScrim
    };
  }

  /**
   * Constrói a URL direta de renderização com o motor FLUX de alta resolução via Pollinations AI
   */
  private static buildImageUrl(basePrompt: string, seed: number): string {
    const cleanPrompt = basePrompt
      .replace(/\b(best[- ]?sellers?|bestselling)\b/gi, 'editorial')
      .trim();
    const clean = encodeURIComponent(`${cleanPrompt}, 8k uhd, photorealistic, professional book cover background art, vertical composition, no text, no letters, no words, no bestseller badge, no sticker, no awards ribbon, no fake labels`);
    return `https://image.pollinations.ai/prompt/${clean}?width=1024&height=1536&seed=${seed}&model=flux&nologo=true`;
  }
}
