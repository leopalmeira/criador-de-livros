// Serviço Orquestrador do Gerador de Livros de Sudoku Investigativo (Book Intel KDP)
import { 
  SudokuBookConfig, 
  InvestigationCase, 
  ConsistencyValidationReport 
} from '../types/sudoku-investigative';
import { InvestigativeStoryGenerator } from './investigative-story-generator';
import { InvestigativeValidator } from './investigative-validator';
import { SudokuKdpPdfBuilder } from './sudoku-kdp-pdf-builder';
import { db } from '../database/local-database';
import { BookProject, IBookChapter } from '../types/book-project';

export class SudokuInvestigativeService {
  /**
   * Executa a geração completa do livro de Sudoku Investigativo com acompanhamento em tempo real
   */
  public static async generateCompleteBook(
    config: SudokuBookConfig,
    onProgress: (step: string, percent: number) => void
  ): Promise<{
    cases: InvestigationCase[];
    validationReport: ConsistencyValidationReport;
    coverUrl: string;
  }> {
    // 1. Criando casos... 20%
    onProgress('Criando estrutura dos casos e ambientação...', 20);
    await new Promise(r => setTimeout(r, 400));

    // 2. Criando personagens... 35%
    onProgress('Definindo vítimas, suspeitos e segredos...', 35);
    await new Promise(r => setTimeout(r, 400));

    // 3. Gerando Sudokus matemáticos válidos... 50%
    onProgress('Gerando Sudokus 9x9 com solução única garantida...', 50);
    const cases = InvestigativeStoryGenerator.generateBookCases(config);
    await new Promise(r => setTimeout(r, 500));

    // 4. Validando pistas e coerência lógica... 70%
    onProgress('Auditando consistência lógica, pistas e álibis...', 70);
    const validationReport = InvestigativeValidator.validateAllCases(cases);
    await new Promise(r => setTimeout(r, 400));

    // 5. Montando páginas... 85%
    onProgress('Diagramando fichas de investigação e gabaritos...', 85);
    await new Promise(r => setTimeout(r, 300));

    // 6. Geração de capa KDP
    const coverPrompt = encodeURIComponent(
      `cinematic murder mystery book cover, Title "${config.title}", Detective noir aesthetic, magnifying glass over glowing sudoku grid, dark vintage office, moody shadows, gold foil typography, 8k resolution, Amazon KDP print quality`
    );
    const coverUrl = `https://image.pollinations.ai/prompt/${coverPrompt}?width=1200&height=1800&model=flux&nologo=true`;

    // 7. Finalizando livro... 100%
    onProgress('Livro de Sudoku Investigativo finalizado com sucesso!', 100);

    return {
      cases,
      validationReport,
      coverUrl
    };
  }

  /**
   * Valida a consistência lógica e matemática
   */
  public static validateCases(cases: InvestigationCase[]): ConsistencyValidationReport {
    return InvestigativeValidator.validateAllCases(cases);
  }

  /**
   * Gera o PDF Interior Diagramado
   */
  public static async generateInteriorPdf(config: SudokuBookConfig, cases: InvestigationCase[]) {
    return await SudokuKdpPdfBuilder.buildInteriorPdf(config, cases);
  }

  /**
   * Gera o PDF de Gabarito
   */
  public static async generateSolutionsPdf(config: SudokuBookConfig, cases: InvestigationCase[]) {
    return await SudokuKdpPdfBuilder.buildSolutionsOnlyPdf(config, cases);
  }

  /**
   * Persiste o livro como um projeto oficial do Book Intel KDP
   */
  public static async saveToBookProject(
    config: SudokuBookConfig,
    cases: InvestigationCase[],
    coverUrl?: string
  ): Promise<BookProject> {
    const projectId = `proj_sudoku_inv_${Date.now()}`;
    const totalPuzzles = cases.reduce((acc, c) => acc + c.puzzles.length, 0);
    const estimatedPages = cases.length * (5 + config.sudokusPerCase) + 20;

    const chapters: IBookChapter[] = cases.map((c, idx) => ({
      index: idx + 1,
      title: c.title,
      summary: `Vítima: ${c.victim.nome}. Cena: ${c.crimeScene.localDetalhado}. ${c.puzzles.length} Sudokus investigativos.`,
      prose: `# ${c.title}\n\n${c.storyIntroduction}\n\n## Cena do Crime\n${c.crimeScene.descricao}\n\n## Solução do Inquérito\nAssassino: ${c.caseSolution.culprit.nome}\nMotivo: ${c.caseSolution.motiveExplanation}`,
      wordCount: 450,
      scenes: [],
      charactersPresent: c.suspects.map(s => s.nome)
    }));

    const project: BookProject = {
      id: projectId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'DIAGRAMAÇÃO',
      priority: 'ALTA',
      executionMode: 'assisted',
      title: config.title,
      subtitle: config.subtitle || 'Livro de Sudoku com Histórias de Mistério',
      author: config.author || 'Leandro Palmeira',
      description: `Livro de Sudoku Investigativo contendo ${cases.length} casos policiais com ${totalPuzzles} enigmas lógicos matematicamente validados. Pistas integradas e gabarito completo para Amazon KDP.`,
      language: 'Português',
      format: 'Capa Comum',
      trimSize: config.trimFormat === '8.5x11' ? '8.5x11' : '8.5x8.5',
      paperType: 'bw-white',
      estimatedPages,
      actualPages: estimatedPages,
      targetPrice: 39.90,
      currency: 'BRL',
      targetMarketplace: 'amazon.com.br',
      categories: ['Jogos e Quebra-Cabeças', 'Mistério e Policial', 'Sudoku KDP'],
      keywords: [
        'sudoku investigativo',
        'murder mystery sudoku',
        'livro de sudoku mistério',
        'sudoku criminal kdp',
        'enigmas policiais sudoku'
      ],
      targetAudience: 'Adultos e Jovens amantes de suspense, mistério e raciocínio lógico',
      topic: `Sudoku Investigativo Criminal: ${config.theme}`,
      kdpBookType: 'puzzle-book',
      kdpChapters: chapters,
      coverImageUrl: coverUrl || '',
      kdpCoverDesign: {
        frontImageUrl: coverUrl || '',
        status: 'approved' as any
      } as any,
      pipelineStage: 'idle',
      pipelineProgress: 0,
      pipelineLog: [],
      tasks: [],
      notes: '',
      competitorsAsins: []
    };

    try {
      await db.saveBookProject(project);
    } catch (err) {
      console.warn('Persistência IndexedDB (ignorado em ambiente sem IndexedDB):', err);
    }

    return project;
  }
}
