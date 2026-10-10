// ================================================================
// SERVIÇO DE PLANEJAMENTO PEDAGÓGICO E ESCRITA DIDÁTICA DE CURSOS
// BookEngin — Transforma Temas em Cursos Práticos com Módulos e Aulas
// ================================================================

import { 
  CoursePedagogicalPlan, 
  CourseModule, 
  CourseLesson, 
  CourseDifficultyLevel, 
  CourseImageProfile,
  CourseStepInstruction,
  HotmartMarketReference
} from '../types/course-ebook';
import { chamarGeminiTexto } from './kdp-ai-engine';

export interface CoursePlanConfig {
  themeTitle: string;
  category: string;
  targetAudience: string;
  difficultyLevel: CourseDifficultyLevel;
  primarySkill: string;
  learningObjective: string;
  prerequisites?: string;
  modulesCount: number;
  lessonsPerModule?: number;
  language?: string;
  toneStyle?: string;
  imageProfile: CourseImageProfile;
  marketReferences?: HotmartMarketReference[];
}

export class CoursePedagogicalService {
  /**
   * Estima o número de imagens e custo aproximado da API Replicate (FLUX.1 Schnell)
   */
  static estimateImagesAndCost(
    modulesCount: number,
    lessonsPerModule: number = 3,
    profile: CourseImageProfile = 'equilibrado'
  ): { totalImages: number; estimatedCostUsd: number; perLessonImages: number } {
    const totalLessons = modulesCount * lessonsPerModule;
    let perLessonImages = 1;

    if (profile === 'economico') {
      perLessonImages = 1; // Capa + 1 imagem chave por aula
    } else if (profile === 'equilibrado') {
      perLessonImages = 2; // Capa + 2 imagens passo a passo por aula
    } else if (profile === 'ilustrado') {
      perLessonImages = 3; // Capa + 3 imagens detalhadas de etapas por aula
    }

    const totalImages = 1 + (totalLessons * perLessonImages); // 1 capa + imagens de aula
    // Custo oficial médio FLUX.1 Schnell no Replicate (~$0.003 por predição de 4 steps)
    const estimatedCostUsd = Number((totalImages * 0.0035).toFixed(3));

    return { totalImages, estimatedCostUsd, perLessonImages };
  }

  /**
   * Agente de Planejamento Pedagógico: Gera a grade curricular antes de escrever
   */
  static async planPedagogicalCurriculum(config: CoursePlanConfig): Promise<CoursePedagogicalPlan> {
    const modulesCount = Math.max(3, Math.min(config.modulesCount || 4, 8));
    const lessonsPerModule = Math.max(2, Math.min(config.lessonsPerModule || 3, 4));

    const prompt = `Você é um coordenador pedagógico sênior de cursos profissionalizantes e educação técnica prática.
Desenvolva a grade curricular completa e estruturada para este curso profissional:

TÍTULO: ${config.themeTitle}
CATEGORIA: ${config.category}
PÚBLICO-ALVO: ${config.targetAudience}
NÍVEL: ${config.difficultyLevel}
HABILIDADE CENTRAL: ${config.primarySkill || config.themeTitle}
OBJETIVO DE APRENDIZAGEM: ${config.learningObjective}
PRÉ-REQUISITOS: ${config.prerequisites || 'Nenhum conhecimento prévio exigido'}
MÓDULOS OBRIGATÓRIOS: exatamente ${modulesCount} módulos, com ${lessonsPerModule} aulas em cada módulo.

Retorne EXCLUSIVAMENTE um objeto JSON válido (sem texto adicional, sem blocos explicativos fora do JSON) com esta estrutura exata:
{
  "courseTitle": "...",
  "courseSubtitle": "...",
  "themeCategory": "${config.category}",
  "targetAudience": "${config.targetAudience}",
  "difficultyLevel": "${config.difficultyLevel}",
  "primarySkill": "...",
  "learningObjective": "...",
  "prerequisites": "...",
  "language": "Português",
  "toneStyle": "Didático, prático, encorajador e profissional",
  "requiredToolsAndMaterials": ["ferramenta 1", "ferramenta 2", "material 1", ...],
  "modules": [
    {
      "id": "mod_1",
      "moduleNumber": 1,
      "title": "...",
      "objective": "...",
      "lessons": [
        {
          "id": "les_1_1",
          "lessonNumber": 1,
          "title": "...",
          "objective": "...",
          "requiredMaterials": ["..."]
        }
      ]
    }
  ],
  "practicalProjects": ["Projeto final 1", "Projeto 2"],
  "checklists": [
    {
      "title": "Checklist de Segurança e Preparação",
      "items": ["Item 1", "Item 2", "Item 3"]
    }
  ],
  "assessmentMethods": ["Avaliação prática de execução", "Critérios de inspeção visual"],
  "glossary": [
    {"term": "Termo Técnico 1", "definition": "Definição prática"}
  ],
  "conclusion": "Resumo das conquistas do aluno e consolidação da habilidade.",
  "nextSteps": "Orientações para continuar praticando e monetizar a habilidade.",
  "references": ["Manuais técnicos", "Normas ABNT aplicáveis", "Boas práticas profissionais"]
}`;

    try {
      const response = await chamarGeminiTexto(prompt, {
        temperature: 0.4,
        maxTokens: 5000,
        systemInstruction: 'Você é um arquiteto pedagógico técnico. Gere planos de ensino reais e práticos em JSON estrito.'
      });

      const parsed = this.cleanAndParseJson<CoursePedagogicalPlan>(response.texto);
      if (parsed && Array.isArray(parsed.modules) && parsed.modules.length > 0) {
        return this.normalizePedagogicalPlan(parsed, config);
      }
    } catch (err) {
      console.warn('[CoursePedagogicalService] Modelo IA oscilou, acionando Auto-Recuperação do Plano:', err);
    }

    // Fallback estruturado de alta fidelidade
    return this.buildFallbackPlan(config, modulesCount, lessonsPerModule);
  }

  /**
   * Agente de Escrita Didática: Redige uma aula específica com profundidade prática e contextualização
   */
  static async writeDidacticLesson(params: {
    courseTitle: string;
    category: string;
    difficultyLevel: string;
    moduleNumber: number;
    moduleTitle: string;
    lessonNumber: number;
    lessonTitle: string;
    lessonObjective: string;
    previousLessonSummary?: string;
  }): Promise<CourseLesson> {
    const prompt = `Você é um instrutor técnico e mestre de ofício profissional com vasta experiência prática em ${params.category}.
Redija o conteúdo didático INTEGRAL e detalhado desta aula prática:

CURSO: ${params.courseTitle}
MÓDULO ${params.moduleNumber}: ${params.moduleTitle}
AULA ${params.lessonNumber}: ${params.lessonTitle}
OBJETIVO DA AULA: ${params.lessonObjective}
NÍVEL: ${params.difficultyLevel}
${params.previousLessonSummary ? `CONTEXTO DA AULA ANTERIOR: ${params.previousLessonSummary}` : ''}

A aula DEVE ser prática e progressiva para ensinar a executar fisicamente a tarefa.
Não seja genérico ou raso. Forneça medidas, posições de ferramentas, precauções e explicações claras.

Retorne EXCLUSIVAMENTE um objeto JSON válido com esta estrutura exata:
{
  "id": "les_${params.moduleNumber}_${params.lessonNumber}_${Date.now()}",
  "lessonNumber": ${params.lessonNumber},
  "title": "${params.lessonTitle}",
  "objective": "${params.lessonObjective}",
  "introduction": "2 parágrafos conectando a importância desta aula ao dia a dia profissional.",
  "didacticExplanation": "3 a 4 parágrafos explicando os princípios técnicos essenciais com clareza.",
  "requiredMaterials": ["item 1 com especificação", "item 2", "ferramenta necessária"],
  "stepByStepInstructions": [
    {
      "stepNumber": 1,
      "title": "Preparação e Medição",
      "instruction": "Instrução exata de como posicionar, segurar e executar a ação...",
      "technicalNote": "Dica de precisão ou ajuste milimétrico",
      "safetyCaution": "Aviso de segurança ou uso de EPI específico"
    },
    {
      "stepNumber": 2,
      "title": "Execução Principal",
      "instruction": "Instrução sequencial detalhada...",
      "technicalNote": "Dica técnica importante",
      "safetyCaution": "Aviso de cuidado"
    },
    {
      "stepNumber": 3,
      "title": "Verificação e Acabamento",
      "instruction": "Como conferir o alinhamento ou resultado...",
      "technicalNote": "Critério de inspeção",
      "safetyCaution": "Descarte seguro de resíduos"
    }
  ],
  "practicalExamples": [
    "Exemplo de aplicação em um caso real do mercado",
    "Exemplo de adaptação para quando não se tem uma ferramenta de bancada"
  ],
  "commonMistakes": [
    "Erro frequente cometido por iniciantes e como evitar",
    "Segundo erro comum e como corrigir se já tiver acontecido"
  ],
  "practicalTips": [
    "Segredo de profissional para acelerar o processo sem perder qualidade",
    "Dica para economizar material ou obter acabamento mais limpo"
  ],
  "safetyPrecautions": [
    "Equipamento de Proteção Individual (EPI) indispensável",
    "Cuidado postural ou físico durante a execução"
  ],
  "summary": "Resumo em 3 pontos-chave do aprendizado consolidado.",
  "exercise": {
    "title": "Atividade Prática de Fixação",
    "description": "Exercício passo a passo para o aluno executar imediatamente na sua bancada/espaço.",
    "expectedOutcome": "Descrição do resultado físico ou operacional esperado ao concluir."
  },
  "completionCriteria": [
    "Critério 1 atendido",
    "Critério 2 verificado com instrumento de medição/teste",
    "Acabamento limpo e seguro sem rebarbas ou falhas"
  ]
}`;

    try {
      const response = await chamarGeminiTexto(prompt, {
        temperature: 0.35,
        maxTokens: 4096,
        systemInstruction: 'Você é um redator técnico de manuais profissionais. Escreva aulas substanciais e detalhadas em JSON estrito.'
      });

      const parsed = this.cleanAndParseJson<CourseLesson>(response.texto);
      if (parsed && parsed.title && Array.isArray(parsed.stepByStepInstructions) && parsed.stepByStepInstructions.length > 0) {
        parsed.images = [];
        return parsed;
      }
    } catch (err) {
      console.warn(`[CoursePedagogicalService] Oscilação na redação da aula ${params.lessonNumber}, gerando aula estruturada de resiliência:`, err);
    }

    return this.buildFallbackLesson(params);
  }

  // --- HELPERS E AUTO-RECUPERAÇÃO ---

  private static cleanAndParseJson<T>(rawText: string): T | null {
    try {
      const clean = rawText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      return JSON.parse(clean) as T;
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]) as T;
        } catch {}
      }
      return null;
    }
  }

  private static normalizePedagogicalPlan(plan: CoursePedagogicalPlan, config: CoursePlanConfig): CoursePedagogicalPlan {
    return {
      courseTitle: plan.courseTitle || config.themeTitle,
      courseSubtitle: plan.courseSubtitle || `Manual Prático e Formação Didática Passo a Passo`,
      themeCategory: plan.themeCategory || config.category,
      targetAudience: plan.targetAudience || config.targetAudience,
      difficultyLevel: plan.difficultyLevel || config.difficultyLevel,
      primarySkill: plan.primarySkill || config.primarySkill || config.themeTitle,
      learningObjective: plan.learningObjective || config.learningObjective,
      prerequisites: plan.prerequisites || config.prerequisites || 'Nenhum pré-requisito necessário',
      language: plan.language || config.language || 'Português',
      toneStyle: plan.toneStyle || config.toneStyle || 'Didático e profissional',
      requiredToolsAndMaterials: plan.requiredToolsAndMaterials || ['Ferramentas manuais básicas', 'Equipamentos de proteção individual (EPI)', 'Insumos do projeto'],
      modules: (plan.modules || []).map((m, mIdx) => ({
        id: m.id || `mod_${mIdx + 1}`,
        moduleNumber: m.moduleNumber || mIdx + 1,
        title: m.title || `Módulo ${mIdx + 1}: Fundamentos e Prática`,
        objective: m.objective || `Dominar as técnicas aplicadas deste módulo`,
        lessons: (m.lessons || []).map((l, lIdx) => ({
          id: l.id || `les_${mIdx + 1}_${lIdx + 1}`,
          lessonNumber: l.lessonNumber || lIdx + 1,
          title: l.title || `Aula ${lIdx + 1}: Técnicas Práticas`,
          objective: l.objective || `Executar com precisão os procedimentos propostos`,
          introduction: l.introduction || '',
          didacticExplanation: l.didacticExplanation || '',
          requiredMaterials: l.requiredMaterials || [],
          stepByStepInstructions: l.stepByStepInstructions || [],
          images: [],
          practicalExamples: l.practicalExamples || [],
          commonMistakes: l.commonMistakes || [],
          practicalTips: l.practicalTips || [],
          safetyPrecautions: l.safetyPrecautions || [],
          summary: l.summary || '',
          exercise: l.exercise || {
            title: 'Exercício Prático',
            description: 'Execute as etapas apresentadas e documente as observações.',
            expectedOutcome: 'Peça ou procedimento finalizado com precisão.'
          },
          completionCriteria: l.completionCriteria || ['Execução sem falhas', 'Conformidade com as orientações técnicas']
        }))
      })),
      practicalProjects: plan.practicalProjects || ['Projeto Prático Integrador'],
      checklists: plan.checklists || [{ title: 'Checklist de Qualidade e Segurança', items: ['Inspeção de ferramentas', 'Uso de EPIs', 'Verificação final'] }],
      assessmentMethods: plan.assessmentMethods || ['Inspeção visual', 'Teste de funcionamento'],
      glossary: plan.glossary || [{ term: 'Precisão Técnica', definition: 'Conformidade milimétrica com as especificações do projeto.' }],
      conclusion: plan.conclusion || 'Parabéns pela conclusão do curso! Você dominou as habilidades fundamentais e está apto a aplicar no mercado.',
      nextSteps: plan.nextSteps || 'Pratique os exercícios com projetos próprios e divulgue seus trabalhos para clientes em potencial.',
      references: plan.references || ['Normas técnicas aplicáveis', 'Manuais de boas práticas do ofício']
    };
  }

  private static buildFallbackPlan(config: CoursePlanConfig, modulesCount: number, lessonsPerModule: number): CoursePedagogicalPlan {
    const modules: CourseModule[] = [];

    const moduleThemes = [
      { t: 'Fundamentos, Equipamentos e Segurança Operacional', obj: 'Apresentar a base técnica, seleção de ferramentas e normas preventivas' },
      { t: 'Técnicas Essenciais e Preparação dos Materiais', obj: 'Ensinar as etapas preliminares de medição, corte e manuseio correto' },
      { t: 'Procedimentos Práticos Passo a Passo', obj: 'Executar o núcleo da habilidade prática com instruções detalhadas' },
      { t: 'Acabamento, Qualidade e Resolução de Falhas', obj: 'Aperfeiçoar os detalhes finais, tolerâncias e ajustes finos' },
      { t: 'Projeto Completo e Aplicação Profissional', obj: 'Integrar todo o aprendizado em uma entrega de nível comercial' },
      { t: 'Precificação, Atendimento e Comercialização', obj: 'Orientar o aluno sobre como precificar e atender clientes com lucro' }
    ];

    for (let m = 0; m < modulesCount; m++) {
      const theme = moduleThemes[m % moduleThemes.length];
      const lessons: CourseLesson[] = [];

      for (let l = 0; l < lessonsPerModule; l++) {
        lessons.push({
          id: `les_${m + 1}_${l + 1}_${Date.now()}`,
          lessonNumber: l + 1,
          title: `Aula ${l + 1}: ${theme.t.split(' e ')[0]} - Parte ${l + 1}`,
          objective: `Compreender e aplicar as etapas de ${theme.t.toLowerCase()} de forma segura e autônoma.`,
          introduction: `Nesta aula, abordaremos os conceitos e ações necessárias para consolidar sua habilidade em ${config.themeTitle}. A precisão na execução faz toda a diferença no resultado final.`,
          didacticExplanation: `O método ensinado aqui baseia-se em princípios validados pelo mercado profissional. Cada procedimento foi testado para reduzir o desperdício e maximizar a durabilidade do trabalho.`,
          requiredMaterials: ['Ferramentas manuais apropriadas', 'Equipamentos de Proteção Individual (EPI)', 'Materiais básicos do projeto'],
          stepByStepInstructions: [
            {
              stepNumber: 1,
              title: 'Inspeção e Preparação da Área',
              instruction: 'Organize sua bancada ou espaço de trabalho, deixando apenas as ferramentas necessárias à vista.',
              technicalNote: 'Mantenha a iluminação focada na área de operação.',
              safetyCaution: 'Utilize óculos de proteção e calçados fechados antiderrapantes.'
            },
            {
              stepNumber: 2,
              title: 'Medição e Marcação com Referência',
              instruction: 'Meça duas vezes antes de iniciar qualquer corte ou aplicação física do material.',
              technicalNote: 'Use esquadro metálico para garantir ângulos exatos de 90 graus.',
              safetyCaution: 'Cuidado com pontas afiadas e ferramentas de corte durante a marcação.'
            },
            {
              stepNumber: 3,
              title: 'Execução Controlada',
              instruction: 'Proceda com a fixação, encaixe ou manobra aplicando força gradual e firme.',
              technicalNote: 'Não force a ferramenta além de sua rotação ou capacidade nominal.',
              safetyCaution: 'Mantenha as mãos sempre fora da linha de corte ou aperto.'
            },
            {
              stepNumber: 4,
              title: 'Inspeção de Alinhamento e Acabamento',
              instruction: 'Verifique se não há folgas, rebarbas ou desvios em relação ao planejado.',
              technicalNote: 'Realize o teste de nivelamento com nível de bolha ou digital.',
              safetyCaution: 'Limpe o pó e resíduos antes de manusear a peça finalizada.'
            }
          ],
          images: [],
          practicalExamples: [
            'Aplicação em ambiente residencial padrão com tolerância de 1mm.',
            'Como proceder caso o material apresente pequena variação dimensional.'
          ],
          commonMistakes: [
            'Apressar a etapa de preparação e errar na medição inicial.',
            'Não utilizar o EPI adequado por excesso de confiança.'
          ],
          practicalTips: [
            'Faça uma lista de checagem mental antes de ligar qualquer equipamento.',
            'Guarde sobras de material para testes de acabamento preliminares.'
          ],
          safetyPrecautions: [
            'Uso obrigatório de EPIs adequados ao nível de ruído e partículas.',
            'Manter extintor e kit de primeiros socorros de fácil acesso no ambiente de trabalho.'
          ],
          summary: 'Nesta aula você aprendeu a preparar o ambiente, marcar com precisão, executar sem pressa e conferir o resultado.',
          exercise: {
            title: 'Treino Prático de Precisão',
            description: 'Reproduza os 4 passos em uma peça de teste antes de avançar para o material definitivo.',
            expectedOutcome: 'Peça de teste alinhada e aprovada visualmente.'
          },
          completionCriteria: [
            'Tolerância de medida dentro de 1 milímetro',
            'Superfície limpa sem lascas ou marcas excessivas de ferramentas',
            'Segurança respeitada durante todo o processo'
          ]
        });
      }

      modules.push({
        id: `mod_${m + 1}`,
        moduleNumber: m + 1,
        title: `Módulo ${m + 1}: ${theme.t}`,
        objective: theme.obj,
        lessons
      });
    }

    return {
      courseTitle: config.themeTitle,
      courseSubtitle: `Curso Prático Ilustrado — Guia Passo a Passo com Metodologia Comercial`,
      themeCategory: config.category,
      targetAudience: config.targetAudience,
      difficultyLevel: config.difficultyLevel,
      primarySkill: config.primarySkill || config.themeTitle,
      learningObjective: config.learningObjective,
      prerequisites: config.prerequisites || 'Nenhum conhecimento prévio exigido',
      language: config.language || 'Português',
      toneStyle: config.toneStyle || 'Didático, objetivo e profissional',
      requiredToolsAndMaterials: [
        'Conjunto de ferramentas manuais e elétricas adequadas',
        'Equipamentos de Proteção Individual (EPI)',
        'Insumos e materiais de consumo do segmento'
      ],
      modules,
      practicalProjects: [
        `Projeto Integrador: Desenvolvimento Completo de um Trabalho de ${config.themeTitle}`
      ],
      checklists: [
        {
          title: 'Checklist de Segurança Operacional',
          items: [
            'Uso de óculos de proteção e protetor auricular',
            'Bancada nivelada e livre de obstruções',
            'Inspeção prévia dos cabos elétricos e travas de segurança',
            'Iluminação clara sobre a superfície de trabalho'
          ]
        }
      ],
      assessmentMethods: [
        'Inspeção visual com gabarito de medidas',
        'Teste funcional de operação'
      ],
      glossary: [
        { term: 'Precisão', definition: 'Conformidade com o projeto sem desvios perceptíveis.' },
        { term: 'EPI', definition: 'Equipamento de Proteção Individual para segurança física.' }
      ],
      conclusion: `Parabéns pela conclusão do curso de ${config.themeTitle}! Você construiu uma base prática sólida e está pronto para executar serviços de qualidade.`,
      nextSteps: 'Pratique com consistência, monte seu portfólio de projetos e atenda seus primeiros clientes com segurança.',
      references: [
        'Manuais técnicos do fabricante de ferramentas e insumos',
        'Normas de segurança e ergonomia do trabalho'
      ]
    };
  }

  private static buildFallbackLesson(params: {
    courseTitle: string;
    category: string;
    difficultyLevel: string;
    moduleNumber: number;
    moduleTitle: string;
    lessonNumber: number;
    lessonTitle: string;
    lessonObjective: string;
  }): CourseLesson {
    return {
      id: `les_${params.moduleNumber}_${params.lessonNumber}_${Date.now()}`,
      lessonNumber: params.lessonNumber,
      title: params.lessonTitle,
      objective: params.lessonObjective,
      introduction: `Nesta aula do módulo ${params.moduleNumber}, você vai aprender em detalhes como realizar ${params.lessonTitle.toLowerCase()}. Este é um passo fundamental para alcançar o padrão profissional exigido no mercado de ${params.category}.`,
      didacticExplanation: `A execução técnica correta depende de atenção aos detalhes e respeito aos tempos de cada processo. Dominar essa técnica garante durabilidade, acabamento refinado e satisfação do cliente final.`,
      requiredMaterials: [
        'Ferramentas específicas de medição e ajuste',
        'Insumos compatíveis com a etapa de trabalho',
        'EPIs adequados à atividade'
      ],
      stepByStepInstructions: [
        {
          stepNumber: 1,
          title: 'Organização e Conferência dos Materiais',
          instruction: 'Separe as peças e ferramentas necessárias, conferindo dimensões e integridade antes de iniciar.',
          technicalNote: 'Trabalhe sempre sobre uma bancada limpa e estável.',
          safetyCaution: 'Utilize luvas e óculos de proteção apropriados.'
        },
        {
          stepNumber: 2,
          title: 'Marcação de Linhas de Referência',
          instruction: 'Trace as linhas guias com precisão milimétrica utilizando instrumentos calibrados.',
          technicalNote: 'Considere a espessura da lâmina ou do traço na marcação.',
          safetyCaution: 'Evite apoiar as mãos na direção de ferramentas afiadas.'
        },
        {
          stepNumber: 3,
          title: 'Procedimento Prático Principal',
          instruction: 'Execute o procedimento com movimentos firmes e velocidade constante, sem forçar o mecanismo.',
          technicalNote: 'Mantenha o ângulo recomendado durante todo o percurso.',
          safetyCaution: 'Desligue as ferramentas da tomada durante ajustes e trocas.'
        },
        {
          stepNumber: 4,
          title: 'Inspeção Final e Ajustes',
          instruction: 'Examine o encaixe, nivelamento e acabamento visual, realizando pequenos retoques se necessário.',
          technicalNote: 'Remova eventuais rebarbas com lixa fina ou acabamento manual.',
          safetyCaution: 'Aspire ou limpe a área sem soprar poeira contra os olhos.'
        }
      ],
      images: [],
      practicalExamples: [
        'Exemplo prático de aplicação em peças com medidas comerciais padrão.',
        'Como compensar pequenas variações na matéria-prima sem comprometer a estrutura.'
      ],
      commonMistakes: [
        'Ignorar o tempo de secagem ou resfriamento do material.',
        'Trabalhar com ferramentas descalibradas ou lâminas cegas.'
      ],
      practicalTips: [
        'Mantenha uma rotina de manutenção preventiva das ferramentas após cada dia de trabalho.',
        'Anote medidas em uma prancheta de oficina para não depender de memória.'
      ],
      safetyPrecautions: [
        'Proteção respiratória adequada em ambientes com partículas suspensas.',
        'Boa ventilação e iluminação no posto de trabalho.'
      ],
      summary: 'Você aprendeu a organizar, marcar, executar e inspecionar o procedimento com rigor técnico e segurança.',
      exercise: {
        title: 'Prática Guiada de Execução',
        description: 'Execute este procedimento duas vezes seguidas e compare os tempos e a qualidade do acabamento entre a primeira e a segunda tentativa.',
        expectedOutcome: 'Segunda execução mais rápida e com acabamento superior.'
      },
      completionCriteria: [
        'Execução completa de todos os passos',
        'Ausência de folgas ou desalinhamentos visíveis',
        'Respeito rigoroso aos procedimentos de segurança'
      ]
    };
  }
}
