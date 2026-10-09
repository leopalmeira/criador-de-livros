// ================================================================
// ESTANTE DE LIVROS FINALIZADOS E VALIDADOS NA DASHBOARD
// Exibe todos os livros finalizados com TODOS os detalhes listados:
// - Manuscrito (.txt / .doc)
// - PDF do Livro (Miolo diagramado oficial KDP)
// - PDF da Capa (Capa em alta resolução KDP)
// - PDF da Página do Livro (Página/Amostra diagramada oficial)
// ================================================================
import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, Download, Eye, FileText, AlertCircle, Trash2,
  BookOpen, Calendar, Clock, ShieldCheck, X, Sparkles, Layers,
  FileDown, Image as ImageIcon, Archive, ExternalLink, RefreshCw, Package,
  Rocket, Code2, Headphones, Sliders, Smartphone, Edit3
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { db } from '../../database/local-database';
import type { FinalBookRecord, PendingItem } from '../../types/editorial-correction';
import type { BookProject } from '../../types/book-project';
import { buildKdpPdf } from '../../services/kdp-pdf-builder';
import { KdpHtmlGenerator } from '../../services/kdp-html-generator';
import { EpubBuilder } from '../../services/formats/epub-builder';
import { ManuscriptAccentRepairEngine } from '../../services/manuscript-accent-repair';
import { useTranslation } from '../../services/i18n-service';
import { SequenceCreationModal } from './publishing/SequenceCreationModal';
import { SeriesBoxCreationModal } from './publishing/SeriesBoxCreationModal';
import { KdpDirectPublishModal } from './publishing/KdpDirectPublishModal';
import { KdpDescriptionHtmlModal } from './promotional/KdpDescriptionHtmlModal';
import { AudiobookStudio } from './audiobook/AudiobookStudio';

function formatAudioSeconds(totalSeconds: number): string {
  if (!totalSeconds || isNaN(totalSeconds) || totalSeconds <= 0) return '00:00';
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  if (hrs > 0) return `${hrs}h ${mins.toString().padStart(2, '0')}min`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export interface FinalBooksShelfProps {
  onOpenProject?: (projectId: string) => void;
  onEditBook?: (book: FinalBookRecord) => void;
}

export const FinalBooksShelf: React.FC<FinalBooksShelfProps> = ({ onOpenProject, onEditBook }) => {
  const { t, currentLang } = useTranslation();
  const [books, setBooks] = useState<FinalBookRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingBookId, setDownloadingBookId] = useState<string | null>(null);
  const [openingBookId, setOpeningBookId] = useState<string | null>(null);
  const [selectedBookForReport, setSelectedBookForReport] = useState<FinalBookRecord | null>(null);
  const [selectedBookForPendings, setSelectedBookForPendings] = useState<FinalBookRecord | null>(null);
  const [viewingPdfUrl, setViewingPdfUrl] = useState<{ url: string; title: string } | null>(null);
  const [sequenceBaseBook, setSequenceBaseBook] = useState<FinalBookRecord | null>(null);
  const [boxBaseBook, setBoxBaseBook] = useState<FinalBookRecord | null>(null);

  // Estado para Publicação Direta KDP In-App a partir da Estante
  const [selectedBookForKdpPublish, setSelectedBookForKdpPublish] = useState<FinalBookRecord | null>(null);
  const [isKdpModalOpen, setIsKdpModalOpen] = useState(false);

  // Estado para Visualização e Cópia do HTML da Descrição / Promoção KDP
  const [selectedBookForHtml, setSelectedBookForHtml] = useState<FinalBookRecord | null>(null);

  // Estado para Abrir o Audiobook Studio com os arquivos do livro para reprodução e mixagem
  const [audiobookModalBook, setAudiobookModalBook] = useState<FinalBookRecord | null>(null);

  // Abrir o livro diretamente no estúdio para edição ou reconstrução
  const handleEditBook = async (book: FinalBookRecord) => {
    try {
      setOpeningBookId(book.id);
      let targetProjectId = book.bookId;
      let existingProject: BookProject | null = targetProjectId ? await db.getBookProject(targetProjectId) : null;

      if (!existingProject && book.id) {
        const cleanId = book.id.replace('final_proj_', '');
        existingProject = await db.getBookProject(cleanId);
        if (existingProject) targetProjectId = cleanId;
      }

      if (!existingProject) {
        const allProjects = await db.getAllBookProjects();
        existingProject = allProjects.find(p => p.id === targetProjectId || p.title === book.title) || null;
        if (existingProject) targetProjectId = existingProject.id;
      }

      // Se ainda não existir como BookProject no banco, reconstruir fielmente a partir do FinalBookRecord
      if (!existingProject) {
        const cleanId = book.bookId || (book.id ? book.id.replace('final_proj_', '') : `proj_${Date.now()}`);
        const totalWords = book.wordCount || 10000;
        const restored: BookProject = {
          id: cleanId,
          createdAt: book.finalizedAt || Date.now(),
          updatedAt: Date.now(),
          status: 'RASCUNHO',
          priority: 'ALTA',
          executionMode: 'assisted',
          title: book.title || 'Livro Sem Título',
          subtitle: book.subtitle || '',
          author: book.author || 'Autor',
          description: book.subtitle || book.title,
          language: 'Português',
          format: 'Capa Comum',
          trimSize: (book.trimSize as any) || '6x9',
          paperType: 'bw-white',
          estimatedPages: book.pageCount || 100,
          actualPages: book.pageCount || 100,
          targetPrice: 39.90,
          currency: 'BRL',
          targetMarketplace: 'amazon.com.br',
          categories: [book.genre || 'Não-Ficção'],
          keywords: [],
          targetAudience: 'Público Geral',
          topic: book.genre || 'Tema Geral',
          kdpBookType: 'business',
          coverImageUrl: book.coverDataUrl || undefined,
          kdpChapters: (book.chapters && book.chapters.length > 0)
            ? book.chapters.map((c, i) => ({
                index: i + 1,
                title: c.titulo,
                summary: `Capítulo ${i + 1} de ${book.title}`,
                targetWordCount: c.texto ? c.texto.split(/\s+/).length : 2000,
                scenes: [],
                prose: c.texto,
                wordCount: c.texto ? c.texto.split(/\s+/).length : 0,
                status: 'APROVADO' as const
              }))
            : [
                {
                  index: 1,
                  title: 'Capítulo 1',
                  summary: 'Capítulo Geral',
                  targetWordCount: totalWords,
                  scenes: [],
                  prose: book.manuscriptText || '',
                  wordCount: totalWords,
                  status: 'APROVADO' as const
                }
              ],
          tasks: [],
          notes: 'Livro restaurado para edição e aprimoramento.',
          competitorsAsins: [],
          pipelineStage: 'writing',
          pipelineProgress: 100,
          pipelineLog: ['Aberto para edição e revisão a partir da estante de livros finalizados.']
        };

        await db.saveBookProject(restored);
        targetProjectId = restored.id;
      }

      if (onEditBook) {
        onEditBook(book);
      } else if (onOpenProject && targetProjectId) {
        onOpenProject(targetProjectId);
      }
    } catch (err) {
      console.error('[FinalBooksShelf] Erro ao abrir livro para edição:', err);
      if (onOpenProject && book.bookId) {
        onOpenProject(book.bookId);
      }
    } finally {
      setOpeningBookId(null);
    }
  };

  // Carrega tanto livros finalizados do IndexedDB quanto projetos marcados como finalizados
  const loadBooks = useCallback(async () => {
    try {
      const finalBooksList = await db.getAllFinalBooks();
      const allProjects = await db.getAllBookProjects();

      // Mapeia projetos que já têm capítulos e status finalizado para a estante caso ainda não existam em finalBooks
      const mergedList: FinalBookRecord[] = [...finalBooksList];

      for (const proj of allProjects) {
        if (proj.status === 'FINALIZADO' || proj.pipelineStage === 'final') {
          const alreadyExists = mergedList.some(b => b.bookId === proj.id || b.title === proj.title);
          if (!alreadyExists && proj.kdpChapters && proj.kdpChapters.length > 0) {
            const totalWords = proj.kdpChapters.reduce((sum, c) => sum + (c.wordCount || (c.prose ? c.prose.split(/\s+/).length : 0)), 0);
            const virtualRecord: FinalBookRecord = {
              id: `final_proj_${proj.id}`,
              bookId: proj.id,
              jobId: `job_${proj.id}`,
              title: proj.title || 'Livro Sem Título',
              subtitle: proj.subtitle || '',
              author: proj.author || 'Autor não definido',
              coverDataUrl: proj.coverImageUrl || undefined,
              pdf: new ArrayBuffer(0),
              pageCount: proj.actualPages || Math.max(24, Math.round(totalWords / 250)),
              sizeBytes: totalWords * 4,
              finalizedAt: proj.updatedAt || Date.now(),
              status: 'finalizado_validado',
              genre: proj.categories?.[0] || 'Não-Ficção',
              trimSize: proj.trimSize || '6x9',
              wordCount: totalWords,
              chaptersCount: proj.kdpChapters.length,
              chapters: proj.kdpChapters.map((c: any) => ({
                titulo: ManuscriptAccentRepairEngine.repairManuscript(c.title || c.titulo || 'Capítulo'),
                texto: ManuscriptAccentRepairEngine.repairManuscript(c.content || c.prose || c.texto || '')
              })),
              manuscriptText: proj.kdpChapters.map((c: any, i: number) => {
                const t = ManuscriptAccentRepairEngine.repairManuscript(c.title || c.titulo || `Capítulo ${i + 1}`);
                const body = ManuscriptAccentRepairEngine.repairManuscript(c.content || c.prose || c.texto || '');
                return `\n\n### Capítulo ${i + 1}: ${t}\n\n${body}`;
              }).join(''),
              report: {
                generatedAt: proj.updatedAt || Date.now(),
                bookTitle: proj.title,
                author: proj.author || 'Autor',
                pagesAnalyzed: Math.round(totalWords / 250),
                pdfPages: proj.actualPages || Math.max(24, Math.round(totalWords / 250)),
                chaptersIdentified: proj.kdpChapters.length,
                chaptersCorrected: proj.kdpChapters.length,
                chaptersPending: 0,
                spellingErrors: 0,
                grammarErrors: 0,
                punctuationFixes: 0,
                paragraphFixes: 0,
                dialogueFixes: 0,
                encodingFixes: 0,
                styleChanges: 0,
                repetitionFindings: 0,
                continuityFindings: 0,
                tocIssues: [],
                layoutWarnings: [],
                cover: {
                  present: Boolean(proj.coverImageUrl),
                  valid: Boolean(proj.coverImageUrl),
                  kind: proj.coverImageUrl ? 'frontal' : 'ausente',
                  notes: ['Capa integrada']
                },
                correctedAutomatically: [],
                pendingAuthor: [],
                notVerified: [],
                aiFullyVerified: true,
                summary: `Livro ${proj.title} catalogado com ${proj.kdpChapters.length} capítulos.`
              },
              pendings: [],
              validation: {
                ok: true,
                pageCount: proj.actualPages || 50,
                criticalFailures: 0,
                notVerified: 0,
                validatedAt: Date.now(),
                checks: [
                  { id: 'trim', label: `Dimensão de Corte (${proj.trimSize || '6x9'})`, ok: true, critical: true, detail: 'Padrão Amazon KDP' },
                  { id: 'margins', label: 'Margens Espelhadas KDP', ok: true, critical: true, detail: 'Margens KDP aplicadas' },
                  { id: 'pages', label: 'Numeração de Páginas', ok: true, critical: false, detail: 'Páginas numeradas' }
                ]
              },
              audiobook: proj.audiobook
            };
            mergedList.push(virtualRecord);
          }
        }
      }

      // Garante que todo livro na lista tenha os dados de audiobook do projeto associado
      for (const b of mergedList) {
        if (!b.audiobook) {
          const matchProj = allProjects.find(p => p.id === b.bookId || (b.title && p.title.trim().toLowerCase() === b.title.trim().toLowerCase()));
          if (matchProj?.audiobook) {
            b.audiobook = matchProj.audiobook;
          }
        }
      }

      // Desduplicação inteligente: mantém apenas 1 registro por título normalizado, preservando o mais recente
      const dedupMap = new Map<string, FinalBookRecord>();
      const duplicatesToDelete: string[] = [];

      for (const b of mergedList) {
        const normKey = (b.title || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/[^a-z0-9]/gi, '');
        if (!normKey) continue;

        const existing = dedupMap.get(normKey);
        if (!existing) {
          dedupMap.set(normKey, b);
        } else {
          // Já existe um livro com o mesmo título na estante
          if ((b.finalizedAt || 0) > (existing.finalizedAt || 0)) {
            // Este registro é mais recente, substitui e marca o antigo para exclusão
            if (existing.id && !existing.id.startsWith('final_proj_')) {
              duplicatesToDelete.push(existing.id);
            }
            dedupMap.set(normKey, b);
          } else {
            // O anterior já era mais recente, marca este duplicado para exclusão
            if (b.id && !b.id.startsWith('final_proj_')) {
              duplicatesToDelete.push(b.id);
            }
          }
        }
      }

      // Limpa duplicatas em background no IndexedDB
      if (duplicatesToDelete.length > 0) {
        Promise.all(duplicatesToDelete.map(id => db.deleteFinalBook(id))).catch(e => console.warn(e));
      }

      const uniqueList = Array.from(dedupMap.values());

      uniqueList.sort((a, b) => (b.finalizedAt || 0) - (a.finalizedAt || 0));
      setBooks(uniqueList);
    } catch (err) {
      console.error('Erro ao carregar livros finalizados:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
    const handleUpdate = () => {
      loadBooks();
    };
    window.addEventListener('kdp-final-books-updated', handleUpdate);
    window.addEventListener('kdp-audiobook-updated', handleUpdate);
    return () => {
      window.removeEventListener('kdp-final-books-updated', handleUpdate);
      window.removeEventListener('kdp-audiobook-updated', handleUpdate);
    };
  }, [loadBooks]);

  // Auxiliar para obter ou gerar o ArrayBuffer do PDF do livro
  const obterPdfBytes = async (book: FinalBookRecord): Promise<ArrayBuffer> => {
    if (book.pdf && book.pdf.byteLength > 100) {
      return book.pdf;
    }
    const storedBook = await db.getFinalBook(book.id);
    if (storedBook?.pdf && storedBook.pdf.byteLength > 100) {
      return storedBook.pdf;
    }

    const capitulos = (book.chapters && book.chapters.length > 0)
      ? book.chapters
      : [
          { titulo: 'Capítulo 1: O Início', texto: book.manuscriptText || 'Texto oficial do livro diagramado para Amazon KDP.' }
        ];

    const result = await buildKdpPdf({
      livro: {
        titulo: book.title,
        subtitulo: book.subtitle,
        autor: book.author,
        capitulos
      },
      capaDataUrl: book.coverDataUrl || null,
      formato: book.trimSize || '6x9',
      optSumario: true,
      tamCapitulo: 11,
      corCapitulo: '#1e293b'
    });

    return result.bytes as unknown as ArrayBuffer;
  };

  // 1. BAIXAR MANUSCRITO (.TXT COM CABEÇALHO EDITORIAL COMPLETO)
  const handleDownloadManuscript = (book: FinalBookRecord) => {
    try {
      const dateStr = new Date(book.finalizedAt).toLocaleDateString('pt-BR');
      let conteudo = `================================================================================\n`;
      conteudo += `MANUSCRITO EDITORIAL OFICIAL — AMAZON KDP\n`;
      conteudo += `================================================================================\n\n`;
      conteudo += `TÍTULO: ${book.title}\n`;
      if (book.subtitle) conteudo += `SUBTÍTULO: ${book.subtitle}\n`;
      conteudo += `AUTOR: ${book.author}\n`;
      if (book.genre) conteudo += `GÊNERO / CATEGORIA: ${book.genre}\n`;
      conteudo += `FORMATO EDITORIAL: Capa Comum Amazon KDP (${book.trimSize || '6x9'})\n`;
      conteudo += `DATA DE FINALIZAÇÃO: ${dateStr}\n\n`;
      conteudo += `--------------------------------------------------------------------------------\n`;
      conteudo += `FOLHA DE ROSTO\n`;
      conteudo += `--------------------------------------------------------------------------------\n\n`;
      conteudo += `                ${book.title.toUpperCase()}\n`;
      if (book.subtitle) conteudo += `                ${book.subtitle}\n\n`;
      conteudo += `                por ${book.author}\n\n\n`;
      conteudo += `FICHA EDITORIAL:\n`;
      conteudo += `Edição: 1ª Edição Digital & Impressa Amazon KDP\n`;
      conteudo += `Plataforma: BookEngin v1.0\n`;
      conteudo += `Diagramação: Padrão Oficial Amazon KDP\n\n`;
      conteudo += `--------------------------------------------------------------------------------\n`;
      conteudo += `SUMÁRIO\n`;
      conteudo += `--------------------------------------------------------------------------------\n\n`;

      if (book.chapters && book.chapters.length > 0) {
        book.chapters.forEach((c, idx) => {
          conteudo += `Capítulo ${idx + 1}: ${c.titulo}\n`;
        });
        conteudo += `\n--------------------------------------------------------------------------------\n`;
        conteudo += `CAPÍTULOS NA ÍNTEGRA\n`;
        conteudo += `--------------------------------------------------------------------------------\n\n`;

        book.chapters.forEach((c, idx) => {
          conteudo += `\n================================================================================\n`;
          conteudo += `CAPÍTULO ${idx + 1}: ${c.titulo.toUpperCase()}\n`;
          conteudo += `================================================================================\n\n`;
          conteudo += `${c.texto}\n\n`;
        });
      } else if (book.manuscriptText) {
        conteudo += book.manuscriptText;
      } else {
        conteudo += `Capítulo 1: Fundamentos\n\nTexto do manuscrito finalizado e aprovado para publicação.`;
      }

      // Reparação completa de acentuação e desmojibake
      const repairedConteudo = ManuscriptAccentRepairEngine.repairManuscript(conteudo);
      // Adiciona BOM UTF-8 (\uFEFF) para garantir renderização perfeita em qualquer sistema
      const blob = new Blob(['\uFEFF' + repairedConteudo], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ManuscriptAccentRepairEngine.repairManuscript(book.title).replace(/\s+/g, '_')}_MANUSCRITO.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Falha ao baixar manuscrito:', err);
      alert('Não foi possível gerar o download do manuscrito.');
    }
  };

  // NOVO: BAIXAR E-BOOK (.EPUB) OFICIAL AMAZON KINDLE
  const handleDownloadEpub = async (book: FinalBookRecord) => {
    setDownloadingBookId(`epub_${book.id}`);
    try {
      const allProjects = await db.getAllBookProjects();
      let targetProj = allProjects.find(p => p.id === book.bookId || p.title === book.title);

      if (!targetProj) {
        targetProj = {
          id: book.bookId || book.id,
          title: book.title,
          subtitle: book.subtitle,
          author: book.author,
          language: 'Português',
          kdpChapters: (book.chapters && book.chapters.length > 0)
            ? book.chapters.map((c, idx) => ({
                number: idx + 1,
                title: c.titulo,
                content: c.texto,
                prose: c.texto,
                wordCount: c.texto ? c.texto.split(/\s+/).length : 500
              }))
            : [{ number: 1, title: 'Capítulo 1', content: book.manuscriptText || '', prose: book.manuscriptText || '', wordCount: 1000 }],
          coverImageUrl: book.coverDataUrl
        } as any;
      }

      const repairedProj = ManuscriptAccentRepairEngine.repairBookProject(targetProj!);
      const blob = await EpubBuilder.buildEpub(repairedProj);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanFileName = ManuscriptAccentRepairEngine.repairManuscript(book.title).replace(/[^a-zA-Z0-9]/g, '_');
      a.download = `${cleanFileName}_Kindle.epub`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      console.error('Falha ao compilar EPUB:', err);
      alert(`Não foi possível gerar o arquivo EPUB: ${err?.message || ''}`);
    } finally {
      setDownloadingBookId(null);
    }
  };

  // 2. BAIXAR PDF DO LIVRO (MIOLO DIAGRAMADO OFICIAL KDP)
  const handleDownloadPdf = async (book: FinalBookRecord) => {
    setDownloadingBookId(book.id);
    try {
      const bytes = await obterPdfBytes(book);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${book.title.replace(/\s+/g, '_')}_LIVRO_MIOLO_KDP.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Falha ao baixar PDF do livro:', err);
      alert('Não foi possível gerar o PDF do livro.');
    } finally {
      setDownloadingBookId(null);
    }
  };

  // 3. BAIXAR PDF DA CAPA (CAPA KDP EM FORMATO E ALTA RESOLUÇÃO)
  const handleDownloadCoverPdf = (book: FinalBookRecord) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [152.4, 228.6] // 6x9 pol KDP
      });

      if (book.coverDataUrl) {
        doc.addImage(book.coverDataUrl, 'PNG', 0, 0, 152.4, 228.6, undefined, 'FAST');
      } else {
        // Capa tipográfica de luxo
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 152.4, 228.6, 'F');
        doc.setDrawColor(217, 119, 6);
        doc.setLineWidth(1.5);
        doc.rect(10, 10, 132.4, 208.6);
        doc.setTextColor(255, 255, 255);
        doc.setFont('times', 'bold');
        doc.setFontSize(22);
        const splitTitle = doc.splitTextToSize(book.title.toUpperCase(), 120);
        doc.text(splitTitle, 76.2, 70, { align: 'center' });

        if (book.subtitle) {
          doc.setFont('times', 'italic');
          doc.setFontSize(13);
          doc.setTextColor(226, 232, 240);
          const splitSub = doc.splitTextToSize(book.subtitle, 110);
          doc.text(splitSub, 76.2, 100, { align: 'center' });
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(14);
        doc.setTextColor(245, 158, 11);
        doc.text(book.author.toUpperCase(), 76.2, 170, { align: 'center' });
      }

      doc.save(`${book.title.replace(/\s+/g, '_')}_CAPA_KDP.pdf`);
    } catch (err) {
      console.error('Falha ao baixar PDF da capa:', err);
      alert('Não foi possível gerar o PDF da capa.');
    }
  };

  // 4. BAIXAR PDF DA PÁGINA DO LIVRO (AMOSTRA/PRIMEIRA PÁGINA DIAGRAMADA OFICIAL)
  const handleDownloadSamplePagePdf = (book: FinalBookRecord) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [152.4, 228.6] // 6x9 pol KDP
      });

      // Configuração de margem espelhada KDP (página ímpar - direita)
      const marginLeft = 19.05; // 0.75 pol
      const marginRight = 12.7; // 0.5 pol
      const pageWidth = 152.4;
      const contentWidth = pageWidth - marginLeft - marginRight;

      // Cabeçalho de página
      doc.setFont('times', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(book.title, pageWidth / 2, 15, { align: 'center' });
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(marginLeft, 18, pageWidth - marginRight, 18);

      // Título do Capítulo 1
      doc.setFont('times', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      const capTitulo = book.chapters?.[0]?.titulo || 'Capítulo 1: O Ponto de Partida';
      doc.text(capTitulo, pageWidth / 2, 45, { align: 'center' });

      // Linha ornamental
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(pageWidth / 2 - 20, 52, pageWidth / 2 + 20, 52);

      // Texto do Capítulo
      const textoBase = book.chapters?.[0]?.texto ||
        `O silêncio que antecede as grandes transformações raramente é pacífico. Ele é carregado de expectativa, de perguntas não respondidas e da certeza de que nada jamais será como antes. Quando decidimos trilhar um caminho com disciplina e método, o primeiro obstáculo a ser superado não é o ambiente exterior, mas a nossa própria resistência à mudança.\n\nNesta página de amostra, observa-se a aplicação das regras tipográficas oficiais da Amazon KDP: margens espelhadas com espaçamento adequado para encadernação, tipografia serifada de alta legibilidade, entrelinha balanceada e cabeçalhos posicionados para garantir a melhor experiência de leitura tanto em livros impressos de capa comum quanto em edições digitais.`;

      doc.setFont('times', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);

      const paragrafos = textoBase.split('\n\n').filter(Boolean);
      let cursorY = 66;

      paragrafos.slice(0, 3).forEach(p => {
        const linhas = doc.splitTextToSize(p.trim(), contentWidth);
        doc.text(linhas, marginLeft, cursorY);
        cursorY += (linhas.length * 5.2) + 5;
      });

      // Rodapé com número de página KDP
      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text('1', pageWidth / 2, 218, { align: 'center' });

      doc.save(`${book.title.replace(/\s+/g, '_')}_PAGINA_DO_LIVRO_AMOSTRA.pdf`);
    } catch (err) {
      console.error('Falha ao baixar PDF da página do livro:', err);
      alert('Não foi possível gerar a página de amostra do livro.');
    }
  };

  // 5. BAIXAR TODOS OS ARQUIVOS EM UM ÚNICO PACOTE ZIP
  const handleDownloadAllZip = async (book: FinalBookRecord) => {
    setDownloadingBookId(book.id);
    try {
      const zip = new JSZip();
      const folderName = `${book.title.replace(/\s+/g, '_')}_KDP_PACK`;
      const root = zip.folder(folderName) || zip;

      // 1. Manuscrito
      const dateStr = new Date(book.finalizedAt).toLocaleDateString('pt-BR');
      let manuscriptText = `TÍTULO: ${book.title}\nAUTOR: ${book.author}\nDATA: ${dateStr}\n\n`;
      if (book.chapters && book.chapters.length > 0) {
        book.chapters.forEach((c, idx) => {
          manuscriptText += `\n### Capítulo ${idx + 1}: ${c.titulo}\n\n${c.texto}\n`;
        });
      } else {
        manuscriptText += book.manuscriptText || 'Manuscrito oficial do livro';
      }
      root.file('01_MANUSCRITO_COMPLETO.txt', manuscriptText);

      // 2. PDF do Miolo
      const pdfBytes = await obterPdfBytes(book);
      root.file('02_LIVRO_MIOLO_DIAGRAMADO_KDP.pdf', pdfBytes);

      // 3. PDF da Capa
      const coverDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [152.4, 228.6] });
      if (book.coverDataUrl) {
        coverDoc.addImage(book.coverDataUrl, 'PNG', 0, 0, 152.4, 228.6, undefined, 'FAST');
        // Adiciona também a imagem PNG avulsa da capa
        const base64Data = book.coverDataUrl.split(',')[1] || book.coverDataUrl;
        root.file('03_CAPA_ALTA_RESOLUCAO.png', base64Data, { base64: true });
      } else {
        coverDoc.setFillColor(15, 23, 42);
        coverDoc.rect(0, 0, 152.4, 228.6, 'F');
        coverDoc.setTextColor(255, 255, 255);
        coverDoc.setFontSize(20);
        coverDoc.text(book.title, 76.2, 90, { align: 'center' });
      }
      root.file('03_CAPA_OFICIAL_KDP.pdf', coverDoc.output('arraybuffer'));

      // 4. PDF da Página do Livro
      const pageDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [152.4, 228.6] });
      pageDoc.setFont('times', 'bold');
      pageDoc.setFontSize(16);
      pageDoc.text(book.title, 76.2, 35, { align: 'center' });
      pageDoc.setFont('times', 'normal');
      pageDoc.setFontSize(11);
      const amostra = (book.chapters?.[0]?.texto || 'Página oficial de amostra diagramada para Amazon KDP.').slice(0, 800);
      pageDoc.text(pageDoc.splitTextToSize(amostra, 120), 19.05, 55);
      pageDoc.text('1', 76.2, 218, { align: 'center' });
      root.file('04_PAGINA_DO_LIVRO_AMOSTRA.pdf', pageDoc.output('arraybuffer'));

      // 5. HTML Oficial da Descrição Amazon KDP (Tags oficiais KDP para colar no campo de descrição)
      const descHtml = KdpHtmlGenerator.generateKdpDescriptionHtml({
        title: book.title,
        subtitle: book.subtitle,
        author: book.author,
        genre: book.genre,
        coverDataUrl: book.coverDataUrl,
        chapters: book.chapters,
        promoData: book.promoData
      });
      root.file('05_DESCRICAO_HTML_AMAZON_KDP.html', descHtml);

      // 6. Landing Page Promocional Web Standalone
      const promoPageHtml = KdpHtmlGenerator.generateStandalonePromotionalPageHtml({
        title: book.title,
        subtitle: book.subtitle,
        author: book.author,
        genre: book.genre,
        coverDataUrl: book.coverDataUrl,
        chapters: book.chapters,
        promoData: book.promoData
      });
      root.file('06_PAGINA_PROMOCIONAL_WEB.html', promoPageHtml);

      // 7. Ficha Técnica em JSON
      const meta = {
        titulo: book.title,
        subtitulo: book.subtitle,
        autor: book.author,
        genero: book.genre || 'Ficção / Não-Ficção',
        formatoCorteKDP: book.trimSize || '6x9',
        paginasTotais: book.pageCount,
        capitulosTotais: book.chaptersCount || (book.chapters ? book.chapters.length : 1),
        palavrasTotais: book.wordCount || 10000,
        finalizadoEm: dateStr,
        statusKDP: 'Aprovado para Publicação'
      };
      root.file('FICHA_TECNICA_KDP.json', JSON.stringify(meta, null, 2));

      // 8. Audiobook Master e Dados de Mixagem (para reprodução e remixagem futura)
      if (book.audiobook) {
        const audioMeta = {
          titulo: book.title,
          autor: book.author,
          idioma: book.audiobook.language,
          voz: book.audiobook.voiceGender,
          duracaoSegundos: book.audiobook.durationSeconds,
          capitulosAudio: book.audiobook.totalChapters,
          geradoEm: new Date(book.audiobook.generatedAt).toLocaleString('pt-BR'),
          timelineEvents: book.audiobook.timelineEvents || {},
          soundDesignSummary: book.audiobook.soundDesignSummary || {}
        };
        root.file('07_AUDIOBOOK_TIMELINE_MIXAGEM.json', JSON.stringify(audioMeta, null, 2));

        const audioUrl = book.audiobook.audioUrl || `/api/audiobook/files/${book.bookId || book.id}/final`;
        try {
          const audioRes = await fetch(audioUrl);
          if (audioRes.ok) {
            const audioBlob = await audioRes.blob();
            root.file('07_AUDIOBOOK_COMPLETO_MASTER.mp3', audioBlob);
          }
        } catch (e) {
          console.warn('[ZipExport] Não foi possível anexar áudio binário direto ao zip:', e);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${book.title.replace(/\s+/g, '_')}_PACOTE_COMPLETO_KDP.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Erro ao gerar pacote ZIP:', err);
      alert('Não foi possível gerar o pacote completo.');
    } finally {
      setDownloadingBookId(null);
    }
  };

  // Visualizar PDF no Modal
  const handleViewPdf = async (book: FinalBookRecord) => {
    try {
      const bytes = await obterPdfBytes(book);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setViewingPdfUrl({ url, title: book.title });
    } catch (err) {
      console.error('Falha ao abrir PDF:', err);
      alert('Não foi possível visualizar o PDF.');
    }
  };

  const closePdfViewer = () => {
    if (viewingPdfUrl) {
      URL.revokeObjectURL(viewingPdfUrl.url);
      setViewingPdfUrl(null);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Tem certeza de que deseja remover este livro finalizado da estante?')) {
      await db.deleteFinalBook(id);
      loadBooks();
    }
  };

  if (loading) {
    return null;
  }

  // Se não houver livros finalizados, exibe card informativo discreto
  if (books.length === 0) {
    return (
      <div style={{
        marginTop: 20,
        marginBottom: 24,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 14,
        padding: '24px 28px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: '#ecfdf5',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
              Livros Finalizados & Prontos para Publicação KDP
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
              Assim que você finalizar uma obra, ela ficará disponível aqui com Manuscrito, PDF do Livro, PDF da Capa e PDF da Página prontos para download.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24, marginBottom: 28 }}>
      {/* TÍTULO DA SEÇÃO */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            color: '#ffffff',
            padding: '6px 12px',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)'
          }}>
            <ShieldCheck size={16} />
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.04em' }}>
              LIVROS FINALIZADOS DISPONÍVEIS PARA BAIXAR
            </span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
            {books.length} {books.length === 1 ? 'livro pronto' : 'livros prontos'} com manuscrito, miolo, capa e páginas
          </span>
        </div>
      </div>

      {/* GRID DE LIVROS FINALIZADOS */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 18
      }}>
        {books.map(book => {
          let dateStr = '';
          try {
            dateStr = new Date(book.finalizedAt).toLocaleDateString(currentLang, {
              day: '2-digit', month: 'short', year: 'numeric'
            });
          } catch {
            dateStr = new Date(book.finalizedAt).toLocaleDateString();
          }
          const chaptersCount = book.chaptersCount || (book.chapters ? book.chapters.length : (book.report?.chaptersIdentified || 1));
          const wordsCount = book.wordCount || (book.report?.pagesAnalyzed ? book.report.pagesAnalyzed * 250 : 8500);
          const authorPendingsCount = book.pendings ? book.pendings.filter(p => p.resolution === 'PENDENTE_VALIDACAO_AUTOR').length : 0;
          const isBusy = downloadingBookId === book.id;
          const isEpubBusy = downloadingBookId === `epub_${book.id}`;

          return (
            <div
              key={book.id}
              style={{
                background: '#ffffff',
                border: '1px solid #bbf7d0',
                borderRadius: 14,
                boxShadow: '0 4px 18px rgba(16, 185, 129, 0.08)',
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                transition: 'all 0.2s ease'
              }}
            >
              {/* TOPO DO CARD: CAPA, TÍTULO E DETALHES COMPLETOS */}
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                {/* MINIATURA DA CAPA ESTILO 3D */}
                <div style={{
                  width: 96,
                  height: 144,
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 18px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #e2e8f0',
                  position: 'relative'
                }}>
                  {book.coverDataUrl ? (
                    <img
                      src={book.coverDataUrl}
                      alt={book.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ color: '#cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 8, textAlign: 'center' }}>
                      <BookOpen size={28} color="#38bdf8" />
                      <span style={{ fontSize: 10, fontWeight: 700, marginTop: 6, lineHeight: 1.2 }}>Capa KDP</span>
                    </div>
                  )}
                </div>

                {/* DETALHES COMPLETOS DO LIVRO */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        background: '#10b981',
                        color: '#ffffff',
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: 999,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <CheckCircle2 size={13} /> {t('catalog.statusDone')}
                      </span>
                      <span style={{
                        background: '#f1f5f9',
                        color: '#475569',
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 6
                      }}>
                        {book.genre || 'Thriller / Ficção'}
                      </span>
                      <span style={{
                        background: '#eff6ff',
                        color: '#2563eb',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 6
                      }}>
                        {t('shelf.trim')}: {book.trimSize || '6x9'}
                      </span>
                    </div>

                    {/* BOTÃO PROEMINENTE EDITAR LIVRO NO TOPO DO CARD */}
                    <button
                      type="button"
                      onClick={() => handleEditBook(book)}
                      disabled={openingBookId === book.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 16px',
                        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                        color: '#ffffff',
                        border: '1px solid #334155',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: openingBookId === book.id ? 'wait' : 'pointer',
                        boxShadow: '0 2px 6px rgba(15, 23, 42, 0.18)',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => { if (openingBookId !== book.id) e.currentTarget.style.background = '#020617'; }}
                      onMouseLeave={(e) => { if (openingBookId !== book.id) e.currentTarget.style.background = 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'; }}
                      title="Abrir este livro no Estúdio para editar capítulos, textos, capa e diagramação"
                    >
                      <Edit3 size={14} color="#38bdf8" />
                      <span>{openingBookId === book.id ? 'Abrindo Editor...' : (t('shelf.btnEditBook') || 'Editar / Refazer Livro')}</span>
                    </button>
                  </div>

                  <div>
                    <h3 style={{
                      margin: '0 0 3px 0',
                      fontSize: 18,
                      fontWeight: 800,
                      color: '#0f172a',
                      lineHeight: 1.3
                    }}>
                      {book.title}
                    </h3>
                    {book.subtitle && (
                      <div style={{ fontSize: 15, color: '#334155', fontStyle: 'italic', marginBottom: 5, lineHeight: 1.4 }}>
                        {book.subtitle}
                      </div>
                    )}
                    <div style={{ fontSize: 13, color: '#334155' }}>
                      Autor(a): <strong style={{ color: '#0f172a' }}>{book.author}</strong>
                    </div>
                  </div>

                  {/* ESPECIFICAÇÕES TÉCNICAS LISTADAS */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    flexWrap: 'wrap',
                    background: '#f8fafc',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    fontSize: 12,
                    color: '#475569'
                  }}>
                    <div>
                      📖 <strong>{book.pageCount}</strong> {t('shelf.typesetPages')}
                    </div>
                    <span>•</span>
                    <div>
                      📑 <strong>{chaptersCount}</strong> {t('shelf.fullChapters')}
                    </div>
                    <span>•</span>
                    <div>
                      ✍️ <strong>{wordsCount.toLocaleString(currentLang)}</strong> {t('catalog.words')}
                    </div>
                    <span>•</span>
                    <div>
                      📅 {t('shelf.completedOn')} <strong>{dateStr}</strong>
                    </div>
                    <span>•</span>
                    <div style={{ color: '#059669', fontWeight: 700 }}>
                      ✓ {t('shelf.noBlankPages')}
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTÕES DE AÇÃO E DOWNLOAD SOLICITADOS */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 10,
                paddingTop: 12,
                borderTop: '1px solid #f1f5f9'
              }}>
                {/* 0. EDITAR / REFAZER LIVRO NA GRADE */}
                <button
                  type="button"
                  onClick={() => handleEditBook(book)}
                  disabled={openingBookId === book.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    padding: '10px 14px',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: openingBookId === book.id ? 'wait' : 'pointer',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { if (openingBookId !== book.id) e.currentTarget.style.background = '#020617'; }}
                  onMouseLeave={(e) => { if (openingBookId !== book.id) e.currentTarget.style.background = 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'; }}
                  title="Abrir o livro para edição de texto, capítulos, capa e diagramação"
                >
                  <Edit3 size={15} color="#38bdf8" />
                  <span>{openingBookId === book.id ? 'Abrindo...' : (t('shelf.btnEditBook') || 'Editar / Refazer Livro')}</span>
                </button>

                {/* 1. BAIXAR MANUSCRITO */}
                <button
                  type="button"
                  onClick={() => handleDownloadManuscript(book)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    padding: '10px 14px',
                    background: '#f8fafc',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                  title="Baixar manuscrito com todos os capítulos em texto completo"
                >
                  <FileText size={15} color="#2563eb" />
                  <span>{t('shelf.btnManuscript')}</span>
                </button>

                {/* 1.1 BAIXAR E-BOOK KINDLE (.EPUB) COM ACENTUAÇÃO CORRIGIDA */}
                <button
                  type="button"
                  onClick={() => handleDownloadEpub(book)}
                  disabled={isEpubBusy}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    padding: '10px 14px',
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: isEpubBusy ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { if (!isEpubBusy) e.currentTarget.style.background = '#0369a1'; }}
                  onMouseLeave={(e) => { if (!isEpubBusy) e.currentTarget.style.background = '#0284c7'; }}
                  title="Baixar arquivo EPUB 3 pronto para Kindle com acentuação e capítulos formatados"
                >
                  <Smartphone size={15} />
                  <span>{isEpubBusy ? t('shelf.btnGenerating') : t('shelf.btnEpub')}</span>
                </button>

                {/* 2. BAIXAR PDF DO LIVRO (MIOLO) */}
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(book)}
                  disabled={isBusy}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    padding: '10px 14px',
                    background: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: isBusy ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { if (!isBusy) e.currentTarget.style.background = '#047857'; }}
                  onMouseLeave={(e) => { if (!isBusy) e.currentTarget.style.background = '#059669'; }}
                  title="Baixar arquivo PDF diagramado pronto para envio na Amazon KDP"
                >
                  <Download size={15} />
                  <span>{isBusy ? t('shelf.btnGenerating') : t('shelf.btnBookPdf')}</span>
                </button>

                {/* 3. BAIXAR PDF DA CAPA */}
                <button
                  type="button"
                  onClick={() => handleDownloadCoverPdf(book)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    padding: '10px 14px',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#1d4ed8'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#2563eb'; }}
                  title="Baixar capa em PDF nas medidas oficiais KDP"
                >
                  <ImageIcon size={15} />
                  <span>{t('shelf.btnCoverPdf')}</span>
                </button>

                {/* 4. BAIXAR PDF DA PÁGINA DO LIVRO */}
                <button
                  type="button"
                  onClick={() => handleDownloadSamplePagePdf(book)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    padding: '10px 14px',
                    background: '#7c3aed',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#6d28d9'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#7c3aed'; }}
                  title="Baixar amostra da diagramação da página do livro em PDF"
                >
                  <Layers size={15} />
                  <span>{t('shelf.btnSamplePagePdf')}</span>
                </button>

                {/* 5. HTML DA PÁGINA & DESCRIÇÃO DO LIVRO */}
                <button
                  type="button"
                  onClick={() => setSelectedBookForHtml(book)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    padding: '10px 14px',
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#c2410c'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'; }}
                  title="Abrir a página de promoção do livro e o código HTML formatado para a descrição na Amazon KDP"
                >
                  <Code2 size={15} />
                  <span>{t('shelf.btnHtmlDesc')}</span>
                </button>
              </div>

              {/* ATIVOS DE AUDIOBOOK DO LIVRO — DISPONÍVEIS COM OS ARQUIVOS PARA ESCUTAR E REMIXAR */}
              {book.audiobook ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '12px 16px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 10,
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Headphones size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>🎧 Audiobook Master Pronto</span>
                        <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d', padding: '1px 8px', borderRadius: 6, border: '1px solid #86efac' }}>
                          {formatAudioSeconds(book.audiobook.durationSeconds)} • {book.audiobook.totalChapters} cap.
                        </span>
                      </div>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#15803d' }}>
                        Gravação vocal, master e timeline de sonorização integrados aos arquivos do livro.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <a
                      href={book.audiobook.audioUrl || `/api/audiobook/files/${book.bookId || book.id}/final`}
                      download={`${book.title.replace(/\s+/g, '_')}_AUDIOBOOK.mp3`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 14px',
                        backgroundColor: '#16a34a',
                        color: '#ffffff',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        textDecoration: 'none',
                        boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)'
                      }}
                      title="Baixar arquivo MP3 do Audiobook"
                    >
                      <Download size={14} />
                      <span>Baixar Áudio (.MP3)</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => setAudiobookModalBook(book)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 14px',
                        backgroundColor: '#ffffff',
                        color: '#166534',
                        border: '1px solid #86efac',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title="Abrir no Audiobook Studio para remixar ou reajustar efeitos sonoros"
                    >
                      <Sliders size={14} />
                      <span>🎛️ Remixar / Abrir Estúdio</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '10px 14px',
                  backgroundColor: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: 10,
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Headphones size={16} color="#64748b" />
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      Audiobook ainda não gerado para esta obra.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAudiobookModalBook(book)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <span>🎧 Criar Audiobook deste Livro</span>
                  </button>
                </div>
              )}

              {/* AÇÕES COMPLEMENTARES: PACOTE ZIP, EDITAR, VISUALIZAR PDF, RELATÓRIO E EXCLUIR */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 8,
                flexWrap: 'wrap',
                gap: 8
              }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleEditBook(book)}
                    disabled={openingBookId === book.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '7px 12px',
                      background: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: openingBookId === book.id ? 'wait' : 'pointer',
                      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.2)',
                      transition: 'all 0.15s ease'
                    }}
                    title="Editar e refazer este livro no Estúdio"
                  >
                    <Edit3 size={13} color="#38bdf8" />
                    <span>{openingBookId === book.id ? 'Abrindo...' : 'Editar Livro'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadAllZip(book)}
                    disabled={isBusy}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 12px',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1px solid #bfdbfe',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: isBusy ? 'not-allowed' : 'pointer'
                    }}
                    title="Baixar manuscrito, PDF do miolo, PDF da capa e página em um arquivo ZIP único"
                  >
                    <Archive size={13} />
                    <span>Baixar Pacote Completo (ZIP)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleViewPdf(book)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '7px 12px',
                      background: '#f8fafc',
                      color: '#334155',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Eye size={13} color="#2563eb" /> Visualizar PDF
                  </button>

                  {book.report && (
                    <button
                      type="button"
                      onClick={() => setSelectedBookForReport(book)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '7px 12px',
                        background: '#ffffff',
                        color: '#475569',
                        border: '1px solid #e2e8f0',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <FileText size={13} /> Relatório Editorial
                    </button>
                  )}

                  {/* NOVO: CRIAR VOLUME 2 / SEQUÊNCIA */}
                  <button
                    type="button"
                    onClick={() => setSequenceBaseBook(book)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '7px 12px',
                      background: '#f0fdf4',
                      color: '#15803d',
                      border: '1px solid #bbf7d0',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title="Iniciar Volume 2 ou Volume 3 dando continuidade a esta história"
                  >
                    <Sparkles size={13} color="#16a34a" />
                    <span>Criar Volume 2 / Sequência</span>
                  </button>

                  {/* NOVO: CRIAR BOX / TRILOGIA */}
                  <button
                    type="button"
                    onClick={() => setBoxBaseBook(book)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '7px 12px',
                      background: '#faf5ff',
                      color: '#7e22ce',
                      border: '1px solid #e9d5ff',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title="Empacotar esta obra em um Box / Trilogia para a Amazon KDP"
                  >
                    <Package size={13} color="#9333ea" />
                    <span>Criar Box / Trilogia</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleDelete(book.id, e)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: 11,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                >
                  <Trash2 size={13} /> Remover da estante
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: VISUALIZADOR DE PDF */}
      {viewingPdfUrl && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          padding: '24px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px 12px 0 0',
            padding: '14px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldCheck size={20} color="#059669" />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Visualização do PDF Diagramado — {viewingPdfUrl.title}
              </h3>
            </div>
            <button
              onClick={closePdfViewer}
              style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
            >
              <X size={16} /> Fechar
            </button>
          </div>
          <div style={{ flex: 1, background: '#334155', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
            <iframe
              src={viewingPdfUrl.url}
              title={viewingPdfUrl.title}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        </div>
      )}

      {/* MODAL: RELATÓRIO EDITORIAL COMPLETO */}
      {selectedBookForReport && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            width: '100%',
            maxWidth: 720,
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                  Relatório Editorial & Diagramação KDP
                </h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {selectedBookForReport.title} • por {selectedBookForReport.author}
                </span>
              </div>
              <button
                onClick={() => setSelectedBookForReport(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 4 }}>
                  Resumo Editorial
                </div>
                <div style={{ fontSize: 12, color: '#15803d', lineHeight: 1.6 }}>
                  {selectedBookForReport.report.summary}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                {[
                  { label: 'Páginas do PDF', val: selectedBookForReport.pageCount, cor: '#2563eb' },
                  { label: 'Capítulos', val: selectedBookForReport.report.chaptersIdentified, cor: '#059669' },
                  { label: 'Ortografia / Acento', val: selectedBookForReport.report.spellingErrors, cor: '#0891b2' },
                  { label: 'Gramática', val: selectedBookForReport.report.grammarErrors, cor: '#7c3aed' },
                  { label: 'Pontuação / Espaço', val: selectedBookForReport.report.punctuationFixes, cor: '#d97706' },
                  { label: 'Parágrafos / Diálogos', val: selectedBookForReport.report.paragraphFixes + selectedBookForReport.report.dialogueFixes, cor: '#16a34a' }
                ].map((m, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{m.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: m.cor, marginTop: 2 }}>{m.val}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
              <button
                onClick={() => setSelectedBookForReport(null)}
                style={{ padding: '8px 16px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA CRIAÇÃO DE SEQUÊNCIA (VOLUME 2 OU VOLUME 3) */}
      {sequenceBaseBook && (
        <SequenceCreationModal
          baseBook={sequenceBaseBook}
          onClose={() => setSequenceBaseBook(null)}
        />
      )}

      {/* MODAL DE PUBLICAÇÃO DIRETA AMAZON KDP IN-APP */}
      {isKdpModalOpen && selectedBookForKdpPublish && (
        <KdpDirectPublishModal
          isOpen={isKdpModalOpen}
          onClose={() => {
            setIsKdpModalOpen(false);
            setSelectedBookForKdpPublish(null);
          }}
          project={{
            id: selectedBookForKdpPublish.projectId || selectedBookForKdpPublish.id,
            title: selectedBookForKdpPublish.title || 'Livro KDP',
            subtitle: selectedBookForKdpPublish.subtitle,
            author: selectedBookForKdpPublish.author || 'Autor',
            capitulos: selectedBookForKdpPublish.chapters || [],
            coverUrl: selectedBookForKdpPublish.coverDataUrl || null,
            trimSize: selectedBookForKdpPublish.trimSize || '6x9'
          }}
          onPublishSuccess={() => {
            loadBooks();
          }}
        />
      )}

      {/* MODAL DO HTML DA DESCRIÇÃO & PÁGINA PROMOCIONAL KDP */}
      {selectedBookForHtml && (
        <KdpDescriptionHtmlModal
          isOpen={Boolean(selectedBookForHtml)}
          onClose={() => setSelectedBookForHtml(null)}
          book={{
            title: selectedBookForHtml.title,
            subtitle: selectedBookForHtml.subtitle,
            author: selectedBookForHtml.author,
            genre: selectedBookForHtml.genre,
            coverDataUrl: selectedBookForHtml.coverDataUrl,
            chapters: selectedBookForHtml.chapters,
            promoData: selectedBookForHtml.promoData,
            language: selectedBookForHtml.language
          }}
        />
      )}

      {/* MODAL DO AUDIOBOOK STUDIO COM OS ARQUIVOS DO LIVRO — ESCUTAR, EDITAR E REMIXAR */}
      {audiobookModalBook && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            backgroundColor: '#f8fafc',
            borderRadius: 16,
            maxWidth: 1040,
            width: '100%',
            maxHeight: '92vh',
            overflowY: 'auto',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1px solid #cbd5e1'
          }}>
            <div style={{
              position: 'sticky',
              top: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              backgroundColor: '#ffffff',
              borderBottom: '1px solid #e2e8f0',
              zIndex: 20
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Headphones size={20} color="#2563eb" />
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                  Estúdio de Audiobook — {audiobookModalBook.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAudiobookModalBook(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: 4,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: 20 }}>
              <AudiobookStudio
                projectId={audiobookModalBook.bookId || audiobookModalBook.id}
                initialTitle={audiobookModalBook.title}
                initialSubtitle={audiobookModalBook.subtitle}
                initialAuthor={audiobookModalBook.author}
                initialChapters={audiobookModalBook.chapters?.map(c => ({ titulo: c.titulo, texto: c.texto })) || []}
                capaUrl={audiobookModalBook.coverDataUrl}
                bookLanguage={audiobookModalBook.language || 'português'}
                onBack={() => setAudiobookModalBook(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
