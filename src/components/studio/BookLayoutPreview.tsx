import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Sliders,
  Sparkles,
  Download
} from 'lucide-react';
import { BookProject, TrimSize, TRIM_SIZE_METRICS } from '../../types/book-project';
import { EditorialControlBar } from './EditorialControlBar';
import { PdfBuilder } from '../../services/formats/pdf-builder';

interface Props {
  project: BookProject;
  onUpdateProject: (p: BookProject) => void;
  onContinue?: () => void;
  onNavigateToNextStage?: () => void;
  onPrev?: () => void;
}

export const BookLayoutPreview: React.FC<Props> = ({
  project,
  onUpdateProject,
  onContinue,
  onPrev
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [fontSize, setFontSize] = useState<number>(11); // pt
  const [lineHeight, setLineHeight] = useState<number>(1.5);
  const [isApproved, setIsApproved] = useState<boolean>(() => {
    return project.layoutApprovedAt !== undefined || 
           project.editorialStageApprovals?.['layout']?.status === 'APROVADO';
  });

  const chapters = project.kdpChapters || [];
  const targetPages = project.estimatedPages || 160;

  // Cálculo de Paginação Real com base na densidade de palavras e margens
  const pagesList = useMemo(() => {
    const list: Array<{
      pageNumber: number;
      chapterIndex?: number;
      type: 'cover' | 'cip' | 'toc' | 'chapter_start' | 'prose';
      title?: string;
      content: string;
    }> = [];

    // Página 1: Folha de Rosto
    list.push({
      pageNumber: 1,
      type: 'cover',
      title: project.title,
      content: `${project.title}\n\n${project.subtitle || ''}\n\n${project.author}`
    });

    // Página 2: Ficha Catalográfica CIP
    list.push({
      pageNumber: 2,
      type: 'cip',
      title: 'Ficha Catalográfica',
      content: `Dados Internacionais de Catalogação na Publicação (CIP)\n\n${project.author}\n${project.title} / ${project.author}.\nPublicação Independente Amazon KDP (${project.trimSize || '6x9'}).`
    });

    // Página 3: Sumário
    list.push({
      pageNumber: 3,
      type: 'toc',
      title: 'Sumário',
      content: chapters.map((c, i) => `Capítulo ${i + 1}: ${c.title}`).join('\n')
    });

    // Páginas dos Capítulos
    let pNum = 4;
    chapters.forEach((ch, chIdx) => {
      const prose = ch.prose || ch.summary || 'Texto do capítulo em desenvolvimento.';
      const paragraphs = prose.split('\n\n').filter(Boolean);

      // Aproximação real de ~250 palavras por página física 6x9 com fonte 11pt
      const wordsPerPage = Math.max(180, Math.round(250 * (11 / fontSize) * (1.5 / lineHeight)));
      const words = prose.split(/\s+/).filter(Boolean);
      const neededPages = Math.max(1, Math.ceil(words.length / wordsPerPage));

      for (let p = 0; p < neededPages; p++) {
        const startWord = p * wordsPerPage;
        const pageWords = words.slice(startWord, startWord + wordsPerPage).join(' ');

        list.push({
          pageNumber: pNum,
          chapterIndex: chIdx,
          type: p === 0 ? 'chapter_start' : 'prose',
          title: p === 0 ? `Capítulo ${chIdx + 1}: ${ch.title}` : undefined,
          content: pageWords
        });
        pNum++;
      }
    });

    // Ajuste KDP: A gráfica exige número par de páginas no miolo
    if (list.length % 2 !== 0) {
      list.push({
        pageNumber: pNum,
        type: 'prose',
        title: 'Anotações do Leitor',
        content: 'Linhas reservadas para reflexões e planos de ação práticos do leitor.'
      });
    }

    return list;
  }, [chapters, project.title, project.subtitle, project.author, fontSize, lineHeight, project.trimSize]);

  const totalCalculatedPages = pagesList.length;
  const activePageData = pagesList[currentPage - 1] || pagesList[0];
  const pageDifference = totalCalculatedPages - targetPages;

  const handleApproveLayout = () => {
    const updated: BookProject = {
      ...project,
      actualPages: totalCalculatedPages,
      layoutApprovedAt: Date.now(),
      pageSettings: {
        fontSize,
        lineHeight,
        marginGutterMm: 20,
        marginOuterMm: 13,
        marginTopMm: 18,
        marginBottomMm: 18
      } as any,
      editorialStageApprovals: {
        ...(project.editorialStageApprovals || {}),
        layout: {
          stageId: 'layout',
          status: 'APROVADO',
          approvedAt: Date.now(),
          approvedBy: 'user',
          notes: `Diagramação aprovada com ${totalCalculatedPages} páginas reais calculadas.`
        }
      }
    };

    setIsApproved(true);
    onUpdateProject(updated);
  };

  const isOdd = currentPage % 2 !== 0;

  return (
    <div className="book-layout-preview space-y-6">
      {/* BARRA DE CONTROLE EDITORIAL */}
      <EditorialControlBar
        stageId="layout_preview"
        stageLabel="Diagramação & Pré-visualização Real"
        status={isApproved ? 'APROVADO' : 'AGUARDANDO_APROVACAO'}
        isApproved={isApproved}
        canApprove={totalCalculatedPages > 0}
        approveButtonText={isApproved ? '✓ DIAGRAMAÇÃO APROVADA' : 'APROVAR DIAGRAMAÇÃO'}
        onPrev={onPrev}
        onNext={isApproved ? onContinue : undefined}
        onApprove={handleApproveLayout}
      />

      {/* PAINEL DE CONTROLE DE TIPOGRAFIA E PÁGINAS */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Resultado da Diagramação Real
          </span>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-lg font-bold text-white">
              {totalCalculatedPages} Páginas Reais
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              Meta Editorial: {targetPages} págs ({pageDifference >= 0 ? `+${pageDifference}` : pageDifference})
            </span>
            <span className="text-xs text-slate-400">
              Formato: <strong>{project.trimSize || '6x9'}</strong>
            </span>
          </div>
        </div>

        {/* Sliders de Ajuste Físico */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <label className="text-slate-400">Tamanho Fonte:</label>
            <select
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-medium"
            >
              <option value={10}>10 pt (Denso)</option>
              <option value={11}>11 pt (Padrão KDP)</option>
              <option value={12}>12 pt (Grande)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-slate-400">Espaçamento:</label>
            <select
              value={lineHeight}
              onChange={(e) => setLineHeight(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white font-medium"
            >
              <option value={1.3}>1.3x</option>
              <option value={1.5}>1.5x (Recomendado)</option>
              <option value={1.6}>1.6x</option>
            </select>
          </div>
        </div>
      </div>

      {/* SIMULADOR DE PÁGINA FÍSICA KDP COM MEDIANIZ (GUTTER) */}
      <div className="flex flex-col items-center justify-center p-6 bg-slate-950 border border-slate-800 rounded-2xl">
        {/* Folha do Livro Renderizada */}
        <div 
          className={`w-[420px] h-[600px] bg-[#fbf9f4] text-slate-900 shadow-2xl rounded-sm p-8 flex flex-col justify-between relative border border-slate-300 ${
            isOdd ? 'border-l-4 border-l-slate-400' : 'border-r-4 border-r-slate-400'
          }`}
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: `${fontSize}px`,
            lineHeight: lineHeight
          }}
        >
          {/* Cabeçalho Alternado (Verso / Reto) */}
          <div className="border-b border-slate-300 pb-1 flex justify-between items-center text-[10px] text-slate-500 uppercase tracking-widest">
            {isOdd ? (
              <>
                <span>{project.title || 'Livro KDP'}</span>
                <span>{activePageData?.title || ''}</span>
              </>
            ) : (
              <>
                <span>{project.author || 'Autor'}</span>
                <span>{project.title || 'Livro KDP'}</span>
              </>
            )}
          </div>

          {/* Corpo do Conteúdo */}
          <div className="flex-1 py-4 overflow-hidden flex flex-col justify-start">
            {activePageData?.title && (
              <h4 className="font-bold text-center text-sm mb-3 tracking-wide text-slate-900 uppercase">
                {activePageData.title}
              </h4>
            )}
            <p className="text-justify whitespace-pre-line leading-relaxed text-slate-800 indent-6">
              {activePageData?.content}
            </p>
          </div>

          {/* Rodapé com Número de Página Oficial */}
          <div className="border-t border-slate-300 pt-1 text-center text-[11px] text-slate-600 font-sans">
            {currentPage > 2 ? currentPage : ''}
          </div>
        </div>

        {/* NAVEGAÇÃO ENTRE PÁGINAS */}
        <div className="flex items-center gap-4 mt-6">
          <button
            type="button"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>

          <span className="text-xs font-bold text-slate-300">
            Página {currentPage} de {totalCalculatedPages} ({isOdd ? 'Lado Ímpar / Reto' : 'Lado Par / Verso'})
          </span>

          <button
            type="button"
            onClick={() => setCurrentPage(p => Math.min(totalCalculatedPages, p + 1))}
            disabled={currentPage >= totalCalculatedPages}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
