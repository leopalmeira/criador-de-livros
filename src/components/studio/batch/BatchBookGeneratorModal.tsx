import React, { useState } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Sliders, 
  Clock, 
  FileText, 
  Zap, 
  ShieldCheck, 
  Check, 
  ExternalLink,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { 
  GENRE_PRESETS, 
  BatchBookGeneratorService, 
  GenreBatchConfig, 
  BatchGenerationSettings, 
  BatchBookProgress 
} from '../../../services/batch-book-generator-service';
import { BookProject } from '../../../types/book-project';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onBatchCompleted: () => void;
}

export const BatchBookGeneratorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onBatchCompleted
}) => {
  // Estado dos gêneros selecionados e quantidades (1 a 20)
  const [selectedGenres, setSelectedGenres] = useState<Record<string, { selected: boolean; count: number }>>(() => {
    const initial: Record<string, { selected: boolean; count: number }> = {};
    GENRE_PRESETS.forEach((g, idx) => {
      // Deixa os 2 primeiros selecionados por padrão com 2 livros cada
      initial[g.genreId] = { selected: idx < 2, count: 2 };
    });
    return initial;
  });

  // Configurações editoriais de densidade e páginas
  const [wordsPerChapter, setWordsPerChapter] = useState<number>(1800);
  const [chaptersCount, setChaptersCount] = useState<number>(10);
  const [authorName, setAuthorName] = useState<string>('Leandro Palmeira');

  // Estado de execução do lote
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<BatchBookProgress | null>(null);
  const [completedBooks, setCompletedBooks] = useState<BookProject[]>([]);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  if (!isOpen) return null;

  // Cálculo de livros totais do lote
  const totalBooksToGenerate = Object.entries(selectedGenres)
    .filter(([_, cfg]) => cfg.selected)
    .reduce((acc, [_, cfg]) => acc + cfg.count, 0);

  // Cálculo da quantidade estimada de páginas
  const estimatedPages = BatchBookGeneratorService.calculateTargetPages(chaptersCount, wordsPerChapter);
  const totalWordsPerBook = chaptersCount * wordsPerChapter;

  const handleToggleGenre = (genreId: string) => {
    setSelectedGenres(prev => ({
      ...prev,
      [genreId]: {
        ...prev[genreId],
        selected: !prev[genreId]?.selected
      }
    }));
  };

  const handleCountChange = (genreId: string, count: number) => {
    const validCount = Math.max(1, Math.min(20, count || 1));
    setSelectedGenres(prev => ({
      ...prev,
      [genreId]: {
        ...prev[genreId],
        count: validCount
      }
    }));
  };

  const handleStartBatch = async () => {
    if (totalBooksToGenerate === 0) return;

    const genreConfigs: GenreBatchConfig[] = Object.entries(selectedGenres)
      .filter(([_, cfg]) => cfg.selected)
      .map(([genreId, cfg]) => {
        const preset = GENRE_PRESETS.find(p => p.genreId === genreId)!;
        return {
          genreId,
          genreName: preset.genreName,
          count: cfg.count,
          kdpCategory: preset.kdpCategory
        };
      });

    const settings: BatchGenerationSettings = {
      genres: genreConfigs,
      wordsPerChapter,
      chaptersCount,
      authorName,
      targetMarketplace: 'amazon.com.br',
      targetPrice: 39.90
    };

    setIsRunning(true);
    setIsFinished(false);
    setProgress(null);

    try {
      const results = await BatchBookGeneratorService.executeBatchGeneration(
        settings,
        (p) => setProgress(p)
      );
      setCompletedBooks(results);
      setIsFinished(true);
      window.dispatchEvent(new CustomEvent('kdp-final-books-updated'));
    } catch (err) {
      console.error('Erro na execução do lote:', err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20
    }}>
      <div style={{
        width: '100%',
        maxWidth: 960,
        maxHeight: '92vh',
        background: '#0f172a',
        border: '1px solid #334155',
        borderRadius: 16,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
        color: '#f8fafc',
        fontFamily: "'Inter', sans-serif"
      }}>
        {/* CABEÇALHO */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#1e293b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
            }}>
              <Zap size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#ffffff' }}>
                  Gerador Automático de Livros em Lote
                </h3>
                <span style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 4,
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }}>
                  1 a 20 Livros por Gênero • Auto-Auditoria KDP
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#94a3b8' }}>
                Gera títulos, subtítulos, sinopses, capítulos configurados e capas de best-sellers da Amazon 100% no automático
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isRunning}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              padding: 6,
              borderRadius: 6
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* CORPO DO MODAL */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* SE NÃO ESTIVER RODANDO E NÃO TIVER TERMINADO: MOSTRA CONFIGURAÇÕES */}
          {!isRunning && !isFinished && (
            <>
              {/* 1. SELEÇÃO DE GÊNEROS E QUANTIDADES (1 A 20) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#ffffff' }}>
                    1. Selecione os Gêneros e Quantidade de Livros (1 a 20 por gênero)
                  </h4>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8' }}>
                    Total no Lote: {totalBooksToGenerate} {totalBooksToGenerate === 1 ? 'livro' : 'livros'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                  {GENRE_PRESETS.map((preset) => {
                    const cfg = selectedGenres[preset.genreId] || { selected: false, count: 2 };
                    return (
                      <div
                        key={preset.genreId}
                        style={{
                          padding: 14,
                          borderRadius: 10,
                          background: cfg.selected ? 'rgba(56, 189, 248, 0.08)' : '#0c1322',
                          border: cfg.selected ? '1px solid #38bdf8' : '1px solid #1e293b',
                          transition: 'all 0.15s',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}>
                            <input
                              type="checkbox"
                              checked={cfg.selected}
                              onChange={() => handleToggleGenre(preset.genreId)}
                              style={{ width: 16, height: 16, accentColor: '#38bdf8' }}
                            />
                            <span style={{ fontSize: 13, fontWeight: 700, color: cfg.selected ? '#ffffff' : '#cbd5e1' }}>
                              {preset.genreName}
                            </span>
                          </label>
                        </div>

                        {cfg.selected && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingTop: 8,
                            borderTop: '1px solid #1e293b'
                          }}>
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>Quantidade no lote:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <input
                                type="number"
                                min={1}
                                max={20}
                                value={cfg.count}
                                onChange={(e) => handleCountChange(preset.genreId, parseInt(e.target.value, 10))}
                                style={{
                                  width: 54,
                                  padding: '4px 8px',
                                  borderRadius: 6,
                                  background: '#0f172a',
                                  border: '1px solid #334155',
                                  color: '#ffffff',
                                  fontSize: 13,
                                  fontWeight: 700,
                                  textAlign: 'center'
                                }}
                              />
                              <span style={{ fontSize: 11, color: '#64748b' }}>(1-20)</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. CONFIGURAÇÃO DE PALAVRAS POR CAPÍTULO E PÁGINAS DESEJADAS */}
              <div style={{ background: '#131d2e', padding: 18, borderRadius: 12, border: '1px solid #1e293b' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700, color: '#ffffff' }}>
                  2. Meta de Páginas & Palavras por Capítulo (Cálculo Preciso KDP)
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                  {/* Palavras por Capítulo */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label style={{ fontSize: 12, color: '#cbd5e1' }}>Palavras por Capítulo:</label>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8' }}>
                        {wordsPerChapter.toLocaleString('pt-BR')} palavras
                      </span>
                    </div>
                    <input
                      type="range"
                      min={800}
                      max={4000}
                      step={100}
                      value={wordsPerChapter}
                      onChange={(e) => setWordsPerChapter(parseInt(e.target.value, 10))}
                      style={{ width: '100%', accentColor: '#38bdf8' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b' }}>
                      <span>800 (Rápido)</span>
                      <span>1.800 (Padrão KDP)</span>
                      <span>4.000 (Profundo)</span>
                    </div>
                  </div>

                  {/* Quantidade de Capítulos */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label style={{ fontSize: 12, color: '#cbd5e1' }}>Capítulos por Livro:</label>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8' }}>
                        {chaptersCount} capítulos
                      </span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={20}
                      step={1}
                      value={chaptersCount}
                      onChange={(e) => setChaptersCount(parseInt(e.target.value, 10))}
                      style={{ width: '100%', accentColor: '#38bdf8' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b' }}>
                      <span>5 cap</span>
                      <span>10 cap</span>
                      <span>20 cap</span>
                    </div>
                  </div>

                  {/* Nome do Autor */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#cbd5e1', marginBottom: 6 }}>
                      Nome do Autor Oficial:
                    </label>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 6,
                        background: '#0f172a',
                        border: '1px solid #334155',
                        color: '#ffffff',
                        fontSize: 13,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* CARD DE ESTIMATIVA DE PÁGINAS EM TEMPO REAL */}
                <div style={{
                  marginTop: 16,
                  padding: 12,
                  borderRadius: 8,
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ShieldCheck size={20} color="#10b981" />
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#34d399' }}>
                        Extensão Garantida: ~{estimatedPages} páginas por livro
                      </span>
                      <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
                        {chaptersCount} capítulos x {wordsPerChapter.toLocaleString('pt-BR')} palavras = {totalWordsPerBook.toLocaleString('pt-BR')} palavras totais (padrão 250 palavras/página KDP 6x9)
                      </p>
                    </div>
                  </div>

                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    background: '#022c22',
                    color: '#34d399',
                    padding: '4px 10px',
                    borderRadius: 6
                  }}>
                    Auto-Auditoria KDP Integrada
                  </span>
                </div>
              </div>
            </>
          )}

          {/* ESTADO DE EXECUÇÃO EM TEMPO REAL COM PROGRESSO */}
          {isRunning && progress && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '10px 0' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                  Gerando em Lote com Auto-Auditoria
                </span>
                <h3 style={{ margin: '4px 0', fontSize: 20, fontWeight: 800, color: '#ffffff' }}>
                  Livro {progress.currentIndex} de {progress.totalBooks}: "{progress.currentBookTitle}"
                </h3>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  Gênero: {progress.currentGenre} • Etapa: {progress.currentStage.toUpperCase()}
                </span>
              </div>

              {/* BARRA DE PROGRESSO GERAL */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#cbd5e1', marginBottom: 6 }}>
                  <span>Progresso do Lote</span>
                  <span style={{ fontWeight: 700, color: '#34d399' }}>{progress.percentage}%</span>
                </div>
                <div style={{ width: '100%', height: 10, background: '#1e293b', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{
                    width: `${progress.percentage}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #38bdf8, #10b981)',
                    transition: 'width 0.2s'
                  }} />
                </div>
              </div>

              {/* CONSOLE DE LOGS EM TEMPO REAL */}
              <div style={{
                background: '#090d16',
                border: '1px solid #1e293b',
                borderRadius: 10,
                padding: 14,
                maxHeight: 180,
                overflowY: 'auto',
                fontFamily: "'Courier New', monospace",
                fontSize: 11,
                color: '#94a3b8',
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}>
                {progress.log.slice(-10).map((line, idx) => (
                  <div key={idx} style={{ color: line.startsWith('✓') ? '#34d399' : line.startsWith('⚡') ? '#38bdf8' : '#cbd5e1' }}>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ESTADO FINALIZADO */}
          {isFinished && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, textAlign: 'center', padding: '10px 0' }}>
              <div style={{
                width: 60,
                height: 60,
                margin: '0 auto',
                borderRadius: 16,
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.4)'
              }}>
                <CheckCircle2 size={34} />
              </div>

              <div>
                <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#ffffff' }}>
                  Lote Concluído com Sucesso!
                </h3>
                <p style={{ margin: '6px 0 0 0', fontSize: 13, color: '#94a3b8' }}>
                  {completedBooks.length} obras geradas, auditadas e salvas na plataforma prontas para revisão e download.
                </p>
              </div>

              {/* LISTA RÁPIDA DAS OBRAS GERADAS */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 12,
                maxHeight: 240,
                overflowY: 'auto',
                textAlign: 'left'
              }}>
                {completedBooks.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      background: '#131d2e',
                      border: '1px solid #1e293b',
                      borderRadius: 8,
                      padding: 12
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#38bdf8' }}>
                        {b.categories?.[0] || 'KDP'}
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 700, background: '#022c22', color: '#34d399', padding: '1px 6px', borderRadius: 4 }}>
                        ✓ Auditado
                      </span>
                    </div>
                    <h5 style={{ margin: '0 0 4px 0', fontSize: 13, fontWeight: 700, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.title}
                    </h5>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                      {b.estimatedPages} páginas • {b.kdpChapters?.length || 0} capítulos
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* RODAPÉ COM AÇÕES */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#090d16'
        }}>
          {!isFinished ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isRunning}
                style={{
                  padding: '10px 18px',
                  borderRadius: 8,
                  background: 'transparent',
                  border: '1px solid #334155',
                  color: '#94a3b8',
                  fontSize: 13,
                  cursor: isRunning ? 'not-allowed' : 'pointer'
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleStartBatch}
                disabled={isRunning || totalBooksToGenerate === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 24px',
                  borderRadius: 8,
                  background: isRunning ? '#334155' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                }}
              >
                {isRunning ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Gerando {totalBooksToGenerate} Obras...
                  </>
                ) : (
                  <>
                    <Zap size={16} /> Gerar {totalBooksToGenerate} Livros em Lote Agora
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                onBatchCompleted();
                onClose();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 24px',
                borderRadius: 8,
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <BookOpen size={16} /> Ver Todos os Livros na Dashboard <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
