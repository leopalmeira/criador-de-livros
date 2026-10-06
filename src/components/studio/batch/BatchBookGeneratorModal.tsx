// ============================================================================
// MODAL DE CONFIGURAÇÃO E EXECUÇÃO DE GERAÇÃO EM LOTE (1 A 20 LIVROS POR GÊNERO)
// 1. Apresenta TODOS os 28+ gêneros editoriais da Amazon KDP com busca e filtros
// 2. Permite configurar de 1 a 20 livros por gênero
// 3. Permite configurar densidade de palavras e capítulos para atingir páginas exatas
// 4. Executa em segundo plano via BatchBackgroundRunner
// ============================================================================

import React, { useState, useEffect } from 'react';
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
  RefreshCw,
  Search,
  CheckSquare,
  Square
} from 'lucide-react';
import { 
  GENRE_PRESETS, 
  BatchBookGeneratorService, 
  GenreBatchConfig, 
  BatchGenerationSettings 
} from '../../../services/batch-book-generator-service';
import { 
  batchBackgroundRunner, 
  BatchRunnerState 
} from '../../../services/batch-background-runner';
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
  // Filtro de busca de gêneros
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Estado dos gêneros selecionados e quantidades (1 a 20 livros por gênero)
  const [selectedGenres, setSelectedGenres] = useState<Record<string, { selected: boolean; count: number }>>(() => {
    const initial: Record<string, { selected: boolean; count: number }> = {};
    GENRE_PRESETS.forEach((g, idx) => {
      // Deixa os 3 primeiros selecionados por padrão com 2 livros cada
      initial[g.genreId] = { selected: idx < 3, count: 2 };
    });
    return initial;
  });

  // Configurações editoriais de densidade e páginas
  const [wordsPerChapter, setWordsPerChapter] = useState<number>(1800);
  const [chaptersCount, setChaptersCount] = useState<number>(10);
  const [authorName, setAuthorName] = useState<string>('Leandro Palmeira');

  // Estado sincronizado com o runner em segundo plano
  const [runnerState, setRunnerState] = useState<BatchRunnerState>(batchBackgroundRunner.getState());

  useEffect(() => {
    const unsubscribe = batchBackgroundRunner.subscribe((state) => {
      setRunnerState(state);
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  // Filtra os gêneros pela busca
  const filteredGenres = GENRE_PRESETS.filter(g => 
    g.genreName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.kdpCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.genreId.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        selected: !prev[genreId]?.selected,
        count: prev[genreId]?.count || 2
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

  const handleSelectAll = () => {
    setSelectedGenres(prev => {
      const updated = { ...prev };
      filteredGenres.forEach(g => {
        updated[g.genreId] = { selected: true, count: prev[g.genreId]?.count || 2 };
      });
      return updated;
    });
  };

  const handleDeselectAll = () => {
    setSelectedGenres(prev => {
      const updated = { ...prev };
      filteredGenres.forEach(g => {
        updated[g.genreId] = { selected: false, count: prev[g.genreId]?.count || 2 };
      });
      return updated;
    });
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

    try {
      await batchBackgroundRunner.startBatch(settings);
      onBatchCompleted();
    } catch (err) {
      console.error('Erro na execução do lote:', err);
    }
  };

  const isRunning = runnerState.isRunning;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: 16
    }}>
      <div style={{
        background: '#ffffff',
        width: '100%',
        maxWidth: 1040,
        maxHeight: '92vh',
        borderRadius: 20,
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #e2e8f0'
      }}>
        {/* CABEÇALHO DO MODAL */}
        <div style={{
          padding: '20px 28px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
            }}>
              <Zap size={24} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>
                  Gerador de Livros em Lote KDP Pro
                </h2>
                <span style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 6,
                  border: '1px solid rgba(52, 211, 153, 0.3)'
                }}>
                  {GENRE_PRESETS.length} Gêneros Amazon KDP
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: '#94a3b8' }}>
                Gere de 1 a 20 livros completos por gênero com texto integral, capas em alta definição e auto-auditoria KDP.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: 8,
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* CORPO DO MODAL */}
        <div style={{
          padding: '24px 28px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 20
        }}>
          {/* SEÇÃO 1: STATUS DE EXECUÇÃO EM TEMPO REAL SE O LOTE ESTIVER RODANDO */}
          {isRunning && (
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              borderRadius: 14,
              padding: '20px 24px',
              color: '#ffffff',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
              border: '1px solid #334155'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <RefreshCw size={20} color="#10b981" className="animate-spin" />
                  <div>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
                      Gerando Livro {runnerState.currentIndex} de {runnerState.totalBooks} no Backend
                    </h4>
                    <span style={{ fontSize: 13, color: '#38bdf8' }}>
                      {runnerState.currentBookTitle} ({runnerState.currentGenre})
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 20, fontWeight: 900, color: '#10b981' }}>
                    {runnerState.percentage}%
                  </span>
                  <button
                    onClick={() => batchBackgroundRunner.cancelBatch()}
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#f87171',
                      padding: '6px 14px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Interromper Lote
                  </button>
                </div>
              </div>

              {/* Barra de Progresso */}
              <div style={{ width: '100%', height: 10, background: '#334155', borderRadius: 999, overflow: 'hidden', marginBottom: 14 }}>
                <div style={{
                  width: `${runnerState.percentage}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #10b981 0%, #38bdf8 100%)',
                  borderRadius: 999,
                  transition: 'width 0.3s ease'
                }} />
              </div>

              {/* Log Recente */}
              <div style={{
                maxHeight: 90,
                overflowY: 'auto',
                fontSize: 12,
                color: '#cbd5e1',
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '8px 12px',
                borderRadius: 8,
                fontFamily: 'monospace'
              }}>
                {runnerState.logs.slice(-4).map((log, lIdx) => (
                  <div key={lIdx} style={{ lineHeight: 1.5 }}>{log}</div>
                ))}
              </div>
            </div>
          )}

          {/* SEÇÃO 2: PARÂMETROS EDITORIAIS & CÁLCULO EXATO DE PÁGINAS */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '18px 22px'
          }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sliders size={18} color="#0284c7" />
              Parâmetros Editoriais & Metas de Páginas por Livro
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              {/* Capítulos */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  Quantidade de Capítulos: <strong style={{ color: '#0f172a' }}>{chaptersCount}</strong>
                </label>
                <input
                  type="range"
                  min={5}
                  max={25}
                  value={chaptersCount}
                  onChange={(e) => setChaptersCount(parseInt(e.target.value, 10))}
                  disabled={isRunning}
                  style={{ width: '100%', accentColor: '#0284c7' }}
                />
              </div>

              {/* Palavras por Capítulo */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  Palavras por Capítulo: <strong style={{ color: '#0f172a' }}>{wordsPerChapter.toLocaleString('pt-BR')}</strong>
                </label>
                <input
                  type="range"
                  min={800}
                  max={3500}
                  step={100}
                  value={wordsPerChapter}
                  onChange={(e) => setWordsPerChapter(parseInt(e.target.value, 10))}
                  disabled={isRunning}
                  style={{ width: '100%', accentColor: '#0284c7' }}
                />
              </div>

              {/* Autor */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  Nome do Autor(a):
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  disabled={isRunning}
                  placeholder="Nome do autor na capa"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    fontWeight: 600,
                    outline: 'none'
                  }}
                />
              </div>

              {/* Resultado Matemático de Páginas */}
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 10,
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase' }}>
                  Resultado KDP 6x9"
                </span>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#1e40af' }}>
                  ~{estimatedPages} páginas por obra
                </span>
                <span style={{ fontSize: 11, color: '#3b82f6' }}>
                  Total: {totalWordsPerBook.toLocaleString('pt-BR')} palavras integrais
                </span>
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: SELEÇÃO DE GÊNEROS (TODOS OS 28 GÊNEROS DA AMAZON KDP) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                  Escolha os Gêneros Editoriais da Amazon KDP ({filteredGenres.length} de {GENRE_PRESETS.length})
                </h4>
              </div>

              {/* Barra de Busca de Gêneros */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 380 }}>
                <div style={{
                  position: 'relative',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <Search size={15} style={{ position: 'absolute', left: 10, color: '#94a3b8' }} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar gênero (ex: ficção, finanças, romance, diy...)"
                    style={{
                      width: '100%',
                      padding: '7px 10px 7px 32px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                      outline: 'none'
                    }}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      style={{ position: 'absolute', right: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                  title="Selecionar todos os gêneros visíveis"
                >
                  Todos
                </button>

                <button
                  type="button"
                  onClick={handleDeselectAll}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                  title="Desmarcar todos"
                >
                  Nenhum
                </button>
              </div>
            </div>

            {/* Grid dos 28 Gêneros com Controles de Quantidade (1 a 20 Livros) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
              gap: 12,
              maxHeight: 380,
              overflowY: 'auto',
              paddingRight: 6
            }}>
              {filteredGenres.map(preset => {
                const isSelected = selectedGenres[preset.genreId]?.selected || false;
                const bookCount = selectedGenres[preset.genreId]?.count || 2;

                return (
                  <div
                    key={preset.genreId}
                    style={{
                      border: isSelected ? '2px solid #10b981' : '1px solid #e2e8f0',
                      background: isSelected ? '#f0fdf4' : '#ffffff',
                      borderRadius: 12,
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div 
                        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}
                        onClick={() => !isRunning && handleToggleGenre(preset.genreId)}
                      >
                        <div style={{
                          width: 20,
                          height: 20,
                          borderRadius: 6,
                          border: isSelected ? 'none' : '2px solid #94a3b8',
                          background: isSelected ? '#10b981' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          flexShrink: 0
                        }}>
                          {isSelected && <Check size={14} />}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: isSelected ? '#065f46' : '#0f172a', lineHeight: 1.2 }}>
                            {preset.genreName}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>
                            {preset.kdpCategory}
                          </div>
                        </div>
                      </div>

                      {/* Controle de 1 a 20 Livros para este Gênero */}
                      {isSelected && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#047857' }}>Qtd:</span>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={bookCount}
                            onChange={(e) => handleCountChange(preset.genreId, parseInt(e.target.value, 10))}
                            disabled={isRunning}
                            style={{
                              width: 52,
                              padding: '3px 6px',
                              borderRadius: 6,
                              border: '1px solid #10b981',
                              fontSize: 12,
                              fontWeight: 800,
                              textAlign: 'center',
                              background: '#ffffff',
                              color: '#047857'
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Exemplo de título gerado */}
                    <div style={{
                      fontSize: 11,
                      color: isSelected ? '#047857' : '#94a3b8',
                      background: isSelected ? 'rgba(16, 185, 129, 0.1)' : '#f8fafc',
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontStyle: 'italic',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      💡 Ex: "{preset.bestsellerIdeas[0]?.title}"
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RODAPÉ COM RESUMO E BOTÃO DE DISPARO */}
        <div style={{
          padding: '16px 28px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
              Total a Gerar no Lote: <strong style={{ color: '#059669', fontSize: 16 }}>{totalBooksToGenerate} livros</strong>
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Cada livro com ~{estimatedPages} páginas, texto integral, capa vetorial e auditoria KDP.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: 8,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {isRunning ? 'Minimizar (Continuar na Dashboard)' : 'Cancelar'}
            </button>

            <button
              onClick={handleStartBatch}
              disabled={isRunning || totalBooksToGenerate === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 24px',
                borderRadius: 8,
                background: isRunning 
                  ? '#94a3b8' 
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                fontSize: 14,
                fontWeight: 800,
                cursor: isRunning || totalBooksToGenerate === 0 ? 'not-allowed' : 'pointer',
                boxShadow: isRunning ? 'none' : '0 4px 14px rgba(16, 185, 129, 0.35)',
                transition: 'all 0.15s ease'
              }}
            >
              {isRunning ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Gerando Lote ({runnerState.percentage}%)...
                </>
              ) : (
                <>
                  <Zap size={16} />
                  Iniciar Geração em Lote ({totalBooksToGenerate} Livros)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
