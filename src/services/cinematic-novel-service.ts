// Serviço Especializado para o Romance Cinematográfico Realista
// Gerencia Roteiro, Story Bible, Character Bible, Page Generation Pipeline e Geração Visual

import { aiService } from './ai-service';
import {
  CinematicNovelProjectData,
  CinematicCharacter,
  CinematicStoryBible,
  CinematicPagePlan,
  CinematicPanel,
  CinematicGenre,
  INITIAL_CINEMATIC_CHECKLIST
} from '../types/cinematic-novel';
import { jsPDF } from 'jspdf';

export interface CreateCinematicNovelParams {
  title: string;
  subtitle?: string;
  author: string;
  genre: CinematicGenre;
  subgenre: string;
  language: string;
  targetAudience: string;
  premise: string;
  totalChaptersPlanned: number;
  approximatePages: number;
  visualStyle: string;
  emotionalTone: string;
  endingType: string;
  narrativePov: string;
}

export class CinematicNovelService {
  /**
   * Inicializa um novo projeto do Romance Cinematográfico Realista
   */
  static createInitialProject(params: CreateCinematicNovelParams): CinematicNovelProjectData {
    const id = `cinematic_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    
    return {
      id,
      title: params.title || 'A Última Mentira Perfeita',
      subtitle: params.subtitle || 'Um Romance Cinematográfico Realista',
      author: params.author || 'Autor(a)',
      genre: params.genre,
      subgenre: params.subgenre,
      language: params.language || 'Português',
      targetAudience: params.targetAudience || 'Adulto',
      premise: params.premise,
      totalChaptersPlanned: params.totalChaptersPlanned || 3,
      approximatePages: params.approximatePages || 12,
      visualStyle: params.visualStyle || 'Fotografia Cinematográfica 35mm Realista',
      emotionalTone: params.emotionalTone || 'Tenso, envolvente e claustrofóbico',
      endingType: params.endingType || 'Plot twist chocante com revelação psicológica',
      narrativePov: params.narrativePov || 'Terceira pessoa limitada na protagonista',
      storyBible: {
        synopsis: '',
        premise: params.premise,
        centralConflict: '',
        plannedResolution: '',
        chapterSummaries: [],
        currentLocations: {},
        characterKnowledge: {},
        unrevealedSecrets: [],
        importantObjects: [],
        characterOutfits: {},
        physicalChangesOrInjuries: {},
        timelineSequence: 'Dia 1 - Madrugada chuvosa',
        activeConflicts: [],
        upcomingEvents: []
      },
      characters: [],
      pages: [],
      checklist: JSON.parse(JSON.stringify(INITIAL_CINEMATIC_CHECKLIST)),
      status: 'ideia',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  /**
   * Gera Roteiro Completo, Story Bible e Character Bible com IA (Gemini)
   */
  static async generateScriptAndBibles(project: CinematicNovelProjectData): Promise<{
    storyBible: CinematicStoryBible;
    characters: CinematicCharacter[];
    suggestedTitle: string;
    suggestedSubtitle: string;
  }> {
    const systemPrompt = `Você é um premiado diretor de cinema e autor de Graphic Novels / Foto Livros de Ficção Realista de nível mundial.
Sua missão é desenvolver o roteiro completo, a Story Bible rigorosa e a Character Bible para um Romance Cinematográfico Realista.

Diretrizes Imperativas:
1. Gênero: "${project.genre}" (Subgênero: "${project.subgenre}").
2. Premissa: "${project.premise}".
3. Estilo Visual: "${project.visualStyle}".
4. Tom Emocional: "${project.emotionalTone}".
5. Número de Capítulos: ${project.totalChaptersPlanned}.
6. As descrições visuais de personagens devem ser EXTREMAMENTE ESPECÍFICAS (formato de rosto, olhos, corte de cabelo, textura da pele, marcas únicas) para garantir fotorrealismo e continuidade perfeita entre imagens.
7. A história precisa ter densidade dramática e riqueza de conteúdo.

Você DEVE responder ESTRITAMENTE em formato JSON válido, sem texto fora do JSON:
{
  "suggestedTitle": "Título impactante",
  "suggestedSubtitle": "Subtítulo intrigante",
  "synopsis": "Sinopse aprofundada da obra com riqueza literária",
  "centralConflict": "O dilema central",
  "plannedResolution": "Como a trama culmina e se resolve",
  "characters": [
    {
      "name": "Nome completo",
      "age": "Idade",
      "role": "protagonista" ou "antagonista" ou "coadjuvante",
      "faceShape": "ex: Rosto oval expressivo com maçãs salientes",
      "skinTone": "ex: Morena clara com subtom quente",
      "eyes": "ex: Olhos castanho-escuros amendoados",
      "hair": "ex: Cabelo castanho ondulado até os ombros",
      "heightAndBuild": "ex: 1,68m, porte elegante e esguio",
      "distinctiveMarks": "ex: Pequena pinta acima do lábio esquerdo",
      "costumes": ["Roupão de lã cinza com amarração firme", "Casaco bege de alfaiataria"],
      "accessories": ["Aliança fina de ouro velho", "Relógio analógico minimalista"],
      "personality": "Determinada, porém abalada por segredos passados",
      "speakingStyle": "Frases contidas, pausas reflexivas",
      "relationships": { "Outro Personagem": "Médico e confidente com segredos mútuos" }
    }
  ],
  "chapterSummaries": [
    {
      "chapterNumber": 1,
      "title": "Título do Capítulo",
      "summary": "Resumo detalhado dos acontecimentos",
      "keyHappenings": ["Acontecimento 1", "Acontecimento 2"],
      "timeline": "06:17 da manhã de terça-feira",
      "location": "Apartamento urbano silencioso"
    }
  ],
  "unrevealedSecrets": ["Segredo 1", "Segredo 2"],
  "importantObjects": ["Bilhete anônimo", "Envelope pardo", "Relógio digital"],
  "timelineSequence": "Cronologia inicial estabelecida"
}`;

    try {
      const response = await aiService.chatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Crie a bíblia e roteiro para a história: ${project.title} - ${project.premise}` }
        ],
        { maxTokens: 4096, responseFormat: 'json', temperature: 0.7 }
      );

      const parsed = JSON.parse(response.replace(/```json|```/g, '').trim());

      if (!Array.isArray(parsed.characters) || parsed.characters.length === 0) {
        return this.generateFallbackScriptAndBibles(project);
      }
      
      const characters: CinematicCharacter[] = (parsed.characters || []).map((c: any, idx: number) => ({
        id: `char_${idx + 1}_${Date.now()}`,
        name: c.name || `Personagem ${idx + 1}`,
        age: c.age || '32 anos',
        role: c.role || (idx === 0 ? 'protagonista' : 'coadjuvante'),
        faceShape: c.faceShape || 'Rosto oval proporcional',
        skinTone: c.skinTone || 'Clara natural',
        eyes: c.eyes || 'Olhos castanhos profundos',
        hair: c.hair || 'Cabelos castanhos escuros naturais',
        heightAndBuild: c.heightAndBuild || '1,70m, constituição média',
        distinctiveMarks: c.distinctiveMarks || 'Expressão pensativa e olhar focado',
        costumes: Array.isArray(c.costumes) ? c.costumes : ['Roupão cinza clássico', 'Traje cotidiano'],
        accessories: Array.isArray(c.accessories) ? c.accessories : ['Relógio de pulso'],
        personality: c.personality || 'Determinado(a) e observador(a)',
        speakingStyle: c.speakingStyle || 'Voz calma e direta',
        relationships: c.relationships || {},
        isApproved: false
      }));

      const storyBible: CinematicStoryBible = {
        synopsis: parsed.synopsis || project.premise,
        premise: project.premise,
        centralConflict: parsed.centralConflict || '',
        plannedResolution: parsed.plannedResolution || '',
        chapterSummaries: parsed.chapterSummaries || [
          {
            chapterNumber: 1,
            title: 'O Despertar no Quarto Cinza',
            summary: 'A protagonista acorda em uma manhã fria e encontra vestígios inexplicáveis em sua casa.',
            keyHappenings: ['Despertar solitário', 'Encontro do envelope misterioso'],
            timeline: '06:17 da manhã',
            location: 'Casa da protagonista'
          }
        ],
        currentLocations: {
          [characters[0]?.id || 'char_1']: 'Quarto da protagonista'
        },
        characterKnowledge: {
          [characters[0]?.id || 'char_1']: ['Sabe que algo aconteceu na ponte, mas tem lapsos de memória']
        },
        unrevealedSecrets: parsed.unrevealedSecrets || ['A verdade sobre a noite do acidente na ponte'],
        importantObjects: parsed.importantObjects || ['Envelope pardo com bilhete', 'Cafeteira ligada', 'Despertador digital 06:17'],
        characterOutfits: {
          [characters[0]?.id || 'char_1']: characters[0]?.costumes?.[0] || 'Roupão de lã cinza'
        },
        physicalChangesOrInjuries: {},
        timelineSequence: parsed.timelineSequence || 'Terça-feira, 06:17 da manhã',
        activeConflicts: ['A perda de memória recente', 'A suspeita de invasão domiciliar'],
        upcomingEvents: ['Confronto no consultório médico', 'Descoberta do remetente do bilhete']
      };

      return {
        storyBible,
        characters,
        suggestedTitle: parsed.suggestedTitle || project.title,
        suggestedSubtitle: parsed.suggestedSubtitle || project.subtitle
      };
    } catch (err) {
      console.warn('[CinematicNovelService] Falha ou timeout na IA, acionando gerador cinematográfico inteligente de fallback:', err);
      return this.generateFallbackScriptAndBibles(project);
    }
  }

  /**
   * Gerador de contingência com alta riqueza literária e coerência garantida
   */
  private static generateFallbackScriptAndBibles(project: CinematicNovelProjectData): {
    storyBible: CinematicStoryBible;
    characters: CinematicCharacter[];
    suggestedTitle: string;
    suggestedSubtitle: string;
  } {
    const isThriller = project.genre.includes('thriller') || project.genre.includes('suspense') || project.genre.includes('misterio');

    const protagonist: CinematicCharacter = {
      id: `char_1_${Date.now()}`,
      name: isThriller ? 'Helena Vance' : 'Clara Albuquerque',
      age: '34 anos',
      role: 'protagonista',
      faceShape: 'Rosto anguloso com traços marcantes e maçãs salientes',
      skinTone: 'Pele clara com textura realista e suave palidez',
      eyes: 'Olhos castanhos amendoados, olhar perspicaz e atento',
      hair: 'Cabelos castanhos ondulados na altura das clavículas',
      heightAndBuild: '1,68m, postura elegante com leve tensão nos ombros',
      distinctiveMarks: 'Pequena cicatriz discreta na têmpora esquerda',
      costumes: ['Roupão felpudo de lã cinza-chumbo amarrado à cintura', 'Casaco de lã preto com gola alta'],
      accessories: ['Aliança fina de prata fosca', 'Relógio analógico suíço com pulseira de couro'],
      personality: 'Perspicaz, metódica, mas profundamente abalada por lacunas em sua memória recente',
      speakingStyle: 'Tom baixo, articulado, pausas pesadas quando desafiada',
      relationships: {
        'Dr. Arthur Miller': 'Médico psiquiatra e antigo amigo da família'
      },
      isApproved: false
    };

    const deuteragonist: CinematicCharacter = {
      id: `char_2_${Date.now()}`,
      name: isThriller ? 'Dr. Arthur Miller' : 'Eduardo Menezes',
      age: '42 anos',
      role: 'coadjuvante',
      faceShape: 'Rosto quadrado com barba cerrada bem aparada',
      skinTone: 'Clara, levemente bronzeada',
      eyes: 'Olhos castanhos protegidos por óculos de armação fina escura',
      hair: 'Cabelos castanhos curtos com fios grisalhos nas têmporas',
      heightAndBuild: '1,82m, porte sóbrio e acadêmico',
      distinctiveMarks: 'Óculos de armação de titânio escuro, olhar analítico',
      costumes: ['Jaleco médico branco impecável sobre camisa azul clara e gravata escura'],
      accessories: ['Estetoscópio no bolso, caneta tinteiro prateada'],
      personality: 'Empático na superfície, porém reservado e calculista',
      speakingStyle: 'Voz grave, didática e reconfortante',
      relationships: {
        'Helena Vance': 'Médico assistente responsável por seu tratamento neuropsicológico'
      },
      isApproved: false
    };

    const characters = [protagonist, deuteragonist];

    const storyBible: CinematicStoryBible = {
      synopsis: 'Após acordar com a sensação paralisante de que o tempo lhe escapou, Helena encontra um bilhete anônimo com uma frase que desmorona sua sanidade: "Você esqueceu o que aconteceu na ponte". Ao buscar respostas com seu médico de confiança, ela percebe que a rede de silêncio ao seu redor foi tecida por aqueles em quem mais confiava.',
      premise: project.premise || 'Uma mulher acorda sem memórias de uma noite fatídica e precisa decifrar mensagens enigmáticas deixadas em sua própria casa.',
      centralConflict: 'A luta de Helena para recuperar a verdade sobre a ponte antes que aqueles que a monitoram apaguem suas memórias definitivamente.',
      plannedResolution: 'Helena descobre que o bilhete foi escrito por ela mesma em um estado de alerta anterior, desmascarando a farsa do Dr. Arthur.',
      chapterSummaries: [
        {
          chapterNumber: 1,
          title: 'O Despertar no Quarto Cinza',
          summary: 'Helena acorda às 06:17 da manhã com a chuva batendo na janela. Na cozinha silenciosa, descobre a cafeteira ligada e um envelope pardo fechado com um bilhete perturbador.',
          keyHappenings: [
            'Despertar ao som da chuva e verificação do relógio digital (06:17)',
            'Caminhada solitária pelo corredor frio da casa',
            'Descoberta do envelope pardo com a caligrafia inquietante',
            'Primeira consulta urgente no consultório médico'
          ],
          timeline: 'Terça-feira, entre 06:17 e 09:30 da manhã',
          location: 'Casa de Helena e consultório do Dr. Arthur'
        },
        {
          chapterNumber: 2,
          title: 'A Sombra da Ponte',
          summary: 'Confrontada com perguntas desconfortáveis no consultório, Helena nota inconsistências nas anotações médicas e decide investigar o local mencionado no bilhete.',
          keyHappenings: [
            'Confronto tenso com Dr. Arthur',
            'Localização de chaves escondidas em seu veículo',
            'Viagem até a ponte sob névoa densa'
          ],
          timeline: 'Terça-feira à tarde',
          location: 'Consultório e rodovia costeira'
        }
      ],
      currentLocations: {
        [protagonist.id]: 'Quarto da residência'
      },
      characterKnowledge: {
        [protagonist.id]: ['Não se lembra de quem esteve na casa na noite anterior', 'Sentiu calafrio ao ler sobre a ponte']
      },
      unrevealedSecrets: [
        'Dr. Arthur possui gravações da noite da ponte que nunca entregou à polícia',
        'Helena estava acompanhada por uma terceira pessoa na ponte'
      ],
      importantObjects: [
        'Despertador digital vermelho (06:17)',
        'Roupão de lã cinza com nós firmes na cintura',
        'Cafeteira elétrica com jarra de vidro fumegante',
        'Envelope pardo rústico com bilhete: "Você esqueceu o que aconteceu na ponte."',
        'Prontuário médico com carimbo sigiloso'
      ],
      characterOutfits: {
        [protagonist.id]: 'Roupão de lã cinza com nós firmes na cintura',
        [deuteragonist.id]: 'Jaleco branco e camisa azul-claro'
      },
      physicalChangesOrInjuries: {
        [protagonist.id]: 'Leve tensão muscular e dor latejante na têmpora esquerda'
      },
      timelineSequence: 'Terça-feira, 06:17 AM - Manhã fria e úmida',
      activeConflicts: [
        'Medo de estar perdendo o contato com a realidade',
        'Desconfiança crescente em relação ao Dr. Arthur'
      ],
      upcomingEvents: [
        'Chegada à ponte de concreto ao entardecer',
        'Revelação do verdadeiro autor do bilhete'
      ]
    };

    return {
      storyBible,
      characters,
      suggestedTitle: project.title || 'A Última Mentira Perfeita',
      suggestedSubtitle: project.subtitle || 'Capítulo 1: O Despertar no Quarto Cinza'
    };
  }

  /**
   * Gera Prompt Visual Específico e Imagem de Referência Fotorrealista para um Personagem
   */
  static async generateCharacterVisualReference(character: CinematicCharacter): Promise<{
    imageUrl: string;
    prompt: string;
  }> {
    const prompt = `cinematic 35mm photography, ultra-realistic portrait of ${character.name}, ${character.age}, ${character.faceShape}, ${character.skinTone}, ${character.eyes}, ${character.hair}, ${character.distinctiveMarks}, wearing ${character.costumes[0] || 'minimalist clothing'}, dramatic soft lighting, photorealistic textures, 8k resolution, authentic cinema movie still, shallow depth of field, 85mm lens, highly detailed pores and eyes, raw emotion, no cartoon, no 3d render, no text, no watermark`;

    try {
      const imageUrl = await aiService.generateImage(prompt);
      return { imageUrl, prompt };
    } catch (err) {
      console.warn('[CinematicNovelService] Falha ao gerar imagem de personagem com motor principal:', err);
      // Fallback seguro via Pollinations FLUX
      const encoded = encodeURIComponent(prompt.substring(0, 400));
      const seed = Math.floor(Math.random() * 899999 + 100000);
      return {
        imageUrl: `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&model=flux&seed=${seed}`,
        prompt
      };
    }
  }

  /**
   * PAGE GENERATION PIPELINE:
   * Planeja cada página individualmente com os 22 campos obrigatórios e prompt visual único
   */
  static async planPage(
    project: CinematicNovelProjectData,
    chapterNumber: number,
    pageNumber: number,
    sceneIdea?: string
  ): Promise<CinematicPagePlan> {
    const chapter = project.storyBible.chapterSummaries.find(c => c.chapterNumber === chapterNumber) || {
      chapterNumber,
      title: `Capítulo ${chapterNumber}`,
      summary: 'Desenvolvimento dramático',
      keyHappenings: ['Acontecimento de destaque'],
      timeline: project.storyBible.timelineSequence,
      location: 'Cenário da cena'
    };

    const previousPage = project.pages.find(p => p.pageNumber === pageNumber - 1);
    const mainChar = project.characters[0] || { name: 'Helena', id: 'char_1' };
    const secondaryChar = project.characters[1] || { name: 'Dr. Arthur', id: 'char_2' };

    // Construção do registro estruturado de 22 parâmetros
    const pageId = `page_${chapterNumber}_${pageNumber}_${Date.now()}`;
    const dramaticObjective = pageNumber === 1 
      ? 'Apresentar a desorientação da protagonista ao acordar e a descoberta do bilhete que quebra sua rotina.' 
      : 'Aprofundar a tensão e a desconfiança da protagonista frente a evidências que contradizem sua memória.';

    // Prompt visual individual e densamente contextualizado para esta página
    const visualPrompt = pageNumber === 1
      ? `cinematic graphic novel film panels, 35mm photography, movie stills of ${mainChar.name}, realistic woman in early 30s with wavy brown hair, wearing dark gray wool bathrobe. Sequence of dramatic cuts: waking up in bed looking at the ceiling, digital alarm clock showing red 06:17, walking bare feet on wooden floor, tying bathrobe waist knot, walking down quiet hallway, looking at dark coffee maker and brown kraft envelope on kitchen counter, close-up reading handwritten note, meeting doctor in white coat in consultation room. Photorealistic, cinematic lighting, rain outside, atmospheric tension, 8k resolution, raw photo quality, absolutely no text overlay, no white borders`
      : `cinematic photography, 35mm film still of ${mainChar.name} facing ${secondaryChar.name} in consultation office, tense expressions, low depth of field, dramatic morning window light, high realism, authentic textures, movie capture, no text, no watermark`;

    // Multi-painéis cinematográficos com narração literária rica e diálogos sem fundo branco
    const panels: CinematicPanel[] = pageNumber === 1 ? [
      {
        id: `p1_${pageId}`,
        panelIndex: 1,
        framing: 'plano-geral-estabelecedor',
        sceneDescription: 'Rua chuvosa lá fora pela madrugada e Helena encarando o teto ao acordar.',
        visualPrompt: `cinematic 35mm film still, suburban street under heavy night rain with headlights, cutting to woman lying in bed staring at ceiling, dramatic cold blue atmosphere`,
        narrationText: 'Helena abriu os olhos lentamente e encarou o teto branco. O gesso exibia uma pequena mancha amarelada perto do canto da luminária, um detalhe que ela conhecia bem. Ela virou a cabeça para o lado esquerdo e viu o despertador digital sobre a mesa de cabeceira de madeira escura. Eram exatamente seis e dezessete da manhã de uma terça-feira fria.',
        dialogues: []
      },
      {
        id: `p2_${pageId}`,
        panelIndex: 2,
        framing: 'close-up-dramatico',
        sceneDescription: 'Helena sentada na cama puxando o ar com as mãos no rosto.',
        visualPrompt: `cinematic movie close up, woman sitting in bed with hands over face, wearing gray wool bathrobe, exhausted expression, soft lamp light in background`,
        narrationText: 'A coberta de algodão azul estava puxada até o seu peito. O quarto mantinha uma temperatura fresca, vinda da fresta da janela que dava para a rua movimentada lá embaixo. Ela ouviu o som abafado de pneus passando pelo asfalto úmido e sentou-se na cama, sentindo o travesseiro ao seu lado vazio e frio.',
        dialogues: [
          {
            id: `d1_${pageId}`,
            speakerId: mainChar.id,
            speakerName: mainChar.name,
            speechText: 'Que peso é esse que eu sinto no peito logo ao acordar?...',
            speechType: 'thought'
          }
        ]
      },
      {
        id: `p3_${pageId}`,
        panelIndex: 3,
        framing: 'plano-detalhe',
        sceneDescription: 'Pés descalços no piso de madeira e nós firmes amarrando o roupão cinza.',
        visualPrompt: `cinematic detailed shot, bare feet stepping onto dark wooden floor, followed by close-up of woman hands tying knot on gray textured wool bathrobe, realistic skin texture`,
        narrationText: 'Ela jogou as pernas para fora da cama e colocou os pés descalços no piso de tacos de madeira. O contato com a superfície fria provocou um leve arrepio em suas pernas. Vestiu seu roupão de lã cinza, amarrando o cinto com nós firmes na cintura, e caminhou em direção à porta do quarto.',
        dialogues: []
      },
      {
        id: `p4_${pageId}`,
        panelIndex: 4,
        framing: 'plano-medio',
        sceneDescription: 'Caminhando de costas pelo corredor até a cozinha, vendo a cafeteira e o envelope.',
        visualPrompt: `cinematic photography, woman walking down long apartment corridor from behind, entering kitchen where coffee maker is brewing next to a brown kraft envelope, warm dark kitchen tones`,
        narrationText: 'O piso estalava sob o seu peso, um som rítmico que pontuava o silêncio da casa. Ao sair no corredor, o cheiro de café se tornou mais forte. Na cozinha, a cafeteira elétrica estava ligada sobre a bancada de granito preto, e ao lado havia um envelope pardo fechado, apoiado contra o saleiro.',
        dialogues: [
          {
            id: `d2_${pageId}`,
            speakerId: mainChar.id,
            speakerName: mainChar.name,
            speechText: 'Que envelope é esse? Eu não deixei nada aqui ontem à noite...',
            speechType: 'speech'
          }
        ]
      },
      {
        id: `p5_${pageId}`,
        panelIndex: 5,
        framing: 'close-up-dramatico',
        sceneDescription: 'Helena lendo o bilhete do envelope com espanto, e corte para o consultório médico.',
        visualPrompt: `cinematic shot, close up on woman trembling hands holding kraft paper note reading text, cross cut to doctor with glasses in medical coat in bright office`,
        narrationText: 'Ela pegou o envelope e o abriu com cuidado. Dentro, havia apenas um bilhete em papel pardo áspero com uma caligrafia firme que fez seu coração parar: "Você esqueceu o que aconteceu na ponte." Mais tarde, no consultório do Dr. Arthur, a certeza de que algo terrível havia sido ocultado tomou conta de cada respiração.',
        dialogues: [
          {
            id: `d3_${pageId}`,
            speakerId: secondaryChar.id,
            speakerName: secondaryChar.name,
            speechText: 'Helena, você precisa saber que isso não é uma coincidência. Há coisas sobre aquela noite que você ainda não processou.',
            speechType: 'speech'
          }
        ],
        documentInset: {
          text: 'Você esqueceu o que aconteceu na ponte.',
          textureType: 'bilhete-pardo'
        }
      }
    ] : [
      {
        id: `p1_single_${pageId}`,
        panelIndex: 1,
        framing: 'plano-medio',
        sceneDescription: `Cena dramática no consultório médico entre ${mainChar.name} e ${secondaryChar.name}.`,
        visualPrompt: visualPrompt,
        narrationText: `O silêncio no consultório parecia pesar toneladas. O Dr. Arthur ajeitou os óculos sobre o nariz e cruzou os dedos sobre a mesa de mogno. Helena mantinha os olhos fixos nos papéis diante dele, reconhecendo que cada explicação oferecida até então era apenas uma cortina de fumaça para proteger um segredo que não podia ser enterrado.`,
        dialogues: [
          {
            id: `d1_p2_${pageId}`,
            speakerId: secondaryChar.id,
            speakerName: secondaryChar.name,
            speechText: 'Se você continuar cavando essa lembrança, não terá como voltar atrás, Helena.',
            speechType: 'speech'
          },
          {
            id: `d2_p2_${pageId}`,
            speakerId: mainChar.id,
            speakerName: mainChar.name,
            speechText: 'Eu já perdi o chão no momento em que encontrei aquele bilhete. Não me peça para fingir que nada aconteceu.',
            speechType: 'speech'
          }
        ]
      }
    ];

    const plan: CinematicPagePlan = {
      id: pageId,
      bookId: project.id,
      chapterNumber,
      chapterTitle: chapter.title,
      pageNumber,
      
      // 22 CAMPOS OBRIGATÓRIOS DO PIPELINE
      sceneSummary: sceneIdea || (pageNumber === 1 ? 'O despertar no quarto cinza e a descoberta do bilhete do envelope pardo' : 'Confronto investigativo com Dr. Arthur'),
      previousNarrativeContext: previousPage ? previousPage.sceneSummary : 'Início da narrativa — Helena acordando às 06:17',
      dramaticObjective,
      charactersPresent: pageNumber === 1 ? [mainChar.id] : [mainChar.id, secondaryChar.id],
      mandatoryVisualReferences: [mainChar.name, 'Roupão de lã cinza', 'Envelope pardo', 'Despertador 06:17'],
      charactersAppearance: `${mainChar.name}: 34 anos, rosto oval expressivo, cabelos castanhos ondulados, olhar inquieto`,
      costumeAndProps: 'Roupão de lã cinza com amarração firme na cintura, xícara de cerâmica, envelope pardo com bilhete',
      environmentSetting: pageNumber === 1 ? 'Quarto com luz matinal chuvosa, corredor de tacos e cozinha com bancada de granito' : 'Consultório médico elegante com persianas semiabertas',
      timeAndLighting: '06:17 da manhã, luz fria difusa da chuva de madrugada contrastando com iluminação amarelada suave',
      actionsAndExpressions: 'Despertar com sobressalto, olhar apreensivo ao redor, mãos trêmulas segurando o bilhete',
      cameraFraming: pageNumber === 1 ? 'close-up-dramatico' : 'plano-medio',
      imageComposition: 'Painéis sequenciais cinematográficos com corte narrativo contínuo e espaço superior para legendas',
      requiredElements: ['Despertador 06:17', 'Roupão cinza', 'Envelope pardo', 'Bilhete "Você esqueceu o que aconteceu na ponte"'],
      persistentElements: ['Traços faciais da protagonista Helena', 'Corte e cor do cabelo castanho', 'Figurino do roupão cinza'],
      narrationText: panels.map(p => p.narrationText).filter(Boolean).join('\n\n'),
      dialogues: panels.flatMap(p => p.dialogues),
      speechAttribution: 'Diálogos claramente associados aos personagens presentes na cena',
      textPlacementPlan: 'Caixas de texto translúcidas integradas no topo ou rodapé dos quadros, sem fundo branco opaco',
      reservedVisualSpace: 'Terço superior de cada painel planejado para narração com contraste e legibilidade ideais',
      validationCriteria: [
        'Continuidade visual da protagonista preservada',
        'Ausência de artefatos ou caracteres deformados na imagem',
        'Texto com alta densidade literária e legibilidade sem fundo branco genérico'
      ],
      
      visualPrompt,
      negativePrompt: 'blurry, distorted face, inconsistent hair, cartoon, anime, 3d render, watermark, extra fingers, text in image, white paper background',
      layoutType: 'multi_panel',
      panels,
      
      isApproved: false,
      validationStatus: 'planejado',
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    return plan;
  }

  /**
   * Renderiza a imagem cinematográfica fotorrealista da página
   */
  static async generatePageVisual(plan: CinematicPagePlan): Promise<string> {
    try {
      const url = await aiService.generateImage(plan.visualPrompt);
      return url;
    } catch (err) {
      console.warn('[CinematicNovelService] Falha na geração da página pelo provedor principal, utilizando fallback FLUX:', err);
      const encoded = encodeURIComponent(plan.visualPrompt.substring(0, 420));
      const seed = Math.floor(Math.random() * 899999 + 100000);
      return `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1536&nologo=true&model=flux&seed=${seed}`;
    }
  }

  /**
   * Exportação Oficial em PDF Full Bleed Colorido de Alta Resolução Diagramado para Impressão KDP
   */
  static async exportPdfFullBleed(project: CinematicNovelProjectData): Promise<Blob> {
    // Dimensão oficial 7x10 polegadas (177.8 x 254 mm) com sangria full-bleed
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [177.8, 254]
    });

    const pageWidth = 177.8;
    const pageHeight = 254;

    for (let i = 0; i < project.pages.length; i++) {
      const page = project.pages[i];
      if (i > 0) doc.addPage([177.8, 254], 'portrait');

      // Fundo cinematográfico escuro e elegante (sem fundo branco genérico!)
      doc.setFillColor(15, 23, 42); // slate-900 profundo
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Se houver imagem da página, desenha em formato full bleed
      if (page.imageUrl) {
        try {
          doc.addImage(page.imageUrl, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
        } catch {
          // fallback visual caso imagem não seja rasterizável
          doc.setFillColor(15, 23, 42);
          doc.rect(0, 0, pageWidth, pageHeight, 'F');
        }
      }

      // Cabeçalho de Capítulo integrado na imagem
      if (page.pageNumber === 1 || page.chapterTitle) {
        doc.setFillColor(15, 23, 42);
        // Caixa de título translúcida/sombra no topo
        doc.rect(10, 10, pageWidth - 20, 22, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('times', 'bold');
        doc.setFontSize(16);
        doc.text(project.title.toUpperCase(), 15, 18);
        doc.setFontSize(11);
        doc.setFont('times', 'italic');
        doc.setTextColor(203, 213, 225);
        doc.text(`${page.chapterTitle || 'Capítulo 1'}`, 15, 26);
      }

      // Renderização das Caixas de Narração e Diálogos Integrados (Estilo Cinematográfico Sem Fundo Branco)
      let currentY = page.pageNumber === 1 ? 38 : 18;
      const marginX = 14;
      const boxWidth = pageWidth - (marginX * 2);

      // Renderiza painéis ou narração
      if (page.panels && page.panels.length > 0) {
        for (const panel of page.panels.slice(0, 3)) {
          if (panel.narrationText) {
            doc.setFillColor(15, 23, 42);
            doc.setDrawColor(71, 85, 105);
            doc.setLineWidth(0.3);
            
            const lines = doc.splitTextToSize(panel.narrationText, boxWidth - 10);
            const boxH = Math.min(38, (lines.length * 4.2) + 8);
            
            if (currentY + boxH < pageHeight - 20) {
              // Caixa translúcida escura com borda sutil
              doc.roundedRect(marginX, currentY, boxWidth, boxH, 2, 2, 'FD');
              doc.setTextColor(248, 250, 252);
              doc.setFont('times', 'normal');
              doc.setFontSize(9.5);
              doc.text(lines.slice(0, 7), marginX + 5, currentY + 6);
              currentY += boxH + 6;
            }
          }

          // Balão de diálogo integrado
          if (panel.dialogues && panel.dialogues.length > 0) {
            const dial = panel.dialogues[0];
            const dLines = doc.splitTextToSize(`"${dial.speechText}"`, boxWidth - 24);
            const dialH = (dLines.length * 4.2) + 8;
            
            if (currentY + dialH < pageHeight - 20) {
              doc.setFillColor(30, 41, 59);
              doc.setDrawColor(148, 163, 184);
              doc.setLineWidth(0.4);
              doc.roundedRect(marginX + 10, currentY, boxWidth - 20, dialH, 3, 3, 'FD');
              doc.setTextColor(226, 232, 240);
              doc.setFont('helvetica', 'italic');
              doc.setFontSize(9);
              doc.text(dLines, marginX + 15, currentY + 5.5);
              currentY += dialH + 8;
            }
          }
        }
      }

      // Rodapé com número de página cinematográfico
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text(`${page.pageNumber}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    }

    return doc.output('blob');
  }
}
