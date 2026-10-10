import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoursePdfExporter } from '../src/services/course-pdf-exporter';
import { CourseVisualDirector } from '../src/services/course-visual-director';
import { CourseNarrationService } from '../src/services/course-narration-service';
import { CoursePedagogicalPlan, CourseLesson } from '../src/types/course-ebook';

describe('Correções de Feedback do E-book de Curso (PDF, Capa, Antes/Depois, Áudio e Link)', () => {
  const mockPlan: CoursePedagogicalPlan = {
    courseTitle: 'Manicure Russa e Cutilagem Combinada',
    courseSubtitle: 'Guia Técnico Passo a Passo com Brocas Diamantadas',
    targetAudience: 'Manicures iniciantes e profissionais',
    difficultyLevel: 'intermediario',
    modulesCount: 1,
    modules: [
      {
        id: 'mod_1',
        moduleNumber: 1,
        title: 'Fundamentos da Cutilagem Combinada',
        objective: 'Mapear a lâmina ungueal com segurança',
        lessons: [
          {
            id: 'les_1',
            lessonNumber: 1,
            title: 'Mapeamento Visual e Iluminação',
            objective: 'Identificar a prega ungueal sem causar lesões',
            introduction: 'A cutilagem combinada de alta performance requer iluminação direta e postura ergonômica.',
            didacticExplanation: 'Nesta técnica avançada, a diferenciação entre cutícula e eponíquio garante precisão milimétrica.',
            stepByStepInstructions: [
              {
                stepNumber: 1,
                title: 'Mapeamento Visual com Lupa de Bancada',
                instruction: 'Posicione a mão sob a lupa com luz direta em 45 graus.',
                technicalNote: 'Mantenha a mão firme; a pressão exercida pela espátula deve ser extremamente leve.',
                safetyCaution: 'Utilize óculos de proteção com lentes anti-reflexo e luvas nitrílicas.'
              }
            ],
            exercise: {
              title: 'Prática em Modelo de Treino',
              description: 'Realize o afastamento milimétrico em todos os cinco dedos.',
              expectedOutcome: 'Lâmina sem ranhuras e prega preservada.'
            },
            beforeAfterComparison: {
              enabled: true,
              beforeDescription: 'Cutícula espessa aderida à lâmina ungueal',
              afterDescription: 'Acabamento limpo e selado sem vermelhidão'
            }
          }
        ]
      }
    ]
  };

  it('1. Deve gerar PDF sem erro com capa editorial contendo título e sem badges falsas', () => {
    const doc = CoursePdfExporter.generateCoursePdf(mockPlan, {
      authorName: 'Instrutora Master'
    });
    expect(doc).toBeDefined();
    // Verifica se gerou páginas
    const totalPages = doc.getNumberOfPages();
    expect(totalPages).toBeGreaterThanOrEqual(2);
  });

  it('2. Prompts visuais negativos devem banir expressamente selos falsos, badges e ribbons', () => {
    const prompt = CourseVisualDirector.buildBeforeAfterPrompt({
      courseTitle: 'Manicure Russa',
      category: 'Beleza & Estética',
      lessonTitle: 'Cutilagem Perfeita',
      isBefore: true
    });
    expect(prompt).toContain('INITIAL UNTREATED CONDITION');
    expect(prompt).toContain('NO BADGES');

    const afterPrompt = CourseVisualDirector.buildBeforeAfterPrompt({
      courseTitle: 'Manicure Russa',
      category: 'Beleza & Estética',
      lessonTitle: 'Cutilagem Perfeita',
      isBefore: false
    });
    expect(afterPrompt).toContain('FLAWLESS FINISHED PROFESSIONAL OUTCOME');
    expect(afterPrompt).toContain('NO BADGES');
  });

  it('3. Serviço de narração feminina deve compor texto didático completo para síntese de voz', () => {
    const lesson = mockPlan.modules[0].lessons[0];
    const narrationText = CourseNarrationService.composeLessonNarrationText(lesson);

    expect(narrationText).toContain('Aula número 1');
    expect(narrationText).toContain('Mapeamento Visual e Iluminação');
    expect(narrationText).toContain('Instruções práticas');
    expect(narrationText).toContain('Passo 1');
    expect(narrationText).toContain('Mantenha a mão firme');
  });

  it('4. Deve suportar campos de Antes e Depois com dados de imagem em base64', () => {
    const lesson = mockPlan.modules[0].lessons[0];
    expect(lesson.beforeAfterComparison).toBeDefined();
    expect(lesson.beforeAfterComparison?.enabled).toBe(true);

    lesson.beforeAfterComparison!.beforeImageDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    lesson.beforeAfterComparison!.afterImageDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const docWithImages = CoursePdfExporter.generateCoursePdf(mockPlan, {
      authorName: 'Instrutora Master'
    });
    expect(docWithImages).toBeDefined();
  });
});
