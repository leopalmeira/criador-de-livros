import { describe, it, expect } from 'vitest';
import { StoryContextAuditor } from '../src/services/story-context-auditor';
import { SmartCoverArtDirector } from '../src/services/smart-cover-art-director';
import { PrintCoverService } from '../src/services/print-cover-service';
import { PublishingMetadataService } from '../src/services/publishing-metadata-service';
import { PdfBuilder } from '../src/services/formats/pdf-builder';
import { BookProject } from '../src/types/book-project';

describe('PROMPT MASTER: REESTRUTURAÇÃO DO MOTOR EDITORIAL DO BOOKENGIN', () => {

  // =========================================================================
  // 1. TESTES DE NARRATIVA & CONTEXTO GLOBAL
  // =========================================================================
  describe('1. Auditoria Contextual, Continuidade e Desfecho Narrativo', () => {
    it('1.1 Constrói StoryBible estruturada persistente a partir do manuscrito', () => {
      const book = {
        titulo: 'O Enigma do Relógio Antigo',
        subtitulo: 'Uma Jornada pelo Tempo',
        autor: 'Helena Ramos',
        genero: 'Ficção de Suspense',
        idioma: 'pt-BR',
        capitulos: [
          {
            titulo: 'Capítulo 1: O Testamento',
            texto: 'Helena herdou uma antiga mansão em Sintra de seu tio Arthur. O relógio na parede parara às 3:15 da madrugada.'
          },
          {
            titulo: 'Capítulo 2: O Mecanismo Secreto',
            texto: 'Arthur havia escondido um pergaminho com o mapa do túnel subterrâneo dentro da engrenagem de latão.'
          }
        ]
      };

      const bible = StoryContextAuditor.buildStoryBible(book, 'Desvendar o mistério deixado pelo tio');
      expect(bible.premise).toContain('Desvendar o mistério');
      const charList = Object.values(bible.characters);
      expect(charList.some(c => c.name.toLowerCase().includes('arthur') || c.name.toLowerCase().includes('helena'))).toBe(true);
      expect(bible.locations.length).toBeGreaterThan(0);
      expect(bible.timeline.length).toBe(2);
      expect(bible.conflicts.length).toBeGreaterThan(0);
    });

    it('1.2 Detecta resíduos de IA, comandos e marcadores vazios no texto', () => {
      const dirtyText = `Certamente! Aqui está o capítulo que você pediu com riqueza de detalhes:
Helena encontrou o velho diário de Arthur escondido sob as tábuas do sótão.
Como uma IA, espero que esta narrativa atenda às suas expectativas. [FIM DO CAPÍTULO]`;

      const sanitization = StoryContextAuditor.detectAndSanitizeAiResidues(dirtyText);
      expect(sanitization.findings.length).toBeGreaterThanOrEqual(2);
      expect(sanitization.cleanText).not.toContain('Certamente! Aqui está');
      expect(sanitization.cleanText).not.toContain('Como uma IA');
      expect(sanitization.cleanText).not.toContain('[FIM DO CAPÍTULO]');
      expect(sanitization.cleanText).toContain('Helena encontrou o velho diário');
    });

    it('1.3 Detecta inconsistências de nomes similares ou duplicados entre personagens', () => {
      const characters = [
        { name: 'Leonardo', role: 'Protagonista' as const, traits: [], knowledge: [] },
        { name: 'Leonarda', role: 'Secundário' as const, traits: [], knowledge: [] },
        { name: 'Valdemar', role: 'Antagonista' as const, traits: [], knowledge: [] }
      ];

      const contradictions = StoryContextAuditor.detectCharacterContradictions(characters);
      expect(contradictions.some(c => c.includes('Leonardo') && c.includes('Leonarda'))).toBe(true);
    });

    it('1.4 Valida transição e conexão lógica entre capítulos em sequência', () => {
      const ch1 = {
        title: 'Capítulo 1: A Fuga',
        text: 'Eles correram pela floresta escura enquanto os cães latiam ao longe. Ao amanhecer, alcançaram a ponte de pedra.'
      };
      const ch2Connected = {
        title: 'Capítulo 2: O Outro Lado do Rio',
        text: 'Depois de cruzar a ponte de pedra com os pés doloridos, eles encontraram abrigo no moinho abandonado.'
      };
      const ch2Disconnected = {
        title: 'Capítulo 2: Voo Espacial em Marte',
        text: 'O comandante ajustou os propulsores de plasma no espaço profundo rumo à estação de satélites.'
      };

      const validConnection = StoryContextAuditor.validateChapterConnection(ch1, ch2Connected, 1);
      expect(validConnection.connected).toBe(true);
      expect(validConnection.issues.length).toBe(0);

      const invalidConnection = StoryContextAuditor.validateChapterConnection(ch1, ch2Disconnected, 1);
      expect(invalidConnection.connected).toBe(false);
      expect(invalidConnection.issues.length).toBeGreaterThan(0);
    });

    it('1.5 Avalia fechamento da história e bloqueia cortes abruptos', () => {
      const abruptChapter = {
        title: 'Capítulo Final: A Decisão',
        text: 'E então ele olhou para o abismo escuro. (Continua na próxima geração...'
      };
      const abruptAssessment = StoryContextAuditor.auditStoryEnding(abruptChapter, 'Vencer a guerra contra os invasores');
      expect(abruptAssessment.approved).toBe(false);
      expect(abruptAssessment.findings.some(f => f.toLowerCase().includes('abrupto') || f.toLowerCase().includes('incompleto'))).toBe(true);

      const completeChapter = {
        title: 'Epílogo: A Nova Alvorada',
        text: 'Com o tratado finalmente assinado, a cidade respirou em paz. As feridas da guerra começavam a cicatrizar e o povo celebrava o renascimento de sua terra. Era o fim de uma longa jornada e o recomeço de uma nova era.'
      };
      const completeAssessment = StoryContextAuditor.auditStoryEnding(completeChapter, 'Vencer a guerra e restaurar a paz');
      expect(completeAssessment.approved).toBe(true);
    });

    it('1.6 Sistema de Snapshots históricos reversíveis protege o manuscrito original', () => {
      const book = {
        titulo: 'Livro Original',
        subtitulo: '',
        autor: 'Autor',
        genero: 'Drama',
        idioma: 'pt-BR',
        capitulos: [
          { titulo: 'Cap 1', texto: 'Texto original intacto.' }
        ]
      };

      const snap1 = StoryContextAuditor.createSnapshot(book, 'Antes da revisão');
      expect(snap1.id).toBeDefined();
      expect(snap1.chapters[0].texto).toBe('Texto original intacto.');

      // Simula alteração
      const altered = {
        ...book,
        capitulos: [{ titulo: 'Cap 1', texto: 'Texto modificado incorretamente.' }]
      };
      const restored = StoryContextAuditor.rollbackToSnapshot(snap1);
      expect(restored.capitulos[0].texto).toBe('Texto original intacto.');
    });
  });

  // =========================================================================
  // 2. TESTES LINGUÍSTICOS E LIMPEZA ESTRUTURAL
  // =========================================================================
  describe('2. Revisão Linguística, Pontuação e Limpeza de Estrutura', () => {
    it('2.1 Limpa pontuação duplicada, aspas inglesas e normaliza travessões de diálogo', () => {
      const messyText = `"Olá!", disse ela.. "Como você está??" -- Eu estou bem...`;
      const cleaned = StoryContextAuditor.cleanPunctuationAndDialogues(messyText);

      expect(cleaned).not.toContain('..');
      expect(cleaned).not.toContain('??');
      expect(cleaned).toContain('—'); // travessão editorial
      expect(cleaned).not.toContain('--');
    });

    it('2.2 Corrige quebras indevidas no meio de orações e linhas em branco consecutivas', () => {
      const fragmentedText = `Ela caminhava com passos rápidos\n\n\n\nrumo à antiga biblioteca municipal.`;
      const cleaned = StoryContextAuditor.cleanParagraphsAndSpacing(fragmentedText);

      expect(cleaned).not.toContain('\n\n\n');
      expect(cleaned).toContain('passos rápidos rumo à antiga');
    });
  });

  // =========================================================================
  // 3. TESTES DE CAPAS & DIREÇÃO DE ARTE EXCLUSIVA
  // =========================================================================
  describe('3. Motor Inteligente de Direção de Arte de Capas', () => {
    it('3.1 Produz fichas distintas e variadas para livros independentes (anti-mesmice)', () => {
      const book1 = {
        title: 'Mentes de Aço',
        genre: 'Negócios e Liderança',
        synopsis: 'Estratégias de alta performance para executivos.',
        tone: 'Analítico e Corporativo'
      };
      const book2 = {
        title: 'A Floresta das Sombras',
        genre: 'Terror Sobrenatural',
        synopsis: 'Um acampamento abandonado onde criaturas antigas despertam.',
        tone: 'Sombrio e Claustrofóbico'
      };

      const brief1 = SmartCoverArtDirector.generateArtDirectionBrief(book1, []);
      const brief2 = SmartCoverArtDirector.generateArtDirectionBrief(book2, [brief1]);

      // Garante diversidade de paleta, composição e iluminação
      expect(brief1.palette.background).not.toBe(brief2.palette.background);
      expect(brief1.composition.cameraPerspective).not.toBe(brief2.composition.cameraPerspective);
      expect(brief1.typography.bodyFont).not.toBe(brief2.typography.bodyFont);
      expect(brief1.typography.headingFont).not.toBe(brief2.typography.headingFont);
    });

    it('3.2 Preserva identidade visual de franquia quando isSeries é true', () => {
      const bookSeries1 = {
        title: 'As Crônicas de Valéria - Livro 1',
        genre: 'Fantasia Épica',
        synopsis: 'O despertar da magia antiga.',
        seriesName: 'Crônicas de Valéria',
        isSeries: true
      };
      const bookSeries2 = {
        title: 'As Crônicas de Valéria - Livro 2',
        genre: 'Fantasia Épica',
        synopsis: 'A guerra dos dragões de gelo.',
        seriesName: 'Crônicas de Valéria',
        isSeries: true
      };

      const brief1 = SmartCoverArtDirector.generateArtDirectionBrief(bookSeries1, []);
      const brief2 = SmartCoverArtDirector.generateArtDirectionBrief(bookSeries2, [brief1]);

      // Série deve manter a tipografia da franquia
      expect(brief2.typography.headingFont).toBe(brief1.typography.headingFont);
      expect(brief2.seriesConsistency?.seriesName).toBe('Crônicas de Valéria');
    });

    it('3.3 Renderiza SVG com vetorização nítida, título de revista e sem texto deformado', () => {
      const brief = SmartCoverArtDirector.generateArtDirectionBrief({
        title: 'O CÓDIGO DA MENTE',
        subtitle: 'Neurociência Aplicada ao Sucesso',
        author: 'Dr. Roberto Mendes',
        genre: 'Ciência & Autoajuda',
        synopsis: 'Como reprogramar hábitos cerebrais.'
      });

      const svg = SmartCoverArtDirector.generateSvgCover(brief, 1);
      expect(svg).toContain('<svg');
      expect(svg).toContain('viewBox="0 0 1600 2400"');
      expect(svg).toContain('O CÓDIGO DA MENTE');
      expect(svg).toContain('DR. ROBERTO MENDES');
      expect(svg).toContain(brief.palette.primaryAccent);
    });
  });

  // =========================================================================
  // 4. TESTES DE CAPA IMPRESSA KDP, LOMBADA E CONTRACAPA
  // =========================================================================
  describe('4. Capa Impressa KDP Full-Wrap e Bloqueio Técnico', () => {
    it('4.1 Calcula espessura de lombada precisa conforme tipo de papel (Branco vs Creme)', () => {
      // 200 páginas Papel Branco KDP = 200 * 0.002252 = 0.4504 pol = 11.44 mm
      // 200 páginas Papel Creme KDP = 200 * 0.0025 = 0.5000 pol = 12.70 mm
      const spineWhite = PdfBuilder.calculateSpineWidthMm(200, 'bw-white');
      const spineCream = PdfBuilder.calculateSpineWidthMm(200, 'bw-cream');

      expect(spineWhite).toBeCloseTo(11.44, 1);
      expect(spineCream).toBeCloseTo(12.70, 1);
      expect(spineCream).toBeGreaterThan(spineWhite);
    });

    it('4.2 Bloqueia exportação de capa impressa se o livro tiver menos de 24 páginas (Regra KDP)', () => {
      const validation = PrintCoverService.validatePrintCover({
        title: 'Pequeno Panfleto',
        author: 'Autor',
        pageCount: 16,
        paperType: 'bw-white',
        trimSize: '6x9',
        hasFrontArt: true
      });

      expect(validation.canExport).toBe(false);
      expect(validation.errors.some(e => e.includes('24 páginas'))).toBe(true);
    });

    it('4.3 Gera contracapa inteligente com gancho, sinopse, benefícios e área de código de barras reservada', () => {
      const backCover = PrintCoverService.generateSmartBackCover({
        title: 'Produtividade Extrema',
        subtitle: 'Foco e Disciplina',
        author: 'Lucas Silva',
        genre: 'Negócios',
        synopsis: 'Aprenda a eliminar distrações e dobrar seu rendimento diário.',
        audience: 'Empreendedores'
      });

      expect(backCover.headlineHook).toBeDefined();
      expect(backCover.synopsisSummary).toContain('eliminar distrações');
      expect(backCover.readingBenefits.length).toBeGreaterThanOrEqual(3);
      expect(backCover.barcodeReservedBox.widthMm).toBe(50.8);
      expect(backCover.barcodeReservedBox.heightMm).toBe(30.5);
    });

    it('4.4 Constrói PDF Full-Wrap de Capa Aberta (Landscape) com resolução válida', async () => {
      const project: BookProject = {
        id: 'proj-kdp-test',
        title: 'Manual de Engenharia de Software',
        subtitle: 'Práticas Modernas de Desenvolvimento',
        author: 'Marcos Vinícius',
        genre: 'Tecnologia',
        trimSize: '6x9',
        paperType: 'bw-white',
        actualPages: 160,
        description: 'Um guia completo e moderno sobre arquitetura e qualidade de software.',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const pdfBlob = await PdfBuilder.buildCoverWrapPdf(project, 160);
      expect(pdfBlob).toBeInstanceOf(Blob);
      expect(pdfBlob.size).toBeGreaterThan(1000);
      expect(pdfBlob.type).toBe('application/pdf');
    });
  });

  // =========================================================================
  // 5. TESTES DE PALAVRAS-CHAVE, METADADOS E PAINEL AUDITOR
  // =========================================================================
  describe('5. Metadados Oficiais Amazon KDP, 7 Palavras-Chave e Bloqueio Preventivo', () => {
    it('5.1 Valida as 7 palavras-chave e veta termos proibidos (nomes de concorrentes, best-seller, etc.)', () => {
      const forbiddenKeywords = [
        'livro best-seller amazon', // proibido: best-seller
        'semelhante a Stephen King', // proibido: concorrente famoso
        'melhor livro de todos os tempos', // proibido: melhor livro
        'grátis para ler no kindle', // proibido: grátis
        'ficção científica espacial', // válido
        'aventura cyberpunk distópica', // válido
        'colonização de exoplanetas' // válido
      ];

      const validation = PublishingMetadataService.validateKdpKeywords(
        forbiddenKeywords,
        'Odisseia Estelar',
        'Autor Próprio'
      );

      expect(validation.warnings.length).toBeGreaterThanOrEqual(3);
      expect(validation.warnings.some(w => w.includes('best-seller'))).toBe(true);
      expect(validation.warnings.some(w => w.includes('Stephen King'))).toBe(true);
      expect(validation.warnings.some(w => w.includes('grátis'))).toBe(true);
    });

    it('5.2 Gera pacote de 7 palavras-chave KDP em conformidade total', () => {
      const project: BookProject = {
        id: 'proj-meta-1',
        title: 'Mentes Blindadas',
        subtitle: 'Resiliência e Inteligência Emocional',
        author: 'Carla Dias',
        genre: 'Autoajuda',
        description: 'Técnicas práticas de resiliência psicológica para lidar com pressão e ansiedade no dia a dia.',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const pack = PublishingMetadataService.generateKdpMetadataPack(project);
      expect(pack.keywords7.length).toBe(7);
      expect(pack.keywords7.every(k => k.length > 0 && k.length <= 50)).toBe(true);

      const val = PublishingMetadataService.validateKdpKeywords(pack.keywords7, project.title, project.author);
      expect(val.warnings.length).toBe(0);
      expect(val.validCount).toBe(7);
    });

    it('5.3 Avalia status consolidado de auditoria (Aprovado vs Bloqueado para Exportação)', () => {
      const passedStatus = PublishingMetadataService.evaluateOverallPublishReadiness({
        manuscriptScore: 95,
        printCoverValid: true,
        pageCount: 120,
        kdpKeywordsValid: true
      });
      expect(passedStatus.status).toBe('APROVADO');
      expect(passedStatus.blockers.length).toBe(0);

      const blockedStatus = PublishingMetadataService.evaluateOverallPublishReadiness({
        manuscriptScore: 40,
        printCoverValid: false,
        pageCount: 18, // < 24 páginas
        kdpKeywordsValid: false
      });
      expect(blockedStatus.status).toBe('BLOQUEADO_PARA_EXPORTACAO');
      expect(blockedStatus.blockers.length).toBeGreaterThanOrEqual(2);
    });
  });
});
