import React, { useState } from 'react';
import { 
  Wrench, 
  BookOpen, 
  Layers, 
  Cpu, 
  Hammer, 
  Sun, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  X,
  FileCode,
  Shield,
  Download
} from 'lucide-react';
import { 
  PUBLIC_TECHNICAL_MANUALS, 
  TechnicalManualProject,
  convertTechnicalManualToBookProject
} from '../../../services/technical-manuals-catalog';
import { db } from '../../../database/local-database';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: (projectId: string) => void;
}

export const TechnicalManualsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onProjectCreated
}) => {
  const [selectedManual, setSelectedManual] = useState<TechnicalManualProject>(PUBLIC_TECHNICAL_MANUALS[0]);
  const [activeStepTab, setActiveStepTab] = useState<number>(1);
  const [isConverting, setIsConverting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentStep = selectedManual.steps.find(s => s.stepNumber === activeStepTab) || selectedManual.steps[0];

  const handleConvertToBook = async () => {
    setIsConverting(true);
    setSuccessMessage(null);
    try {
      const bookProj = convertTechnicalManualToBookProject(selectedManual);
      await db.saveBookProject(bookProj);
      window.dispatchEvent(new CustomEvent('kdp-final-books-updated'));
      setSuccessMessage(`✓ Manual "${selectedManual.title}" transformado em Livro KDP e salvo no painel com sucesso!`);
      setTimeout(() => {
        if (onProjectCreated) {
          onProjectCreated(bookProj.id);
        }
      }, 1200);
    } catch (err) {
      console.error('Erro ao converter manual técnico:', err);
    } finally {
      setIsConverting(false);
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
        maxWidth: 1100,
        maxHeight: '92vh',
        background: '#0f172a',
        border: '1px solid #334155',
        borderRadius: 16,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        color: '#f8fafc'
      }}>
        {/* CABEÇALHO DO MODAL */}
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
              width: 38,
              height: 38,
              borderRadius: 10,
              background: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Wrench size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#ffffff' }}>
                  Manuais Técnicos & "Como Fazer Coisas"
                </h3>
                <span style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 4,
                  border: '1px solid rgba(56, 189, 248, 0.3)'
                }}>
                  Projetos Públicos com Imagens & Textos
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#94a3b8' }}>
                Instruções práticas baseadas em arquivos públicos de engenharia com diagramas esquemáticos cotados
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

        {/* FEEDBACK DE SUCESSO */}
        {successMessage && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            borderBottom: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '10px 24px',
            color: '#34d399',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <CheckCircle2 size={16} /> {successMessage}
          </div>
        )}

        {/* CORPO DO MODAL (DUAS COLUNAS: LISTA DE PROJETOS + VISUALIZADOR TÉCNICO) */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          
          {/* COLUNA ESQUERDA: LISTA DE PROJETOS PÚBLICOS */}
          <div style={{
            width: 320,
            borderRight: '1px solid #1e293b',
            background: '#090d16',
            padding: 16,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Projetos Maker Catalogados
            </span>

            {PUBLIC_TECHNICAL_MANUALS.map((m) => {
              const isSelected = selectedManual.id === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => {
                    setSelectedManual(m);
                    setActiveStepTab(1);
                  }}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    background: isSelected ? 'rgba(56, 189, 248, 0.12)' : '#0f172a',
                    border: isSelected ? '1px solid #38bdf8' : '1px solid #1e293b',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    {m.category === 'Eletrônica & Rádio' && <Cpu size={14} color="#38bdf8" />}
                    {m.category === 'Marcenaria & Móveis' && <Hammer size={14} color="#f59e0b" />}
                    {m.category === 'Energia Solar' && <Sun size={14} color="#eab308" />}
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8' }}>{m.category}</span>
                  </div>

                  <h4 style={{ margin: '0 0 4px 0', fontSize: 13, fontWeight: 700, color: '#ffffff', lineHeight: 1.3 }}>
                    {m.title}
                  </h4>

                  <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.3 }}>
                    {m.publicProjectSource}
                  </p>
                </div>
              );
            })}

            {/* CARD DE SUGESTÃO DE IA */}
            <div style={{
              marginTop: 'auto',
              padding: 14,
              borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(168, 85, 247, 0.15))',
              border: '1px solid rgba(168, 85, 247, 0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Sparkles size={15} color="#c084fc" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#e9d5ff' }}>IA Guia Maker</span>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: '#cbd5e1', lineHeight: 1.4 }}>
                A IA pode pesquisar e estruturar qualquer manual técnico ou projeto com base em arquivos de patentes públicas e esquemas abertos.
              </p>
            </div>
          </div>

          {/* COLUNA DIREITA: VISUALIZADOR DE PASSOS COM IMAGENS TÉCNICAS E TEXTOS */}
          <div style={{ flex: 1, padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* CABEÇALHO DO MANUAL SELECIONADO */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
              <div style={{ maxWidth: 540 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#ffffff' }}>
                  {selectedManual.title}
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#94a3b8' }}>
                  {selectedManual.subtitle}
                </p>
                <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: '#64748b' }}>
                  <span>⏳ Duração estimada: {selectedManual.estimatedHours} horas</span>
                  <span>•</span>
                  <span>🎯 Nível: {selectedManual.difficulty}</span>
                  <span>•</span>
                  <span>📖 Formato KDP: 6x9 com diagramas</span>
                </div>
              </div>

              {/* BOTÃO PARA TRANSFORMAR O MANUAL EM LIVRO KDP NO PAINEL */}
              <button
                onClick={handleConvertToBook}
                disabled={isConverting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
                }}
              >
                {isConverting ? (
                  <span>Criando Obra KDP...</span>
                ) : (
                  <>
                    <BookOpen size={16} /> Transformar em Livro KDP no Painel <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>

            {/* SELETOR DE ETAPAS / PASSOS DO MANUAL */}
            <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #1e293b', paddingBottom: 10 }}>
              {selectedManual.steps.map((st) => (
                <button
                  key={st.stepNumber}
                  onClick={() => setActiveStepTab(st.stepNumber)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 6,
                    background: activeStepTab === st.stepNumber ? '#1e293b' : 'transparent',
                    border: activeStepTab === st.stepNumber ? '1px solid #38bdf8' : '1px solid transparent',
                    color: activeStepTab === st.stepNumber ? '#38bdf8' : '#94a3b8',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Passo {st.stepNumber}: {st.title.split(' ')[0]}...
                </button>
              ))}
            </div>

            {/* ÁREA PRINCIPAL: IMAGEM TÉCNICA (DIAGRAMA ESQUEMÁTICO) + TEXTO ESTRUTURADO */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {/* 1. IMAGEM TÉCNICA COM DIAGRAMA SVG COTADO */}
              <div style={{
                background: '#050c18',
                border: '1px solid #1e293b',
                borderRadius: 12,
                padding: 12,
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, padding: '0 4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileCode size={15} color="#38bdf8" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8' }}>
                      {currentStep.diagramTitle}
                    </span>
                  </div>
                  <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>
                    Diagrama Técnico Vetorial de Alta Definição (300 DPI KDP Ready)
                  </span>
                </div>

                {/* Renderização do Diagrama SVG */}
                <div
                  style={{ width: '100%', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}
                  dangerouslySetInnerHTML={{ __html: currentStep.diagramSvg }}
                />
              </div>

              {/* 2. TEXTO EXPLICATIVO DO MANUAL (PASSO A PASSO) */}
              <div style={{
                background: '#131d2e',
                border: '1px solid #1e293b',
                borderRadius: 12,
                padding: 20
              }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: 16, fontWeight: 700, color: '#ffffff' }}>
                  Passo {currentStep.stepNumber}: {currentStep.title}
                </h3>
                <p style={{ margin: 0, fontSize: 14, color: '#cbd5e1', lineHeight: 1.6 }}>
                  {currentStep.description}
                </p>

                {/* Grid de Especificações, Ferramentas e Materiais */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 18 }}>
                  
                  {/* Especificações Técnicas */}
                  <div style={{ background: '#090f1d', padding: 14, borderRadius: 8, border: '1px solid #1e293b' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', display: 'block', marginBottom: 8 }}>
                      📐 Parâmetros & Tolerâncias Técnicas
                    </span>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                      {currentStep.technicalSpecs.map((spec, i) => (
                        <li key={i}>{spec}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Ferramentas & Materiais */}
                  <div style={{ background: '#090f1d', padding: 14, borderRadius: 8, border: '1px solid #1e293b' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', display: 'block', marginBottom: 8 }}>
                      🛠️ Ferramentas & Materiais Necessários
                    </span>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                      {currentStep.toolsRequired.map((tool, i) => (
                        <li key={i}>Ferramenta: {tool}</li>
                      ))}
                      {currentStep.materialsRequired.map((mat, i) => (
                        <li key={`mat-${i}`}>Material: {mat}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Avisos de Segurança se houver */}
                  {currentStep.safetyWarnings && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: 14, borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#f87171', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <AlertTriangle size={14} /> Protocolo de Segurança
                      </span>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#fca5a5', lineHeight: 1.5 }}>
                        {currentStep.safetyWarnings.map((warn, i) => (
                          <li key={i}>{warn}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
