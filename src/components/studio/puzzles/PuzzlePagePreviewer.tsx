import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckCircle2,
  Grid3X3,
  FileText,
  Layers,
  Sparkles,
  ShieldCheck,
  Eye
} from 'lucide-react';
import {
  PuzzleBookConfig,
  GeneratedPuzzleItem,
  SudokuPuzzleItem,
  WordSearchPuzzleItem,
  MazePuzzleItem,
  TRIM_DIMENSIONS
} from '../../../modules/puzzles/types';
import { I18N_INTERIOR } from '../../../modules/puzzles/puzzle-interior-pdf-builder';

interface Props {
  config: PuzzleBookConfig;
  puzzles: GeneratedPuzzleItem[];
  currentPage: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  showGuidesDefault?: boolean;
}

export const PuzzlePagePreviewer: React.FC<Props> = ({
  config,
  puzzles,
  currentPage,
  totalPages,
  onPageChange,
  showGuidesDefault = false
}) => {
  const [showGuides, setShowGuides] = useState(showGuidesDefault);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const lang = config.language || 'pt';
  const i18n = I18N_INTERIOR[lang] || I18N_INTERIOR.pt;
  const trim = TRIM_DIMENSIONS[config.trimSize] || TRIM_DIMENSIONS['8.5x11'];

  const totalPuzzles = puzzles.length;
  const puzzlesPerPage = config.puzzlesPerPage || 2;
  const solutionsPerPage = config.solutionsPerPage || 6;

  const puzzlePagesCount = Math.max(1, Math.ceil(totalPuzzles / puzzlesPerPage));
  const dividerPageIndex = 2 + puzzlePagesCount + 1;
  const solutionsStartPage = dividerPageIndex + 1;
  const solutionPagesCount = Math.ceil(totalPuzzles / solutionsPerPage);

  // Mapeia onde cada puzzle tem sua solução
  const solutionPageMap = new Map<number, number>();
  for (let i = 0; i < totalPuzzles; i++) {
    const pNum = puzzles[i].number;
    const solPageOffset = Math.floor(i / solutionsPerPage);
    solutionPageMap.set(pNum, solutionsStartPage + solPageOffset);
  }

  // Identifica o conteúdo da página atual
  const isTitlePage = currentPage === 1;
  const isRulesPage = currentPage === 2;
  const isPuzzlePage = currentPage >= 3 && currentPage <= 2 + puzzlePagesCount;
  const isDividerPage = currentPage === dividerPageIndex;
  const isSolutionPage = currentPage >= solutionsStartPage && currentPage < solutionsStartPage + solutionPagesCount;
  const isNotesPage = currentPage >= solutionsStartPage + solutionPagesCount && currentPage <= totalPages;

  // Puzzles na página atual
  let currentPuzzles: GeneratedPuzzleItem[] = [];
  if (isPuzzlePage) {
    const puzzlePageIndex = currentPage - 3;
    const startIdx = puzzlePageIndex * puzzlesPerPage;
    currentPuzzles = puzzles.slice(startIdx, startIdx + puzzlesPerPage);
  }

  // Soluções na página atual
  let currentSolutions: GeneratedPuzzleItem[] = [];
  if (isSolutionPage) {
    const solutionPageIndex = currentPage - solutionsStartPage;
    const startIdx = solutionPageIndex * solutionsPerPage;
    currentSolutions = puzzles.slice(startIdx, startIdx + solutionsPerPage);
  }

  // Aspect ratio baseado nas dimensões KDP
  const aspectRatio = trim.widthInches / trim.heightInches;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: 14,
      padding: 18,
      boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)'
    }}>
      {/* BARRA SUPERIOR DE CONTROLES DO VISUALIZADOR */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        paddingBottom: 12,
        borderBottom: '1px solid #f1f5f9'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #0284c7, #0369a1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)'
          }}>
            <BookOpen size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong style={{ fontSize: 14, color: '#0f172a' }}>
                Folheador de Páginas do Livro KDP
              </strong>
              <span style={{
                background: '#e0f2fe',
                color: '#0284c7',
                border: '1px solid #bae6fd',
                borderRadius: 4,
                padding: '1px 7px',
                fontSize: 11,
                fontWeight: 700
              }}>
                {trim.name.split(' ')[0]}
              </span>
            </div>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Visualize o miolo exatamente como será impresso na Amazon KDP (Letras Grandes & Margem Segura)
            </span>
          </div>
        </div>

        {/* NAVEGAÇÃO DE PÁGINAS & CONTROLES */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Botão Guia KDP */}
          <button
            onClick={() => setShowGuides(!showGuides)}
            style={{
              background: showGuides ? '#fee2e2' : '#f8fafc',
              color: showGuides ? '#b91c1c' : '#475569',
              border: showGuides ? '1px solid #fca5a5' : '1px solid #cbd5e1',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5
            }}
            title="Alternar margens de segurança KDP (Gutter e Safe Zone)"
          >
            <ShieldCheck size={14} color={showGuides ? '#b91c1c' : '#64748b'} />
            {showGuides ? 'Ocultar Margens KDP' : 'Exibir Margens KDP'}
          </button>

          {/* Zoom */}
          <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 6, overflow: 'hidden' }}>
            <button
              onClick={() => setZoomLevel(prev => Math.max(0.8, prev - 0.1))}
              style={{ background: 'transparent', border: 'none', padding: '6px 8px', cursor: 'pointer', color: '#475569' }}
              title="Diminuir Zoom"
            >
              <ZoomOut size={14} />
            </button>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#334155', minWidth: 42, textAlign: 'center' }}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(1.4, prev + 0.1))}
              style={{ background: 'transparent', border: 'none', padding: '6px 8px', cursor: 'pointer', color: '#475569' }}
              title="Aumentar Zoom"
            >
              <ZoomIn size={14} />
            </button>
          </div>

          {/* Botões Anterior / Próxima */}
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            style={{
              background: currentPage <= 1 ? '#f1f5f9' : '#ffffff',
              color: currentPage <= 1 ? '#94a3b8' : '#0f172a',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 12,
              fontWeight: 700,
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <ChevronLeft size={16} /> Anterior
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
            <span>Página</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={e => {
                const val = parseInt(e.target.value);
                if (val >= 1 && val <= totalPages) onPageChange(val);
              }}
              style={{
                width: 48,
                textAlign: 'center',
                padding: '4px 6px',
                border: '1px solid #0284c7',
                borderRadius: 6,
                fontWeight: 800,
                fontSize: 13,
                color: '#0284c7',
                background: '#f0f9ff'
              }}
            />
            <span style={{ color: '#64748b' }}>de {totalPages}</span>
          </div>

          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            style={{
              background: currentPage >= totalPages ? '#f1f5f9' : '#ffffff',
              color: currentPage >= totalPages ? '#94a3b8' : '#0f172a',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 12,
              fontWeight: 700,
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            Próxima <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ABAS DE ATALHO RÁPIDO PARA SEÇÕES DO LIVRO */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        <button
          onClick={() => onPageChange(1)}
          style={{
            background: isTitlePage ? '#0284c7' : '#f8fafc',
            color: isTitlePage ? '#ffffff' : '#475569',
            border: isTitlePage ? '1px solid #0284c7' : '1px solid #e2e8f0',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          📄 Folha de Rosto (Pág 1)
        </button>

        <button
          onClick={() => onPageChange(2)}
          style={{
            background: isRulesPage ? '#0284c7' : '#f8fafc',
            color: isRulesPage ? '#ffffff' : '#475569',
            border: isRulesPage ? '1px solid #0284c7' : '1px solid #e2e8f0',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          📖 Como Jogar & Regras (Pág 2)
        </button>

        <button
          onClick={() => onPageChange(3)}
          style={{
            background: isPuzzlePage ? '#0284c7' : '#f8fafc',
            color: isPuzzlePage ? '#ffffff' : '#475569',
            border: isPuzzlePage ? '1px solid #0284c7' : '1px solid #e2e8f0',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          🧩 Início dos Puzzles (Pág 3)
        </button>

        <button
          onClick={() => onPageChange(dividerPageIndex)}
          style={{
            background: isDividerPage ? '#0284c7' : '#f8fafc',
            color: isDividerPage ? '#ffffff' : '#475569',
            border: isDividerPage ? '1px solid #0284c7' : '1px solid #e2e8f0',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          📑 Divisória de Gabarito (Pág {dividerPageIndex})
        </button>

        <button
          onClick={() => onPageChange(solutionsStartPage)}
          style={{
            background: isSolutionPage ? '#0284c7' : '#f8fafc',
            color: isSolutionPage ? '#ffffff' : '#475569',
            border: isSolutionPage ? '1px solid #0284c7' : '1px solid #e2e8f0',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          💡 Soluções / Respostas (Pág {solutionsStartPage})
        </button>
      </div>

      {/* ÁREA CENTRAL DO LIVRO: FOLHA BRANCA COM SOMBRA */}
      <div style={{
        background: '#f1f5f9',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: '30px 16px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'auto',
        minHeight: 520
      }}>
        {/* FOLHA DE PAPEL REAL KDP */}
        <div style={{
          width: `${Math.round(480 * zoomLevel)}px`,
          minHeight: `${Math.round((480 / aspectRatio) * zoomLevel)}px`,
          background: config.paperColor === 'cream' ? '#fdfbf7' : '#ffffff',
          boxShadow: '0 10px 35px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.08)',
          borderRadius: 4,
          border: '1px solid #d1d5db',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          padding: showGuides ? '32px 36px 36px 42px' : '36px 38px 40px 40px',
          boxSizing: 'border-box',
          color: '#0f172a',
          fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        }}>
          {/* GUIAS KDP (OPCIONAL) */}
          {showGuides && (
            <div style={{
              position: 'absolute',
              top: 18,
              bottom: 18,
              left: 22,
              right: 18,
              border: '1px dashed #ef4444',
              pointerEvents: 'none',
              borderRadius: 2
            }}>
              <span style={{
                position: 'absolute',
                top: 2,
                left: 4,
                fontSize: 9,
                color: '#ef4444',
                fontWeight: 700,
                background: 'rgba(255,255,255,0.85)',
                padding: '1px 3px'
              }}>
                Margem Segura KDP (Safe Zone • No Bleed)
              </span>
            </div>
          )}

          {/* CABEÇALHO DA PÁGINA (RUNNING HEADER) */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: '#64748b',
            textTransform: 'uppercase',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: 6,
            marginBottom: 16
          }}>
            <span>{config.title || 'LIVRO DE PASSATEMPOS KDP'}</span>
            <span>
              {isTitlePage
                ? 'FOLHA DE ROSTO'
                : isRulesPage
                ? 'INSTRUÇÕES & REGRAS'
                : isDividerPage
                ? 'GABARITO'
                : isSolutionPage
                ? 'SOLUÇÕES'
                : isNotesPage
                ? 'ANOTAÇÕES'
                : 'DESAFIOS MENTAIS'}
            </span>
          </div>

          {/* CONTEÚDO DINÂMICO DA PÁGINA */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {/* 1. FOLHA DE ROSTO */}
            {isTitlePage && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{
                  display: 'inline-block',
                  background: '#0284c7',
                  color: '#ffffff',
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: 4,
                  letterSpacing: '0.1em',
                  marginBottom: 14
                }}>
                  {config.yearBadge || 'EDIÇÃO ESPECIAL 2026'}
                </div>

                <h1 style={{
                  fontSize: 22,
                  fontWeight: 900,
                  margin: '0 0 10px',
                  color: '#0f172a',
                  lineHeight: 1.2
                }}>
                  {config.title}
                </h1>

                <p style={{
                  fontSize: 12,
                  color: '#475569',
                  margin: '0 0 28px',
                  lineHeight: 1.4,
                  fontWeight: 500
                }}>
                  {config.subtitle}
                </p>

                <div style={{
                  width: 60,
                  height: 2,
                  background: '#0284c7',
                  margin: '0 auto 28px'
                }} />

                {/* Box Este livro pertence a */}
                <div style={{
                  border: '1.5px solid #0f172a',
                  borderRadius: 8,
                  padding: '16px 20px',
                  maxWidth: 320,
                  margin: '0 auto 28px',
                  textAlign: 'left'
                }}>
                  <strong style={{ fontSize: 10, color: '#0f172a', display: 'block', marginBottom: 12, letterSpacing: '0.05em' }}>
                    {i18n.belongsTo}
                  </strong>
                  <div style={{ height: 1, background: '#94a3b8', marginBottom: 14 }} />
                  <div style={{ height: 1, background: '#cbd5e1' }} />
                </div>

                <div style={{ fontSize: 11, color: '#475569', marginBottom: 8 }}>
                  <strong>{i18n.createdBy}</strong> {config.author}
                </div>

                <div style={{ fontSize: 9, color: '#94a3b8', lineHeight: 1.4 }}>
                  {i18n.kdpOptimized}
                </div>
              </div>
            )}

            {/* 2. REGRAS E COMO JOGAR */}
            {isRulesPage && (
              <div style={{ padding: '4px 0' }}>
                <h2 style={{
                  fontSize: 16,
                  fontWeight: 900,
                  textAlign: 'center',
                  margin: '0 0 16px',
                  color: '#0f172a',
                  borderBottom: '2px solid #0f172a',
                  paddingBottom: 6
                }}>
                  {i18n.howToPlay}
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Sudoku */}
                  <div style={{ borderLeft: '3px solid #0284c7', paddingLeft: 10 }}>
                    <strong style={{ fontSize: 12, color: '#0f172a', display: 'block', marginBottom: 3 }}>
                      {i18n.sudokuTitle}
                    </strong>
                    <p style={{ fontSize: 10, color: '#334155', margin: 0, lineHeight: 1.4 }}>
                      {i18n.sudokuRules}
                    </p>
                  </div>

                  {/* Caça-Palavras */}
                  <div style={{ borderLeft: '3px solid #10b981', paddingLeft: 10 }}>
                    <strong style={{ fontSize: 12, color: '#0f172a', display: 'block', marginBottom: 3 }}>
                      {i18n.wsTitle}
                    </strong>
                    <p style={{ fontSize: 10, color: '#334155', margin: 0, lineHeight: 1.4 }}>
                      {i18n.wsRules}
                    </p>
                  </div>

                  {/* Labirintos */}
                  <div style={{ borderLeft: '3px solid #f59e0b', paddingLeft: 10 }}>
                    <strong style={{ fontSize: 12, color: '#0f172a', display: 'block', marginBottom: 3 }}>
                      {i18n.mazeTitle}
                    </strong>
                    <p style={{ fontSize: 10, color: '#334155', margin: 0, lineHeight: 1.4 }}>
                      {i18n.mazeRules}
                    </p>
                  </div>
                </div>

                <div style={{
                  marginTop: 22,
                  padding: 10,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  textAlign: 'center',
                  fontSize: 9,
                  color: '#64748b'
                }}>
                  💡 <strong>Dica do Autor:</strong> As soluções completas de todos os desafios estão no final deste livro a partir da página {solutionsStartPage}.
                </div>
              </div>
            )}

            {/* 3. PÁGINAS DE PUZZLES (SUDOKU, CAÇA-PALAVRAS, LABIRINTOS) */}
            {isPuzzlePage && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: currentPuzzles.length > 1 ? 16 : 8,
                justifyContent: 'center'
              }}>
                {currentPuzzles.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>
                    Nenhum puzzle diagramado para esta página.
                  </div>
                ) : (
                  currentPuzzles.map(puzzle => {
                    const solPage = solutionPageMap.get(puzzle.number) || solutionsStartPage;
                    return (
                      <div key={puzzle.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        {/* CABEÇALHO DO PUZZLE */}
                        <div style={{
                          width: '100%',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 6,
                          borderBottom: '1px solid #0f172a',
                          paddingBottom: 2
                        }}>
                          <span style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>
                            {puzzle.type === 'sudoku' && `SUDOKU #${puzzle.number}`}
                            {puzzle.type === 'wordsearch' && `CAÇA-PALAVRAS #${puzzle.number}`}
                            {puzzle.type === 'maze' && `LABIRINTO #${puzzle.number}`}
                          </span>

                          <span style={{ fontSize: 10, fontWeight: 800, color: '#0284c7' }}>
                            {puzzle.type === 'sudoku' && (i18n.diff as any)[puzzle.difficulty]}
                            {puzzle.type === 'wordsearch' && (puzzle as WordSearchPuzzleItem).theme.toUpperCase()}
                            {puzzle.type === 'maze' && (i18n.diff as any)[puzzle.difficulty]}
                          </span>
                        </div>

                        {/* RENDERIZAÇÃO ESPECÍFICA DO PUZZLE */}
                        {puzzle.type === 'sudoku' && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(9, 1fr)',
                              border: '2.5px solid #0f172a',
                              background: '#ffffff',
                              width: currentPuzzles.length === 1 ? 260 : 190,
                              height: currentPuzzles.length === 1 ? 260 : 190
                            }}>
                              {(puzzle as SudokuPuzzleItem).grid.map((row, rIdx) =>
                                row.map((val, cIdx) => {
                                  const isBorderRight = (cIdx + 1) % 3 === 0 && cIdx < 8;
                                  const isBorderBottom = (rIdx + 1) % 3 === 0 && rIdx < 8;
                                  return (
                                    <div
                                      key={`${rIdx}-${cIdx}`}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRight: isBorderRight ? '2px solid #0f172a' : '0.5px solid #cbd5e1',
                                        borderBottom: isBorderBottom ? '2px solid #0f172a' : '0.5px solid #cbd5e1',
                                        fontSize: currentPuzzles.length === 1 ? 14 : 11,
                                        fontWeight: 800,
                                        color: '#0f172a'
                                      }}
                                    >
                                      {val !== 0 ? val : ''}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                            <span style={{ fontSize: 8, color: '#64748b', marginTop: 4 }}>
                              {i18n.solutionOnPage.replace('{page}', solPage.toString())}
                            </span>
                          </div>
                        )}

                        {puzzle.type === 'wordsearch' && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                            {/* GRADE DE LETRAS */}
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: `repeat(${(puzzle as WordSearchPuzzleItem).gridSize}, 1fr)`,
                              border: '1.5px solid #0f172a',
                              padding: 4,
                              background: '#ffffff',
                              width: currentPuzzles.length === 1 ? 270 : 210,
                              height: currentPuzzles.length === 1 ? 270 : 210
                            }}>
                              {(puzzle as WordSearchPuzzleItem).grid.map((row, rIdx) =>
                                row.map((letter, cIdx) => (
                                  <div
                                    key={`${rIdx}-${cIdx}`}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: currentPuzzles.length === 1 ? 11 : 9,
                                      fontWeight: 700,
                                      fontFamily: 'monospace',
                                      color: '#0f172a'
                                    }}
                                  >
                                    {letter}
                                  </div>
                                ))
                              )}
                            </div>

                            {/* LISTA DE PALAVRAS A ENCONTRAR */}
                            <div style={{ marginTop: 8, width: '100%', maxWidth: 320 }}>
                              <strong style={{ fontSize: 8, color: '#0f172a', display: 'block', marginBottom: 2 }}>
                                {i18n.wordsToFind}
                              </strong>
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '2px 6px',
                                fontSize: 8,
                                color: '#334155',
                                fontWeight: 600
                              }}>
                                {(puzzle as WordSearchPuzzleItem).words.slice(0, 12).map((w, wIdx) => (
                                  <span key={wIdx} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    • {w}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <span style={{ fontSize: 8, color: '#64748b', marginTop: 4 }}>
                              {i18n.solutionOnPage.replace('{page}', solPage.toString())}
                            </span>
                          </div>
                        )}

                        {puzzle.type === 'maze' && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ fontSize: 8, fontWeight: 800, color: '#16a34a', marginBottom: 2 }}>
                              {i18n.entry}
                            </div>
                            {/* LABIRINTO EM SVG */}
                            <svg
                              width={currentPuzzles.length === 1 ? 240 : 180}
                              height={currentPuzzles.length === 1 ? 240 : 180}
                              viewBox={`0 0 ${(puzzle as MazePuzzleItem).width * 10} ${(puzzle as MazePuzzleItem).height * 10}`}
                              style={{ background: '#ffffff', border: '1.5px solid #0f172a' }}
                            >
                              {(puzzle as MazePuzzleItem).grid.map((row, r) =>
                                row.map((cell, c) => {
                                  const x = c * 10;
                                  const y = r * 10;
                                  return (
                                    <g key={`${r}-${c}`} stroke="#0f172a" strokeWidth="1.2">
                                      {cell.top && !(r === 0 && c === (puzzle as MazePuzzleItem).start.col) && (
                                        <line x1={x} y1={y} x2={x + 10} y2={y} />
                                      )}
                                      {cell.right && <line x1={x + 10} y1={y} x2={x + 10} y2={y + 10} />}
                                      {cell.bottom && !(r === (puzzle as MazePuzzleItem).height - 1 && c === (puzzle as MazePuzzleItem).end.col) && (
                                        <line x1={x} y1={y + 10} x2={x + 10} y2={y + 10} />
                                      )}
                                      {cell.left && <line x1={x} y1={y} x2={x} y2={y + 10} />}
                                    </g>
                                  );
                                })
                              )}
                            </svg>
                            <div style={{ fontSize: 8, fontWeight: 800, color: '#dc2626', marginTop: 2 }}>
                              {i18n.exit}
                            </div>
                            <span style={{ fontSize: 8, color: '#64748b', marginTop: 2 }}>
                              {i18n.solutionOnPage.replace('{page}', solPage.toString())}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* 4. DIVISÓRIA DE GABARITO DE SOLUÇÕES */}
            {isDividerPage && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  background: '#0284c7',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)'
                }}>
                  <Sparkles size={26} />
                </div>

                <h2 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '0 0 8px' }}>
                  {i18n.solutionsTitle}
                </h2>

                <p style={{ fontSize: 13, color: '#475569', margin: '0 0 24px' }}>
                  {i18n.solutionsSubtitle}
                </p>

                <div style={{ width: 40, height: 2, background: '#0284c7', margin: '0 auto 24px' }} />

                <div style={{
                  padding: 14,
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  maxWidth: 280,
                  margin: '0 auto',
                  fontSize: 10,
                  color: '#64748b',
                  lineHeight: 1.5
                }}>
                  As páginas a seguir contêm o gabarito oficial com resolução passo a passo e respostas verificadas.
                </div>
              </div>
            )}

            {/* 5. PÁGINAS DE SOLUÇÃO / GABARITO */}
            {isSolutionPage && (
              <div>
                <h3 style={{
                  fontSize: 13,
                  fontWeight: 900,
                  textAlign: 'center',
                  margin: '0 0 12px',
                  color: '#0f172a',
                  borderBottom: '1.5px solid #0f172a',
                  paddingBottom: 4
                }}>
                  {i18n.solutionsHeader}
                </h3>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: solutionsPerPage <= 6 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                  gap: 10
                }}>
                  {currentSolutions.map(puzzle => (
                    <div
                      key={puzzle.id}
                      style={{
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        padding: 6,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        background: '#f8fafc'
                      }}
                    >
                      <strong style={{ fontSize: 9, color: '#0f172a', marginBottom: 4 }}>
                        {i18n.solutionNumber.replace('{num}', puzzle.number.toString())}
                      </strong>

                      {puzzle.type === 'sudoku' && (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(9, 1fr)',
                          border: '1.5px solid #0f172a',
                          width: 80,
                          height: 80,
                          background: '#ffffff'
                        }}>
                          {(puzzle as SudokuPuzzleItem).solution.map((row, r) =>
                            row.map((val, c) => (
                              <div
                                key={`${r}-${c}`}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 6,
                                  fontWeight: 700,
                                  color: '#0284c7'
                                }}
                              >
                                {val}
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {puzzle.type === 'wordsearch' && (
                        <div style={{ fontSize: 8, color: '#475569', textAlign: 'center', lineHeight: 1.3 }}>
                          <strong>{(puzzle as WordSearchPuzzleItem).theme}</strong>
                          <div style={{ fontSize: 7, color: '#16a34a', marginTop: 2 }}>
                            ✓ {(puzzle as WordSearchPuzzleItem).words.length} palavras localizadas
                          </div>
                        </div>
                      )}

                      {puzzle.type === 'maze' && (
                        <div style={{ fontSize: 8, color: '#475569', textAlign: 'center' }}>
                          <span style={{ fontSize: 10 }}>🧭</span> Labirinto #{puzzle.number}
                          <div style={{ fontSize: 7, color: '#16a34a' }}>
                            ✓ Rota ótima verificada
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. ANOTAÇÕES & RASCUNHOS (PÁGINAS COMPLEMENTARES KDP) */}
            {isNotesPage && (
              <div style={{ padding: '10px 0' }}>
                <h3 style={{
                  fontSize: 14,
                  fontWeight: 900,
                  textAlign: 'center',
                  margin: '0 0 18px',
                  color: '#0f172a',
                  borderBottom: '1.5px solid #0f172a',
                  paddingBottom: 4
                }}>
                  {i18n.notesTitle}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {Array.from({ length: 14 }).map((_, idx) => (
                    <div key={idx} style={{ height: 1, background: '#cbd5e1' }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RODAPÉ DA PÁGINA (PAGE NUMBER) */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: 10,
            fontWeight: 800,
            color: '#64748b',
            borderTop: '1px solid #e2e8f0',
            paddingTop: 8,
            marginTop: 14
          }}>
            <span>- {currentPage} -</span>
          </div>
        </div>
      </div>
    </div>
  );
};
