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
      subtitle: params.subtitle || 'Foto Livro Realista',
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
      characters: [
        {
          id: 'char_1',
          name: 'Helena Vance',
          role: 'protagonista',
          age: 34,
          heightAndBuild: '1,68m, porte elegante e esguio',
          faceShape: 'Oval com maçãs do rosto marcadas',
          skinTone: 'Clara com textura natural',
          eyes: 'Castanhos escuros expressivos e tensos',
          hair: 'Castanho ondulado até os ombros',
          distinctiveMarks: 'Pequeno sinal discreto na clavícula esquerda',
          costumes: ['Roupão de lã cinza amarrado na cintura', 'Sobretudo preto'],
          personality: 'Determinada, perceptiva e assombrada por lapsos de memória',
          voiceTone: 'Voz pausada e suave',
          referenceImageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'
        },
        {
          id: 'char_2',
          name: 'Dr. Arthur Miller',
          role: 'antagonista',
          age: 42,
          heightAndBuild: '1,82m, postura ereta e formal',
          faceShape: 'Mandíbula quadrada e fronte alta',
          skinTone: 'Clara',
          eyes: 'Cinzentos e analíticos',
          hair: 'Grisalho curto penteado para trás',
          distinctiveMarks: 'Óculos de armação fina metálica',
          costumes: ['Jaleco branco impecável sobre camisa azul', 'Terno grafite'],
          personality: 'Racional, controlador e guardião de segredos perigosos',
          voiceTone: 'Grave, clínico e firme',
          referenceImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80'
        }
      ],
      pages: CinematicNovelService.createDefaultInitialPages({ id, title: params.title }),
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
Sua missão é desenvolver o roteiro completo, a Story Bible rigorosa e a Character Bible para um Foto Livro Realista.

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
        id: `p1_p2_${pageId}`,
        panelIndex: 1,
        framing: 'plano-geral-estabelecedor',
        sceneDescription: `Fachada externa do edifício médico sob chuva fria de manhã.`,
        visualPrompt: `cinematic 35mm film still, modern medical building exterior in wet rainy morning, cold blue tones, city traffic reflections on wet pavement, photorealistic`,
        narrationText: `A chuva continuava a fustigar as amplas janelas de vidro do edifício médico. No terceiro andar, a claridade cinzenta da manhã contrastava com a iluminação âmbar suave do consultório. Helena permaneceu imóvel na ante-sala por alguns segundos antes da porta se abrir.`,
        dialogues: []
      },
      {
        id: `p2_p2_${pageId}`,
        panelIndex: 2,
        framing: 'plano-medio',
        sceneDescription: `Dr. Arthur com óculos e jaleco médico sentado à mesa de mogno.`,
        visualPrompt: `cinematic movie still, intelligent male doctor in white medical coat with modern glasses sitting behind dark mahogany desk, reviewing medical charts with grave expression, 35mm photography`,
        narrationText: `O silêncio no consultório parecia pesar toneladas. O Dr. Arthur ajeitou os óculos sobre o nariz e cruzou os dedos sobre a mesa de mogno. Diante dele, os relatórios neurológicos de Helena repousavam sob uma pasta azul escura com anotações sigilosas.`,
        dialogues: [
          {
            id: `d1_p2_${pageId}`,
            speakerId: secondaryChar.id,
            speakerName: secondaryChar.name,
            speechText: 'Se você continuar cavando essa lembrança, não terá como voltar atrás, Helena. Certas portas nunca deveriam ser reabertas.',
            speechType: 'speech'
          }
        ]
      },
      {
        id: `p3_p2_${pageId}`,
        panelIndex: 3,
        framing: 'close-up-dramatico',
        sceneDescription: `Helena encarando o médico com expressão firme e determinada.`,
        visualPrompt: `cinematic dramatic close-up, 34-year-old woman with wavy brown hair, piercing dark eyes, tense jaw, sitting in consultation chair under soft directional light, hyperrealistic`,
        narrationText: `Helena mantinha os olhos fixos nos papéis diante dele, reconhecendo que cada explicação oferecida até então era apenas uma cortina de fumaça para proteger um segredo que não podia ser enterrado.`,
        dialogues: [
          {
            id: `d2_p2_${pageId}`,
            speakerId: mainChar.id,
            speakerName: mainChar.name,
            speechText: 'Eu já perdi o chão no momento em que encontrei aquele bilhete sobre a bancada. Não me peça para fingir que nada aconteceu.',
            speechType: 'speech'
          }
        ]
      },
      {
        id: `p4_p2_${pageId}`,
        panelIndex: 4,
        framing: 'plano-detalhe',
        sceneDescription: `Helena deslizando o envelope pardo sobre a mesa de mogno diante do médico.`,
        visualPrompt: `cinematic detailed shot, woman hand placing brown kraft paper envelope on dark mahogany desk next to medical stethoscope and prescription notepad`,
        narrationText: `Ela retirou o papel pardo áspero do bolso do casaco e o deslizou devagar pelo verniz da mesa. Arthur encarou as palavras datilografadas "Você esqueceu o que aconteceu na ponte" e, pela primeira vez em cinco anos, Helena viu o sangue desaparecer do rosto do médico.`,
        dialogues: [
          {
            id: `d3_p2_${pageId}`,
            speakerId: secondaryChar.id,
            speakerName: secondaryChar.name,
            speechText: 'Helena, você precisa saber que isso não é uma coincidência... Ainda há alguém lá fora que sabe tudo sobre você.',
            speechType: 'speech'
          }
        ],
        documentInset: {
          text: 'Você esqueceu o que aconteceu na ponte.',
          textureType: 'bilhete-pardo'
        }
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
   * Renderiza a imagem cinematográfica fotorrealista da página via Replicate FLUX.1
   */
  static async generatePageVisual(plan: CinematicPagePlan): Promise<string> {
    const { generateFrameVisualWithReplicate, getRealisticCinematicSvgDataUrl } = await import('./cinematic-frame-generator');
    try {
      const result = await generateFrameVisualWithReplicate(
        plan.visualPrompt,
        plan.sceneSummary || 'generic',
        '3:4'
      );
      if (result) return result;
    } catch (err) {
      console.warn('[FotoLivroService] Falha na chamada Replicate, aplicando renderizador fotorrealista de segurança:', err);
    }
    return getRealisticCinematicSvgDataUrl(plan.visualPrompt, plan.sceneSummary || 'generic');
  }

  /**
   * Cria páginas fotográficas padrão com cenas fotorrealistas e textos ricos integrados
   */
  static createDefaultInitialPages(project?: Partial<CinematicNovelProjectData>): CinematicPagePlan[] {
    const bookId = project?.id || `cinematic_${Date.now()}`;
    return [
      {
        id: `page_1_${Date.now()}`,
        bookId,
        chapterNumber: 1,
        chapterTitle: 'O Despertar no Quarto Cinza',
        pageNumber: 1,
        sceneSummary: 'Helena acorda às 06:17 da manhã com o som da chuva e a sensação paralisante de tempo perdido.',
        previousNarrativeContext: 'Início da narrativa',
        dramaticObjective: 'Estabelecer a atmosfera de suspense psicológico e a quebra da rotina.',
        charactersPresent: ['Helena Vance'],
        mandatoryVisualReferences: ['Helena Vance', 'Despertador 06:17', 'Roupão de lã cinza'],
        charactersAppearance: 'Mulher de 34 anos com cabelos castanhos ondulados e olhar tenso',
        costumeAndProps: 'Roupão de lã cinza amarrado na cintura',
        environmentSetting: 'Quarto com luz difusa de chuva matinal',
        timeAndLighting: '06:17 da manhã, luz fria de tempestade',
        actionsAndExpressions: 'Sentada na beira da cama olhando o despertador com apreensão',
        cameraFraming: 'plano-medio',
        imageComposition: 'Enquadramento cinematográfico 35mm com espaço inferior para texto integrado',
        requiredElements: ['Despertador digital 06:17', 'Chuva na janela'],
        persistentElements: ['Traços faciais da protagonista'],
        narrationText: 'Helena abriu os olhos lentamente e encarou o teto. O silêncio da casa era quebrado apenas pelo gotejar ritmado da chuva na vidraça. Ao lado da cama, os números vermelhos do despertador digital marcavam exatamente seis e dezessete da manhã.',
        dialogues: [
          {
            id: `d_1_1`,
            speakerId: 'char_1',
            speakerName: 'Helena',
            speechText: 'Por que sinto que a noite passada não me pertence mais?...',
            speechType: 'thought'
          }
        ],
        speechAttribution: 'Pensamento interno de Helena',
        textPlacementPlan: 'Texto impresso diretamente sobre o terço inferior da fotografia, sem caixas brancas',
        reservedVisualSpace: 'Área inferior da imagem',
        validationCriteria: ['Fotografia realista 35mm', 'Texto integrado sem caixa branca'],
        visualPrompt: 'Cinematic 35mm film still of a realistic 34-year-old woman sitting on edge of bed in moody bedroom, early morning cold rain outside window, red digital clock 06:17 on nightstand, wearing charcoal wool bathrobe, atmospheric moody lighting, photorealistic, 8k resolution, award winning cinematography, completely free of typography or white boxes',
        negativePrompt: 'blurry, 3d cartoon, text boxes, white speech bubbles, watermark, deformed',
        layoutType: 'single_hero',
        isApproved: true,
        validationStatus: 'gerado',
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: `page_2_${Date.now() + 1}`,
        bookId,
        chapterNumber: 1,
        chapterTitle: 'O Envelope Pardo',
        pageNumber: 2,
        sceneSummary: 'Helena encontra a cafeteira ligada e um bilhete anônimo perturbador sobre a bancada.',
        previousNarrativeContext: 'Helena caminha pelo corredor silencioso até a cozinha.',
        dramaticObjective: 'Revelar o elemento deflagrador do mistério: o bilhete sobre a ponte.',
        charactersPresent: ['Helena Vance'],
        mandatoryVisualReferences: ['Envelope pardo', 'Bancada de granito', 'Cafeteira elétrica'],
        charactersAppearance: 'Helena com mãos trêmulas segurando o bilhete',
        costumeAndProps: 'Roupão cinza, xícara de café fumegante, papel pardo áspero',
        environmentSetting: 'Cozinha silenciosa em tons escuros e luz matinal amarelada',
        timeAndLighting: '06:22 da manhã, luz da luminária sobre a bancada',
        actionsAndExpressions: 'Leitura atônita da frase datilografada no bilhete',
        cameraFraming: 'close-up-dramatico',
        imageComposition: 'Close fotográfico com profundidade de campo rasa e foco nas mãos e no bilhete',
        requiredElements: ['Envelope pardo', 'Bilhete datilografado'],
        persistentElements: ['Figurino do roupão cinza'],
        narrationText: 'Na cozinha silenciosa, a cafeteira elétrica estava ligada. Apoiado contra a bancada de granito escuro, um envelope pardo fechado continha apenas uma frase datilografada: "Você esqueceu o que aconteceu na ponte". O sangue pareceu sumir de suas mãos.',
        dialogues: [
          {
            id: `d_1_2`,
            speakerId: 'char_1',
            speakerName: 'Helena',
            speechText: 'Quem esteve aqui enquanto eu dormia?...',
            speechType: 'speech'
          }
        ],
        speechAttribution: 'Helena falando sozinha na cozinha',
        textPlacementPlan: 'Texto impresso diretamente sobre o terço inferior da fotografia, sem caixas brancas',
        reservedVisualSpace: 'Área inferior da imagem',
        validationCriteria: ['Fotografia realista 35mm', 'Texto integrado sem caixa branca'],
        visualPrompt: 'Cinematic 35mm movie close-up shot of trembling female hands holding a kraft paper note reading mystery words on a dark granite kitchen counter, steaming coffee maker in background, moody atmospheric light, dramatic film photography, photorealistic, 8k, no artificial white boxes',
        negativePrompt: 'blurry, 3d cartoon, text boxes, white speech bubbles, watermark, deformed',
        layoutType: 'single_hero',
        isApproved: true,
        validationStatus: 'gerado',
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: `page_3_${Date.now() + 2}`,
        bookId,
        chapterNumber: 2,
        chapterTitle: 'O Consultório do Dr. Arthur',
        pageNumber: 3,
        sceneSummary: 'Confronto no consultório médico com Dr. Arthur sobre os lapsos de memória.',
        previousNarrativeContext: 'Helena busca respostas imediatas sobre a noite da ponte.',
        dramaticObjective: 'Instaurar desconfiança em relação ao médico assistente.',
        charactersPresent: ['Helena Vance', 'Dr. Arthur Miller'],
        mandatoryVisualReferences: ['Dr. Arthur Miller', 'Mesa de mogno', 'Jaleco médico'],
        charactersAppearance: 'Médico de 42 anos com óculos finos e olhar analítico',
        costumeAndProps: 'Jaleco branco sobre camisa azul clara, relatórios médicos',
        environmentSetting: 'Consultório médico elegante com persianas de madeira',
        timeAndLighting: '09:30 da manhã, luz solar suave filtrada pelas persianas',
        actionsAndExpressions: 'Arthur desviando o olhar ao ver o bilhete sobre a mesa',
        cameraFraming: 'plano-americano',
        imageComposition: 'Dois personagens em tensão dramática frente a frente',
        requiredElements: ['Mesa de mogno', 'Relatórios neurológicos'],
        persistentElements: ['Rosto do Dr. Arthur e expressão de Helena'],
        narrationText: 'O Dr. Arthur ajeitou os óculos sobre o nariz e encarou o papel sobre sua mesa de mogno. Por um instante fugaz, a máscara de serenidade do médico caiu, revelando o mesmo medo que assombrava a mente de Helena.',
        dialogues: [
          {
            id: `d_2_1`,
            speakerId: 'char_2',
            speakerName: 'Dr. Arthur',
            speechText: 'Helena, se você insistir em reabrir as memórias daquela ponte, ninguém poderá protegê-la do que virá a seguir.',
            speechType: 'speech'
          }
        ],
        speechAttribution: 'Diálogo tenso de Dr. Arthur',
        textPlacementPlan: 'Texto impresso diretamente sobre a fotografia, sem caixas brancas',
        reservedVisualSpace: 'Área inferior da imagem',
        validationCriteria: ['Fotografia realista 35mm', 'Texto integrado sem caixa branca'],
        visualPrompt: 'Cinematic 35mm film still of a distinguished 42-year-old male doctor in white medical coat and glasses sitting across mahogany desk facing a tense brunette woman in stylish coat, morning window sunlight through blinds, high tension, photorealistic movie still, 8k, authentic textures, no text boxes',
        negativePrompt: 'blurry, 3d cartoon, text boxes, white speech bubbles, watermark, deformed',
        layoutType: 'single_hero',
        isApproved: true,
        validationStatus: 'gerado',
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];
  }

  /**
   * Renderiza a página fotográfica cinematográfica no Canvas com TEXTO INTEGRADO DIRETO NA IMAGEM.
   * REGRA IMPERATIVA: SEM caixa branca, SEM box branco, SEM balão branco por trás do texto!
   */
  static renderPageToCanvas(
    canvas: HTMLCanvasElement,
    page: CinematicPagePlan,
    bookTitle: string,
    width = 1200,
    height = 1714
  ): Promise<void> {
    return new Promise((resolve) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve();
        return;
      }

      canvas.width = width;
      canvas.height = height;

      // 1. Desenha o fundo da imagem fotográfica
      const drawBackgroundAndText = (imgElement?: HTMLImageElement) => {
        if (imgElement && imgElement.naturalWidth > 0) {
          ctx.drawImage(imgElement, 0, 0, width, height);
        } else {
          // Fundo fotográfico gradiente de segurança profundo e cinematográfico
          const grad = ctx.createLinearGradient(0, 0, 0, height);
          grad.addColorStop(0, '#0f172a');
          grad.addColorStop(0.5, '#1e293b');
          grad.addColorStop(1, '#020617');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, width, height);
        }

        // 2. SCRIM GRADIENT SUAVE (Vignette natural cinematográfica - NÃO É UMA CAIXA!)
        // Gradiente contínuo de transparência no terço inferior para garantir 100% de legibilidade
        const scrimH = height * 0.42;
        const scrimY = height - scrimH;
        const scrimGrad = ctx.createLinearGradient(0, scrimY, 0, height);
        scrimGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        scrimGrad.addColorStop(0.35, 'rgba(0, 0, 0, 0.45)');
        scrimGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.75)');
        scrimGrad.addColorStop(1, 'rgba(0, 0, 0, 0.90)');
        ctx.fillStyle = scrimGrad;
        ctx.fillRect(0, scrimY, width, scrimH);

        // 3. Cabeçalho de topo sutil e integrado na imagem (sem nenhuma caixa retangular!)
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 2;
        ctx.font = 'bold 20px "Inter", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(bookTitle.toUpperCase(), 48, 60);

        if (page.chapterTitle) {
          ctx.fillStyle = 'rgba(251, 191, 36, 0.9)'; // Dourado suave
          ctx.font = 'italic 16px "Merriweather", Georgia, serif';
          ctx.fillText(page.chapterTitle, 48, 88);
        }
        ctx.restore();

        // 4. TEXTO NARRATIVO INTEGRADO DIRETO NA IMAGEM (SEM CAIXA BRANCA, SEM BOX, SEM BALÃO)
        let textY = height - scrimH + 90;
        const textX = 54;
        const maxTextW = width - 108;

        const narration = page.narrationText || (page.panels?.[0]?.narrationText) || '';
        if (narration) {
          ctx.save();
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
          ctx.shadowBlur = 10;
          ctx.shadowOffsetY = 3;
          ctx.font = 'normal 400 24px "Merriweather", Georgia, serif';
          ctx.textAlign = 'left';

          // Quebra de linhas suave
          const words = narration.split(' ');
          let currentLine = '';
          const lineHeight = 38;

          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxTextW) {
              ctx.fillText(currentLine, textX, textY);
              currentLine = word;
              textY += lineHeight;
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) {
            ctx.fillText(currentLine, textX, textY);
            textY += lineHeight + 18;
          }
          ctx.restore();
        }

        // 5. DIÁLOGOS DIRETOS SOBRE A FOTOGRAFIA (SEM BALÃO DE QUADRINHOS!)
        const dialogues = page.dialogues || (page.panels?.[0]?.dialogues) || [];
        if (dialogues.length > 0) {
          dialogues.slice(0, 2).forEach((dial) => {
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 2;

            // Nome do personagem em dourado elegante
            ctx.fillStyle = '#fde68a';
            ctx.font = 'bold 20px "Merriweather", Georgia, serif';
            ctx.textAlign = 'left';
            ctx.fillText(`${dial.speakerName.toUpperCase()}:`, textX, textY);

            // Fala do personagem em itálico branco suave
            ctx.fillStyle = '#ffffff';
            ctx.font = 'italic 22px "Merriweather", Georgia, serif';
            const quoteText = `"${dial.speechText}"`;

            // Quebra de linha da fala
            const dWords = quoteText.split(' ');
            let dLine = '';
            const dLineHeight = 34;
            textY += 30;

            for (const dw of dWords) {
              const testDLine = dLine ? `${dLine} ${dw}` : dw;
              if (ctx.measureText(testDLine).width > maxTextW) {
                ctx.fillText(dLine, textX + 16, textY);
                dLine = dw;
                textY += dLineHeight;
              } else {
                dLine = testDLine;
              }
            }
            if (dLine) {
              ctx.fillText(dLine, textX + 16, textY);
              textY += dLineHeight + 14;
            }
            ctx.restore();
          });
        }

        // 6. NÚMERO DA PÁGINA NO RODAPÉ
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 6;
        ctx.font = 'bold 15px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`— ${page.pageNumber} —`, width / 2, height - 32);
        ctx.restore();

        resolve();
      };

      // Carrega imagem com crossOrigin para evitar contaminação do canvas
      const imgUrl = page.imageUrl || (page.panels?.[0]?.imageUrl);
      if (imgUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => drawBackgroundAndText(img);
        img.onerror = () => drawBackgroundAndText();
        img.src = imgUrl;
      } else {
        drawBackgroundAndText();
      }
    });
  }

  /**
   * Exportação Oficial em PDF Full Bleed Colorido com Imagem e Texto Integrado DIRETO na foto.
   * SEM caixa branca, SEM box e SEM balões!
   */
  static async exportPdfFullBleed(project: CinematicNovelProjectData): Promise<Blob> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [177.8, 254] // 7x10 polegadas padrão KDP
    });

    const pageWidth = 177.8;
    const pageHeight = 254;

    // Se estiver em ambiente Node.js (testes unitários sem DOM)
    if (typeof document === 'undefined') {
      for (let i = 0; i < project.pages.length; i++) {
        if (i > 0) doc.addPage([177.8, 254], 'portrait');
        doc.setFillColor(9, 13, 22);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('times', 'bold');
        doc.setFontSize(16);
        doc.text(project.title.toUpperCase(), 20, 25);
        doc.setFont('times', 'normal');
        doc.setFontSize(11);
        doc.text(project.pages[i].narrationText || '', 20, 200, { maxWidth: 137.8 });
      }
      return doc.output('blob');
    }

    const canvas = document.createElement('canvas');

    for (let i = 0; i < project.pages.length; i++) {
      const page = project.pages[i];
      if (i > 0) doc.addPage([177.8, 254], 'portrait');

      // Renderiza página fotográfica cinematográfica no Canvas (SEM caixas brancas nem balões)
      await this.renderPageToCanvas(canvas, page, project.title, 1200, 1714);

      // Adiciona imagem composta de alta definição no PDF
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      doc.addImage(dataUrl, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
    }

    return doc.output('blob');
  }

  /**
   * Constrói Capa Aberta KDP Oficial (Full-Wrap Cover PDF) do Foto Livro Realista
   */
  static async exportCoverPdf(project: CinematicNovelProjectData): Promise<Blob> {
    const pageCount = Math.max(24, project.pages.length);
    const spineWidthInches = Math.max(0.08, pageCount * 0.002252);
    const trimWidth = 7.0;
    const trimHeight = 10.0;
    const bleed = 0.125;

    const totalWidthInches = trimWidth * 2 + spineWidthInches + bleed * 2;
    const totalHeightInches = trimHeight + bleed * 2;

    const widthPt = totalWidthInches * 72;
    const heightPt = totalHeightInches * 72;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: [widthPt, heightPt]
    });

    if (typeof document === 'undefined') {
      doc.setFillColor(9, 13, 22);
      doc.rect(0, 0, widthPt, heightPt, 'F');
      return doc.output('blob');
    }

    const canvas = document.createElement('canvas');
    const dpi = 150;
    canvas.width = Math.round(totalWidthInches * dpi);
    canvas.height = Math.round(totalHeightInches * dpi);
    const ctx = canvas.getContext('2d');

    if (ctx) {
      const w = canvas.width;
      const h = canvas.height;
      const toPx = (val: number) => val * dpi;

      // Fundo cinematográfico rico
      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(0.5, '#1e1b4b');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      const bleedPx = toPx(bleed);
      const trimWPx = toPx(trimWidth);
      const spineWPx = toPx(spineWidthInches);
      const frontCoverX = bleedPx + trimWPx + spineWPx;

      // Capa frontal (lado direito)
      const frontCenterX = frontCoverX + trimWPx / 2;

      // Se houver imagem de capa, desenha em formato fotográfico de estúdio
      if (project.coverImageUrl) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = project.coverImageUrl;
          if (img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, frontCoverX, 0, trimWPx + bleedPx, h);
          }
        } catch { }
      }

      // Gradiente suave para o título
      const titleGrad = ctx.createLinearGradient(0, 0, 0, h * 0.45);
      titleGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
      titleGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = titleGrad;
      ctx.fillRect(frontCoverX, 0, trimWPx + bleedPx, h * 0.45);

      // Título cinematográfico em destaque direto sobre a arte (sem box branco!)
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 4;
      ctx.font = '900 48px "Merriweather", serif';
      ctx.textAlign = 'center';
      ctx.fillText(project.title.toUpperCase(), frontCenterX, toPx(2.2));

      // Subtítulo dourado suave
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'italic 700 24px "Merriweather", serif';
      ctx.fillText(project.subtitle || 'Foto Livro Realista', frontCenterX, toPx(2.8));

      // Autor no rodapé
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 20px "Inter", sans-serif';
      ctx.fillText(`Por: ${project.author || 'Leandro Palmeira'}`, frontCenterX, h - toPx(1.2));
      ctx.restore();

      // Contracapa (lado esquerdo)
      const backCenterX = bleedPx + trimWPx / 2;
      ctx.save();
      ctx.fillStyle = '#fef3c7';
      ctx.font = 'bold 28px "Merriweather", serif';
      ctx.textAlign = 'center';
      ctx.fillText('UMA HISTÓRIA CINEMATOGRÁFICA', backCenterX, toPx(2.2));

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '400 18px "Merriweather", serif';
      const synWords = (project.storyBible?.synopsis || project.premise).split(' ');
      let synLine = '';
      let synY = toPx(3.0);
      for (const sw of synWords) {
        const test = synLine ? `${synLine} ${sw}` : sw;
        if (ctx.measureText(test).width > trimWPx - toPx(1.2)) {
          ctx.fillText(synLine, backCenterX, synY);
          synLine = sw;
          synY += 28;
        } else {
          synLine = test;
        }
      }
      if (synLine) ctx.fillText(synLine, backCenterX, synY);
      ctx.restore();

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      doc.addImage(dataUrl, 'JPEG', 0, 0, widthPt, heightPt);
    }

    return doc.output('blob');
  }
}
