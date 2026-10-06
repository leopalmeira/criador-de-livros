import React, { useState } from 'react';
import { 
  Palette, 
  ExternalLink, 
  ShieldCheck, 
  AlertTriangle, 
  Sparkles, 
  Check, 
  RefreshCw, 
  X, 
  Eye, 
  BookOpen, 
  TrendingUp,
  Layers
} from 'lucide-react';
import { 
  AMAZON_COVER_10_STYLES, 
  calculateCoverAcceptanceRate, 
  CoverStyleDefinition 
} from '../../../services/amazon-cover-styles';
import { BookProject } from '../../../types/book-project';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  project?: BookProject | null;
  onApplyStyle?: (style: CoverStyleDefinition) => void;
}

export const BestsellerCover10StylesModal: React.FC<Props> = ({
  isOpen,
  onClose,
  project,
  onApplyStyle
}) => {
  const [selectedStyleId, setSelectedStyleId] = useState<string>(AMAZON_COVER_10_STYLES[0].id);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateSuccess, setRegenerateSuccess] = useState(false);

  if (!isOpen) return null;

  const currentBookTitle = project?.title || 'Título da Sua Obra Editorial';
  const currentBookSubtitle = project?.subtitle || 'Subtítulo Comercial de Alto Impacto';
  const currentGenre = project?.categories?.[0] || 'Não-Ficção';

  const selectedStyle = AMAZON_COVER_10_STYLES.find(s => s.id === selectedStyleId) || AMAZON_COVER_10_STYLES[0];

  // Cálculo analítico do Grau de Aceitação da Capa
  const acceptanceMetrics = calculateCoverAcceptanceRate({
    styleId: selectedStyle.id,
    title: currentBookTitle,
    subtitle: currentBookSubtitle,
    genre: currentGenre
  });

  const handleRegenerateAlternative = () => {
    setIsRegenerating(true);
    setRegenerateSuccess(false);

    // Simulação de regeneração otimizada
    setTimeout(() => {
      setIsRegenerating(false);
      setRegenerateSuccess(true);
      setTimeout(() => setRegenerateSuccess(false), 3000);
    }, 600);
  };

  const handleApply = () => {
    if (onApplyStyle) {
      onApplyStyle(selectedStyle);
    }
    onClose();
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
        maxWidth: 1100,
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
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)'
            }}>
              <Palette size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#ffffff' }}>
                  10 Estilos de Capas Baseados em Best-Sellers da Amazon
                </h3>
                <span style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#fbbf24',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 4,
                  border: '1px solid rgba(245, 158, 11, 0.3)'
                }}>
                  Direcionamento Validado • Links da Amazon • Grau de Aceitação
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#94a3b8' }}>
                Capas estruturadas com base nos livros mais vendidos do mundo, com comparação direta de títulos e controle analítico de conversão
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* CORPO: DUAS COLUNAS (LISTA DOS 10 ESTILOS + DETALHES COM BENCHMARKS E SCORE) */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          
          {/* COLUNA ESQUERDA: LISTA DOS 10 ESTILOS DIRECIONADOS */}
          <div style={{
            width: 340,
            borderRight: '1px solid #1e293b',
            background: '#090d16',
            padding: 16,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Selecione o Estilo Direcionado:
            </span>

            {AMAZON_COVER_10_STYLES.map((st) => {
              const isSelected = st.id === selectedStyle.id;
              return (
                <div
                  key={st.id}
                  onClick={() => setSelectedStyleId(st.id)}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    background: isSelected ? 'rgba(245, 158, 11, 0.12)' : '#0f172a',
                    border: isSelected ? '1px solid #f59e0b' : '1px solid #1e293b',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? '#fbbf24' : '#ffffff' }}>
                      {st.name}
                    </span>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>
                      #{st.number}
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.3 }}>
                    {st.shortDesc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* COLUNA DIREITA: DETALHE DO ESTILO, BENCHMARK DA AMAZON E GRAU DE ACEITAÇÃO */}
          <div style={{ flex: 1, padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* 1. PAINEL DE GRAU DE ACEITAÇÃO DA CAPA (REGRA DO LIMIAR DE 70%) */}
            <div style={{
              padding: 16,
              borderRadius: 12,
              background: acceptanceMetrics.score >= 70 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: acceptanceMetrics.score >= 70 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    border: `3px solid ${acceptanceMetrics.score >= 70 ? '#10b981' : '#ef4444'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: 16,
                    color: acceptanceMetrics.score >= 70 ? '#34d399' : '#f87171'
                  }}>
                    {acceptanceMetrics.score}%
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#ffffff' }}>
                        Grau de Aceitação da Capa (Amazon KDP)
                      </span>
                      {acceptanceMetrics.score >= 70 ? (
                        <span style={{ background: '#022c22', color: '#34d399', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                          ✓ Aprovado para Vendas (&gt;= 70%)
                        </span>
                      ) : (
                        <span style={{ background: '#450a0a', color: '#f87171', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                          ⚠️ Abaixo de 70% (Atenção)
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#cbd5e1' }}>
                      {acceptanceMetrics.recommendation}
                    </p>
                  </div>
                </div>

                {/* BOTÃO DE REGENERAR CASO ESTEJA ABAIXO DE 70% */}
                {acceptanceMetrics.needsRegeneration && (
                  <button
                    onClick={handleRegenerateAlternative}
                    disabled={isRegenerating}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      borderRadius: 8,
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)'
                    }}
                  >
                    <RefreshCw size={14} className={isRegenerating ? 'animate-spin' : ''} />
                    {isRegenerating ? 'Gerando Nova Capa...' : 'Gerar Outra Capa Otimizada'}
                  </button>
                )}
              </div>

              {/* MÉTRICAS ESPECÍFICAS DE ACEITAÇÃO */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 6, textAlign: 'center' }}>
                  <span style={{ fontSize: 10, color: '#94a3b8', display: 'block' }}>Miniatura (Thumbnail)</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>{acceptanceMetrics.thumbnailLegibilityScore}%</span>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 6, textAlign: 'center' }}>
                  <span style={{ fontSize: 10, color: '#94a3b8', display: 'block' }}>Contraste de Cores</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>{acceptanceMetrics.colorContrastScore}%</span>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 6, textAlign: 'center' }}>
                  <span style={{ fontSize: 10, color: '#94a3b8', display: 'block' }}>Aderência ao Nicho</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>{acceptanceMetrics.genreAlignmentScore}%</span>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 6, textAlign: 'center' }}>
                  <span style={{ fontSize: 10, color: '#94a3b8', display: 'block' }}>Clareza Focal</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>{acceptanceMetrics.focalPointClarityScore}%</span>
                </div>
              </div>
            </div>

            {/* 2. INSPIRADA NOS BEST-SELLERS DA AMAZON (PELO MENOS 2 TÍTULOS COM LINKS OFICIAIS) */}
            <div style={{ background: '#131d2e', padding: 18, borderRadius: 12, border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <TrendingUp size={18} color="#f59e0b" />
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#ffffff' }}>
                  Inspirada nos Best-Sellers da Amazon (Benchmark Oficial)
                </h4>
              </div>
              <p style={{ margin: '0 0 14px 0', fontSize: 12, color: '#94a3b8' }}>
                Esta capa não foi criada aleatoriamente. Ela reproduz a arquitetura visual, contraste e tipografia comprovados pelos seguintes líderes de venda da Amazon:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                {selectedStyle.bestsellerBenchmarks.map((bench, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#090f1d',
                      border: '1px solid #334155',
                      borderRadius: 10,
                      padding: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 10
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, background: '#1e293b', color: '#fbbf24', padding: '2px 6px', borderRadius: 4 }}>
                          {bench.rankBadge}
                        </span>
                        <span style={{ fontSize: 10, color: '#64748b' }}>ASIN: {bench.asin}</span>
                      </div>

                      <h5 style={{ margin: '0 0 2px 0', fontSize: 14, fontWeight: 700, color: '#ffffff' }}>
                        {bench.title}
                      </h5>
                      <span style={{ fontSize: 11, color: '#38bdf8', display: 'block', marginBottom: 8 }}>
                        por {bench.author}
                      </span>

                      <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>
                        💡 <strong>Por que vende na Amazon:</strong> {bench.whyItConverts}
                      </p>
                    </div>

                    {/* LINK OFICIAL DA AMAZON PARA COMPARAÇÃO */}
                    <a
                      href={bench.amazonUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '8px 12px',
                        borderRadius: 6,
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        color: '#fbbf24',
                        textDecoration: 'none',
                        fontSize: 12,
                        fontWeight: 700,
                        transition: 'all 0.15s'
                      }}
                    >
                      <ExternalLink size={13} /> Comparar na Amazon ({bench.asin})
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. VISUALIZAÇÃO E APLICAÇÃO DA CAPA NO LIVRO ATUAL */}
            <div style={{
              background: '#131d2e',
              padding: 18,
              borderRadius: 12,
              border: '1px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 14
            }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                  Fórmula Visual Aplicada:
                </span>
                <p style={{ margin: '4px 0', fontSize: 13, color: '#cbd5e1', maxWidth: 520 }}>
                  {selectedStyle.visualFormula}
                </p>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                  Tipografia: {selectedStyle.typographyStyle}
                </span>
              </div>

              <button
                onClick={handleApply}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 22px',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#0f172a',
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
                }}
              >
                <Check size={16} /> Aplicar Este Estilo à Minha Capa
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
