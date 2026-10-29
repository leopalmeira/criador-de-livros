import React from 'react';
import {
  Compass, BarChart3, BookOpen, Sparkles, Layers,
  Palette, ShieldCheck, FileText, Check, ChevronRight
} from 'lucide-react';

interface Props {
  wizardStep: number;
  setWizardStep: (step: number) => void;
  temaSelecionado: string;
  marketReferencesCount: number;
  titulo: string;
  uniqueAngle: string;
  bookPromise: string;
  targetReader: string;
  topico: string;
  autor: string;
  livroGerado: boolean;
  totalCapitulosGerados: number;
  activeTab: 'preview' | 'capa' | 'promo' | 'auditoria' | 'planner' | 'coauthor';
  setActiveTab: (tab: 'preview' | 'capa' | 'promo' | 'auditoria' | 'planner' | 'coauthor') => void;
  ui: (pt: string, en: string) => string;
}

export const KdpCoAuthorFlowSidebar: React.FC<Props> = ({
  wizardStep,
  setWizardStep,
  temaSelecionado,
  marketReferencesCount,
  titulo,
  uniqueAngle,
  bookPromise,
  targetReader,
  topico,
  autor,
  livroGerado,
  totalCapitulosGerados,
  activeTab,
  setActiveTab,
  ui
}) => {
  const steps = [
    {
      step: 1,
      slug: 'theme',
      title: ui('Tema & Nicho', 'Theme & Niche'),
      subtitle: ui('Gênero, subtema e idioma', 'Genre, subtheme & language'),
      icon: '🎯',
      isComplete: !!temaSelecionado,
      isUnlocked: true
    },
    {
      step: 2,
      slug: 'market',
      title: ui('Mercado & Bestsellers', 'Market & Bestsellers'),
      subtitle: ui('Concorrentes e BSR Amazon', 'Competitors & Amazon BSR'),
      icon: '📊',
      isComplete: marketReferencesCount > 0,
      isUnlocked: !!temaSelecionado
    },
    {
      step: 3,
      slug: 'title',
      title: ui('Título & Subtítulo', 'Title & Subtitle'),
      subtitle: ui('Titulação comercial KDP', 'Commercial KDP titling'),
      icon: '📖',
      isComplete: !!titulo.trim(),
      isUnlocked: !!temaSelecionado
    },
    {
      step: 4,
      slug: 'differentiation',
      title: ui('Diferencial & Gancho', 'Edge & Core Hook'),
      subtitle: ui('Ângulo único e promessa', 'Unique angle & promise'),
      icon: '💡',
      isComplete: !!(uniqueAngle.trim() || bookPromise.trim() || targetReader.trim()),
      isUnlocked: !!titulo.trim()
    },
    {
      step: 5,
      slug: 'structure',
      title: ui('Estrutura Editorial', 'Editorial Structure'),
      subtitle: ui('Capítulos e tom narrativo', 'Chapters & narrative tone'),
      icon: '✍️',
      isComplete: !!topico.trim() && !!autor.trim(),
      isUnlocked: !!titulo.trim()
    },
    {
      step: 6,
      slug: 'production',
      title: ui('Produção & Escrita IA', 'Production & AI Writing'),
      subtitle: ui('Geração do miolo e livro', 'Book content generation'),
      icon: '🚀',
      isComplete: livroGerado,
      isUnlocked: !!titulo.trim() && !!topico.trim()
    }
  ];

  return (
    <aside
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '16px 14px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 70,
        maxHeight: 'calc(100vh - 86px)',
        overflowY: 'auto',
        boxSizing: 'border-box'
      }}
    >
      {/* CABEÇALHO DO FLUXO (ESTILO COAUTHOR) */}
      <div style={{ marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#0284c7' }}>
            {ui(`Passo ${wizardStep} de 6`, `Step ${wizardStep} of 6`)}
          </span>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: 4,
            background: livroGerado ? '#ecfdf5' : '#f1f5f9',
            color: livroGerado ? '#059669' : '#64748b'
          }}>
            {livroGerado ? `${totalCapitulosGerados} caps` : ui('Em Edição', 'Drafting')}
          </span>
        </div>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0 }}>
          {ui('Fluxo de Criação da Obra', 'Book Creation Flow')}
        </h3>
        <p style={{ fontSize: 11, color: '#64748b', margin: '3px 0 0', lineHeight: 1.3 }}>
          {ui('Coluna inteligente guiada para bestsellers KDP', 'Guided smart column for KDP bestsellers')}
        </p>
      </div>

      {/* TIMELINE VERTICAL DOS PASSOS COM LINHA CONECTORA */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
        {steps.map((s, idx) => {
          const isActive = wizardStep === s.step;
          const isComplete = s.isComplete;
          const isUnlocked = s.isUnlocked;
          const isLast = idx === steps.length - 1;

          return (
            <div
              key={s.step}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                position: 'relative',
                paddingBottom: isLast ? 8 : 18
              }}
            >
              {/* LINHA VERTICAL CONECTORA ENTRE OS PASSOS (ESTILO COAUTHOR) */}
              {!isLast && (
                <div
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: 26,
                    bottom: 0,
                    width: 2,
                    background: isComplete ? '#10b981' : '#e2e8f0',
                    transition: 'background 0.3s ease',
                    zIndex: 1
                  }}
                />
              )}

              {/* BOTÃO DO PASSO */}
              <button
                type="button"
                onClick={() => {
                  if (isUnlocked) setWizardStep(s.step);
                }}
                disabled={!isUnlocked}
                title={isUnlocked ? s.title : ui('Complete os passos anteriores', 'Complete prior steps')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  background: isActive ? '#f0fdf4' : 'transparent',
                  border: 'none',
                  borderRadius: 8,
                  padding: '6px 8px',
                  width: '100%',
                  textAlign: 'left',
                  cursor: isUnlocked ? 'pointer' : 'not-allowed',
                  opacity: isUnlocked ? 1 : 0.45,
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  zIndex: 2
                }}
              >
                {/* CÍCULO INDICADOR (COM ANEL DUPLO QUANDO ATIVO) */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: 12,
                    fontWeight: 800,
                    background: isActive
                      ? '#0f172a'
                      : isComplete
                        ? '#10b981'
                        : '#ffffff',
                    color: (isActive || isComplete) ? '#ffffff' : '#64748b',
                    border: isActive
                      ? '3px solid #38bdf8'
                      : isComplete
                        ? '2px solid #10b981'
                        : '2px solid #cbd5e1',
                    boxShadow: isActive ? '0 0 0 3px rgba(56, 189, 248, 0.25)' : 'none',
                    transition: 'all 0.25s ease'
                  }}
                >
                  {isComplete && !isActive ? (
                    <Check size={14} strokeWidth={3} />
                  ) : (
                    <span>{s.step}</span>
                  )}
                </div>

                {/* TEXTO DO PASSO */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: isActive ? 800 : 600,
                      color: isActive ? '#0f172a' : isComplete ? '#059669' : '#334155',
                      lineHeight: 1.25,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>{s.title}</span>
                    {isActive && <ChevronRight size={13} color="#0284c7" />}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: isActive ? '#0369a1' : '#64748b',
                      marginTop: 2,
                      lineHeight: 1.2
                    }}
                  >
                    {s.subtitle}
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* DIVISOR DE ACABAMENTOS & FERRAMENTAS DO BOOKENGIN */}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          {ui('Acabamento & Publicação', 'Finishing & Publishing')}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 9px',
              borderRadius: 6,
              border: activeTab === 'preview' ? '1px solid #0f172a' : '1px solid transparent',
              background: activeTab === 'preview' ? '#0f172a' : '#f8fafc',
              color: activeTab === 'preview' ? '#ffffff' : '#334155',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <Palette size={13} color={activeTab === 'preview' ? '#38bdf8' : '#0284c7'} />
            <div style={{ flex: 1 }}>
              <div>{ui('Miolo KDP & Silhuetas', 'KDP Interior & Silhouette')}</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('capa')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 9px',
              borderRadius: 6,
              border: activeTab === 'capa' ? '1px solid #0f172a' : '1px solid transparent',
              background: activeTab === 'capa' ? '#0f172a' : '#f8fafc',
              color: activeTab === 'capa' ? '#ffffff' : '#334155',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <BookOpen size={13} color={activeTab === 'capa' ? '#38bdf8' : '#64748b'} />
            <div style={{ flex: 1 }}>
              <div>{ui('Direção de Capa KDP', 'KDP Cover Art Direction')}</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('auditoria')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 9px',
              borderRadius: 6,
              border: activeTab === 'auditoria' ? '1px solid #0f172a' : '1px solid transparent',
              background: activeTab === 'auditoria' ? '#0f172a' : '#f8fafc',
              color: activeTab === 'auditoria' ? '#ffffff' : '#334155',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <ShieldCheck size={13} color={activeTab === 'auditoria' ? '#38bdf8' : '#16a34a'} />
            <div style={{ flex: 1 }}>
              <div>{ui('Auditoria Editorial', 'Editorial Quality Audit')}</div>
            </div>
          </button>
        </div>
      </div>
    </aside>
  );
};
