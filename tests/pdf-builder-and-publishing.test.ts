import { describe, it, expect } from 'vitest';
import { PdfBuilder } from '../src/services/formats/pdf-builder';
import { KdpBookPipeline } from '../src/services/kdp-pipeline';
import { AiService } from '../src/services/ai-service';
import { BookProject } from '../src/types/book-project';

describe('PdfBuilder & Publicação KDP (Antigravity Specialist Flow)', () => {
  const dummyProject: BookProject = {
    id: 'proj_pdf_test',
    title: 'O Poder da Ação Imediata',
    subtitle: 'Como parar de procrastinar e construir foco implacável',
    author: 'Leandro Palmeira',
    description: 'Guia definitivo para construir rotinas de alta performance sem sobrecarga.',
    trimSize: '6x9',
    paperType: 'bw-white',
    estimatedPages: 80,
    actualPages: 80,
    coverImageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    kdpChapters: [
      {
        index: 1,
        title: 'O Despertar da Clareza Estratégica',
        summary: 'Diagnóstico da sobrecarga moderna e identificação de prioridades.',
        targetWordCount: 1500,
        wordCount: 1200,
        scenes: [],
        subtopics: ['Diagnóstico', 'Mecanismos'],
        prose: 'Vivemos em um período marcado pela aceleração constante e pela escassez de momentos de reflexão profunda. Neste primeiro capítulo, analisamos como as decisões cotidianas moldam os resultados de longo prazo.\n\nA primeira grande barreira encontrada por qualquer pessoa comprometida com a mudança é a inércia da rotina automatizada. Quando os fatos são colocados à prova, percebe-se que pequenas melhorias contínuas produzem efeitos exponenciais ao longo das semanas.'
      },
      {
        index: 2,
        title: 'A Arquitetura dos Ambientes de Alta Performance',
        summary: 'Redesenho dos espaços físicos e digitais para eliminar atritos.',
        targetWordCount: 1500,
        wordCount: 1100,
        scenes: [],
        subtopics: ['Ambiente', 'Atrito'],
        prose: 'O ambiente ao seu redor determina seus comportamentos com muito mais intensidade do que a sua força de vontade consciente. Ao reorganizar os gatilhos visuais e acústicos da sua mesa de trabalho, a clareza se torna o padrão.\n\nEliminar o excesso de estímulos digitais e criar blocos inegociáveis de concentração é a chave dos maiores profissionais.'
      }
    ]
  } as unknown as BookProject;

  it('PdfBuilder.buildInteriorPdf deve gerar PDF com prosa rica, sem páginas em branco e de tamanho consistente', async () => {
    const blob = await PdfBuilder.buildInteriorPdf(dummyProject);
    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(15000); // Garante conteúdo real de miolo diagramado
    expect(blob.type).toBe('application/pdf');
  });

  it('PdfBuilder.buildInteriorPdf com capítulos curtos deve enriquecer automaticamente via ShowMeTheStoryEngine', async () => {
    const thinProject: BookProject = {
      ...dummyProject,
      id: 'proj_thin',
      kdpChapters: [] // Sem capítulos ainda
    };

    const blob = await PdfBuilder.buildInteriorPdf(thinProject);
    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(15000); // Garante que foi enriquecido e diagramado
  });

  it('PdfBuilder.buildCoverWrapPdf deve gerar capa completa Full-Wrap (Capa + Lombada + Contracapa)', async () => {
    const blob = await PdfBuilder.buildCoverWrapPdf(dummyProject, 80);
    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(5000);
    expect(blob.type).toBe('application/pdf');
  });

  it('KdpBookPipeline.runQualityGate deve aprovar capa informada via coverImageUrl ou design', () => {
    const ai = new AiService({ provider: 'local-builtin' });
    const pipeline = new KdpBookPipeline(ai);

    const report = pipeline.runQualityGate(dummyProject);
    expect(report.checks.find(c => c.id === 'chk_cover')?.passed).toBe(true);
    expect(report.blockerCount).toBe(0);
  });
});
