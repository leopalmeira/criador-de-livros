import { describe, it, expect, vi } from 'vitest';

// Mock de IA para garantir execução offline rápida e determinística nos testes unitários
vi.mock('../src/services/kdp-ai-engine', () => ({
  chamarGeminiTexto: vi.fn().mockRejectedValue(new Error('Modo Offline Teste — Acionando Fallback Estruturado'))
}));

import {
  COURSE_CATEGORIES,
  getAllCourseThemes,
  searchCourseThemes,
  addCustomCourseTheme
} from '../src/data/course-themes-catalog';
import { CoursePedagogicalPlan, CourseLesson } from '../src/types/course-ebook';
import { CoursePedagogicalService } from '../src/services/course-pedagogical-service';
import { CourseVisualDirector } from '../src/services/course-visual-director';
import { CourseAuditorService } from '../src/services/course-auditor-service';
import { CoursePdfExporter } from '../src/services/course-pdf-exporter';

describe('BookEngin — Gerador de E-books de Cursos Profissionais', () => {

  describe('1. Catálogo Rigoroso de Temas (Requisito 4)', () => {
    it('deve possuir pelo menos 40 categorias oficiais', () => {
      expect(COURSE_CATEGORIES.length).toBeGreaterThanOrEqual(40);
    });

    it('cada categoria deve ter no mínimo 50 temas distintos', () => {
      const allThemes = getAllCourseThemes();
      for (const cat of COURSE_CATEGORIES) {
        const catThemes = allThemes.filter(t => t.category === cat);
        expect(catThemes.length, `A categoria "${cat}" deve conter ao menos 50 temas`).toBeGreaterThanOrEqual(50);
      }
    });

    it('o catálogo completo deve totalizar no mínimo 2.000 temas', () => {
      const allThemes = getAllCourseThemes();
      expect(allThemes.length).toBeGreaterThanOrEqual(2000);
    });

    it('deve realizar busca textual eficiente e filtros de categoria e nível', () => {
      const searchResult = searchCourseThemes({
        query: 'móveis',
        category: 'Marcenaria, móveis planejados e montagem',
        difficultyLevel: 'todos',
        page: 1,
        pageSize: 10
      });
      expect(searchResult.total).toBeGreaterThan(0);
      expect(searchResult.themes.length).toBeGreaterThan(0);
      expect(searchResult.themes[0].category).toBe('Marcenaria, móveis planejados e montagem');

      const beginnerFilter = searchCourseThemes({
        category: 'Confeitaria, bolos e doces',
        difficultyLevel: 'iniciante',
        page: 1,
        pageSize: 10
      });
      expect(beginnerFilter.total).toBeGreaterThan(0);
      beginnerFilter.themes.forEach(t => expect(t.difficultyLevel).toBe('iniciante'));
    });

    it('permite cadastrar temas customizados mantendo integridade', () => {
      const custom = addCustomCourseTheme({
        title: 'Marcenaria Ecológica com Paletes Descartados',
        category: 'Marcenaria, móveis planejados e montagem',
        description: 'Técnicas sustentáveis de reaproveitamento de madeira de descarte.',
        targetAudience: 'Marceneiros iniciantes e adeptos de sustentabilidade',
        difficultyLevel: 'iniciante',
        taughtSkill: 'Reaproveitamento de paletes para criação de mobiliário rústico',
        learningObjective: 'Desmontar, tratar e montar móveis com madeira recuperada',
        suggestedModules: ['Seleção de Paletes', 'Tratamento da Madeira', 'Montagem do Banco Rústico'],
        suggestedFormat: 'Apostila Prática Passo a Passo',
        tags: ['paletes', 'sustentabilidade', 'madeira', 'reciclagem']
      });
      expect(custom.id).toContain('CUSTOM_');
      expect(custom.title).toBe('Marcenaria Ecológica com Paletes Descartados');

      const found = searchCourseThemes({ query: 'Ecológica com Paletes' });
      expect(found.total).toBeGreaterThan(0);
    });
  });

  describe('2. Três Exemplos Obrigatórios de Cursos (Requisito 13)', () => {

    it('Exemplo 1: Curso de Móveis Planejados — planejamento e continuidade de etapas', async () => {
      const plan = await CoursePedagogicalService.planPedagogicalCurriculum({
        themeTitle: 'Montagem de Móveis Planejados do Zero',
        category: 'Marcenaria, móveis planejados e montagem',
        targetAudience: 'Iniciantes em marcenaria',
        difficultyLevel: 'iniciante',
        primarySkill: 'Montar armários e gabinetes em MDF',
        learningObjective: 'Capacitar o aluno a montar gabinetes de cozinha com alinhamento milimétrico.',
        modulesCount: 3,
        lessonsPerModule: 2,
        imageProfile: 'equilibrado'
      });

      expect(plan.courseTitle).toBeDefined();
      expect(plan.modules.length).toBeGreaterThanOrEqual(3);
      expect(plan.modules[0].lessons.length).toBeGreaterThanOrEqual(2);

      // Verificação da aula prática e plano visual com Replicate
      const firstLesson = plan.modules[0].lessons[0];
      const lessonContent = await CoursePedagogicalService.writeDidacticLesson({
        courseTitle: plan.courseTitle,
        category: plan.themeCategory,
        difficultyLevel: plan.difficultyLevel,
        moduleNumber: plan.modules[0].moduleNumber,
        moduleTitle: plan.modules[0].title,
        lessonNumber: firstLesson.lessonNumber,
        lessonTitle: firstLesson.title,
        lessonObjective: firstLesson.objective
      });
      expect(lessonContent.stepByStepInstructions.length).toBeGreaterThan(0);
      expect(lessonContent.requiredMaterials.length).toBeGreaterThan(0);
      expect(lessonContent.safetyPrecautions?.length).toBeGreaterThan(0);

      // Plano visual específico
      const visualPlan = CourseVisualDirector.buildImagePlanForLesson(
        lessonContent,
        plan.courseTitle,
        plan.themeCategory,
        'equilibrado'
      );
      expect(visualPlan.length).toBeGreaterThan(0);
      expect(visualPlan[0].title).toContain('Passo');
      expect(visualPlan[0].visualPrompt).toBeDefined();
      expect(visualPlan[0].visualPrompt).toContain('PURE PHOTOGRAPHY');
      expect(visualPlan[0].visualPrompt).not.toContain('STEP');
    });

    it('Exemplo 2: Curso de Confeitaria — medidas, técnicas e higiene', async () => {
      const plan = await CoursePedagogicalService.planPedagogicalCurriculum({
        themeTitle: 'Confeitaria Profissional e Bolos Decorados',
        category: 'Confeitaria, bolos e doces',
        targetAudience: 'Confeiteiras iniciantes',
        difficultyLevel: 'iniciante',
        primarySkill: 'Produzir bolos recheados e nivelados para venda',
        learningObjective: 'Dominar o cálculo de ingredientes, ponto de calda e acabamento perfeito.',
        modulesCount: 3,
        lessonsPerModule: 2,
        imageProfile: 'equilibrado'
      });

      expect(plan.modules.length).toBeGreaterThanOrEqual(3);
      const lesson = await CoursePedagogicalService.writeDidacticLesson({
        courseTitle: plan.courseTitle,
        category: plan.themeCategory,
        difficultyLevel: plan.difficultyLevel,
        moduleNumber: plan.modules[0].moduleNumber,
        moduleTitle: plan.modules[0].title,
        lessonNumber: plan.modules[0].lessons[0].lessonNumber,
        lessonTitle: plan.modules[0].lessons[0].title,
        lessonObjective: plan.modules[0].lessons[0].objective
      });
      expect(lesson.requiredMaterials.length).toBeGreaterThan(0);
      expect(lesson.stepByStepInstructions.length).toBeGreaterThan(0);

      const prompt = CourseVisualDirector.composeReplicatePrompt({
        courseTitle: plan.courseTitle,
        category: 'Confeitaria, bolos e doces',
        lessonTitle: lesson.title,
        stepNumber: 1,
        stepTitle: 'Bater claras em neve e incorporar farinha',
        instruction: 'Em velocidade média, bata as claras até picos firmes e adicione a farinha peneirada delicadamente com espátula.',
        materials: ['Batedeira planetária', 'Espátula de silicone', 'Tigela de inox'],
        visualStyle: 'fotografia-tecnica-instrucional'
      });
      expect(prompt).toContain('pastry studio');
      expect(prompt).toContain('Batedeira planetária');
    });

    it('Exemplo 3: Curso de Marketing Digital — estratégias, métricas e diagramas', async () => {
      const plan = await CoursePedagogicalService.planPedagogicalCurriculum({
        themeTitle: 'Marketing Digital e Aquisição de Clientes',
        category: 'Marketing digital e redes sociais',
        targetAudience: 'Empreendedores e prestadores de serviços',
        difficultyLevel: 'iniciante',
        primarySkill: 'Criar campanhas de aquisição digital',
        learningObjective: 'Estruturar um funil de captação de leads lucrativo.',
        modulesCount: 3,
        lessonsPerModule: 2,
        imageProfile: 'economico'
      });

      expect(plan.modules.length).toBeGreaterThanOrEqual(3);
      const lesson = await CoursePedagogicalService.writeDidacticLesson({
        courseTitle: plan.courseTitle,
        category: plan.themeCategory,
        difficultyLevel: plan.difficultyLevel,
        moduleNumber: plan.modules[1].moduleNumber,
        moduleTitle: plan.modules[1].title,
        lessonNumber: plan.modules[1].lessons[0].lessonNumber,
        lessonTitle: plan.modules[1].lessons[0].title,
        lessonObjective: plan.modules[1].lessons[0].objective
      });
      expect(lesson.didacticExplanation).toBeDefined();
      expect(lesson.exercise).toBeDefined();

      const visualPlan = CourseVisualDirector.buildImagePlanForLesson(
        lesson,
        plan.courseTitle,
        plan.themeCategory,
        'economico'
      );
      expect(visualPlan.length).toBeGreaterThanOrEqual(1);
      expect(visualPlan[0].visualPrompt.toLowerCase()).toContain('marketing');
    });
  });

  describe('3. Auditoria Pedagógica e Auto-Correção (Requisito 10)', () => {
    it('deve identificar falhas e permitir auto-correção em 1 clique', () => {
      // Cria plano com imperfeições para auditar
      const testPlan: CoursePedagogicalPlan = {
        courseTitle: 'Oficina Prática de Solda Elétrica',
        courseSubtitle: 'Guia de Soldagem com Eletrodo Revestido',
        themeCategory: 'Eletricidade e manutenção técnica',
        targetAudience: 'Iniciantes',
        difficultyLevel: 'iniciante',
        primarySkill: 'Operar máquina de solda',
        learningObjective: 'Unir chapas de aço em ângulo',
        prerequisites: 'Nenhum',
        language: 'Português',
        toneStyle: 'Direto e instrutivo',
        requiredToolsAndMaterials: ['Máquina inversora', 'Eletrodos E6013'],
        modules: [
          {
            id: 'mod_1',
            moduleNumber: 1,
            title: 'Operação Prática com Arco Elétrico',
            objective: 'Acender e manter o arco elétrico estável',
            lessons: [
              {
                id: 'les_1_1',
                lessonNumber: 1,
                title: 'Abertura do Arco Elétrico',
                objective: 'Riscar o eletrodo e estabilizar o arco',
                didacticExplanation: 'O arco elétrico atinge mais de 3.000 graus Celsius.',
                requiredMaterials: ['Inversora de solda', 'Eletrodo E6013'],
                stepByStepInstructions: [
                  {
                    stepNumber: 1,
                    title: 'Posicionamento do Eletrodo',
                    instruction: 'Aproxime o eletrodo a 70 graus em relação à peça.'
                  }
                ],
                commonMistakes: [],
                practicalTips: [],
                safetyPrecautions: [], // Falha intencional de segurança
                exercises: []
              }
            ]
          }
        ],
        practicalProjects: ['Banqueta de ferro soldada'],
        checklists: [], // Falha intencional: sem checklists
        assessmentMethods: ['Inspeção visual da solda'],
        glossary: [] // Falha intencional: sem glossário
      };

      const audit = CourseAuditorService.auditCourse(testPlan);
      expect(audit.passed).toBe(false);
      expect(audit.hasCriticalIssues).toBe(true);
      expect(audit.issues.length).toBeGreaterThan(0);

      // Aplica auto-correção em 1 clique para os problemas detectados
      for (const issue of audit.issues) {
        const fixed = CourseAuditorService.autoFixIssue(testPlan, issue.id);
        expect(fixed).toBe(true);
      }

      // Re-audita após auto-correção
      const auditAfterFix = CourseAuditorService.auditCourse(testPlan);
      expect(auditAfterFix.hasCriticalIssues).toBe(false);
      expect(auditAfterFix.overallScore).toBeGreaterThanOrEqual(80);
    });
  });

  describe('4. Exportação de PDF Completa (Requisito 11)', () => {
    it('deve gerar Uint8Array de PDF diagramado contendo páginas suficientes', () => {
      const sampleLesson: CourseLesson = {
        id: 'les_sample_1',
        lessonNumber: 1,
        title: 'Corte e Esquadro de Painéis MDF',
        objective: 'Aprender a cortar painéis no esquadro exato',
        didacticExplanation: 'O corte correto garante que as portas e gavetas fiquem alinhadas sem frestas.',
        requiredMaterials: ['Esquadro combinado', 'Trilho de guia', 'Serra circular'],
        stepByStepInstructions: [
          {
            stepNumber: 1,
            title: 'Fixação da Guia',
            instruction: 'Fixe o trilho guia alinhado à marcação de corte com grampos rápidos.',
            technicalNote: 'Conferir esquadro com régua de precisão.',
            safetyCaution: 'Usar óculos e luvas de proteção.'
          },
          {
            stepNumber: 2,
            title: 'Regulagem da Profundidade',
            instruction: 'Ajuste a lâmina de serra para 5mm além da espessura da chapa.',
            technicalNote: 'Evita esforço excessivo do motor.',
            safetyCaution: 'Verificar se a máquina está desligada da tomada.'
          },
          {
            stepNumber: 3,
            title: 'Avanço do Corte',
            instruction: 'Execute o avanço constante sem paradas na madeira.',
            technicalNote: 'Velocidade regular evita queima da melamina.',
            safetyCaution: 'Não posicionar mãos atrás da serra.'
          }
        ],
        commonMistakes: ['Avanço rápido demais que lasca a melamina.'],
        practicalTips: ['Use fita crepe sobre a linha para acabamento limpo.'],
        safetyPrecautions: ['Use óculos de proteção e protetor auricular durante o corte.'],
        exercise: {
          title: 'Corte de Teste',
          description: 'Corte um painel de teste 30x30cm e verifique as diagonais com o esquadro.',
          expectedOutcome: 'Ambas as diagonais idênticas comprovam o esquadro de 90 graus.'
        },
        completionCriteria: ['Medidas dentro de 0,5mm de tolerância'],
        summary: 'Corte limpo e seguro é a base de toda marcenaria precisa.'
      };

      const samplePlan: CoursePedagogicalPlan = {
        courseTitle: 'Marcenaria Fina e Móveis Planejados',
        courseSubtitle: 'Da Escolha do MDF à Montagem Completa',
        themeCategory: 'Marcenaria, móveis planejados e montagem',
        targetAudience: 'Iniciantes em marcenaria',
        difficultyLevel: 'iniciante',
        primarySkill: 'Construir gabinetes e armários',
        learningObjective: 'Projetar, cortar e montar móveis residenciais com precisão.',
        prerequisites: 'Nenhum',
        language: 'Português',
        toneStyle: 'Prático e profissional',
        requiredToolsAndMaterials: ['Serra circular', 'Esquadro combinado', 'Parafusadeira'],
        modules: [
          {
            id: 'mod_1',
            moduleNumber: 1,
            title: 'Módulo 1: Preparação e Usinagem de Chapas',
            objective: 'Dominar as ferramentas de corte e conferência',
            lessons: [sampleLesson]
          }
        ],
        practicalProjects: ['Construção de um Gabinete Suspenso de 2 Portas'],
        checklists: [
          {
            title: 'Checklist de Oficina Segura',
            items: ['EPIs colocados', 'Mancais lubrificados', 'Extintor acessível']
          }
        ],
        assessmentMethods: ['Avaliação de alinhamento diagonal e esquadro'],
        glossary: [
          { term: 'MDF', definition: 'Medium Density Fiberboard, painel de fibras de média densidade.' }
        ],
        conclusion: 'Com estas técnicas consolidadas, você está apto a iniciar projetos residenciais.',
        nextSteps: 'Avance para o módulo de corrediças telescópicas e dobradiças com amortecedor.'
      };

      const pdfBytes = CoursePdfExporter.buildCoursePdf(samplePlan, {
        authorName: 'Mestre da Marcenaria',
        includeChecklists: true,
        includeGlossary: true
      });

      expect(pdfBytes).toBeDefined();
      expect(pdfBytes.byteLength).toBeGreaterThan(5000);
    });
  });

});
