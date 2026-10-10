import React, { useState, useEffect } from 'react';
import {
  BookOpen, Volume2, VolumeX, Pause, Play, Download,
  Share2, ArrowLeft, ArrowRight, CheckCircle2, ChevronRight,
  Sparkles, ExternalLink, Copy, Check
} from 'lucide-react';
import { CoursePedagogicalPlan, CourseModule, CourseLesson } from '../../../types/course-ebook';
import { CourseNarrationService } from '../../../services/course-narration-service';
import { CoursePdfExporter } from '../../../services/course-pdf-exporter';

interface Props {
  plan: CoursePedagogicalPlan;
  coverImageUrl?: string;
  authorName?: string;
  onClose?: () => void;
}

export const CourseDigitalReader: React.FC<Props> = ({
  plan,
  coverImageUrl,
  authorName = 'Especialista BookEngin',
  onClose
}) => {
  const [activeModuleIdx, setActiveModuleIdx] = useState(0);
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const currentMod = plan.modules[activeModuleIdx] || plan.modules[0];
  const currentLes = currentMod?.lessons[activeLessonIdx] || currentMod?.lessons[0];

  // Para o áudio quando trocar de aula ou desmontar
  useEffect(() => {
    CourseNarrationService.stop();
    setIsAudioPlaying(false);
    return () => {
      CourseNarrationService.stop();
    };
  }, [activeModuleIdx, activeLessonIdx]);

  const handleToggleAudio = () => {
    if (!currentLes) return;

    if (isAudioPlaying) {
      CourseNarrationService.stop();
      setIsAudioPlaying(false);
    } else {
      const textToSpeak = CourseNarrationService.composeLessonNarrationText(currentLes);
      CourseNarrationService.speak(textToSpeak, {
        onStart: () => setIsAudioPlaying(true),
        onEnd: () => setIsAudioPlaying(false),
        onError: () => setIsAudioPlaying(false)
      });
    }
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDownloadPdf = () => {
    CoursePdfExporter.downloadCoursePdf(plan, {
      authorName,
      coverDataUrl: coverImageUrl
    });
  };

  // Navegação
  const handleNextLesson = () => {
    if (!currentMod) return;
    if (activeLessonIdx < currentMod.lessons.length - 1) {
      setActiveLessonIdx(activeLessonIdx + 1);
    } else if (activeModuleIdx < plan.modules.length - 1) {
      setActiveModuleIdx(activeModuleIdx + 1);
      setActiveLessonIdx(0);
    }
  };

  const handlePrevLesson = () => {
    if (activeLessonIdx > 0) {
      setActiveLessonIdx(activeLessonIdx - 1);
    } else if (activeModuleIdx > 0) {
      setActiveModuleIdx(activeModuleIdx - 1);
      const prevMod = plan.modules[activeModuleIdx - 1];
      setActiveLessonIdx(prevMod ? prevMod.lessons.length - 1 : 0);
    }
  };

  if (!currentLes) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Carregando conteúdo do e-book...</div>;
  }

  const ba = currentLes.beforeAfterComparison;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', display: 'flex', flexDirection: 'column' }}>
      {/* BARRA SUPERIOR FIXA */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: '#0f172a',
        color: '#ffffff',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#ffffff',
                padding: '6px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13
              }}
            >
              <ArrowLeft size={16} /> Voltar ao Painel
            </button>
          )}
          <div>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Leitor Digital Oficial • {plan.themeCategory}
            </span>
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 450 }}>
              {plan.courseTitle}
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Botão de Áudio Feminino */}
          <button
            onClick={handleToggleAudio}
            style={{
              background: isAudioPlaying ? '#ef4444' : '#10b981',
              color: '#ffffff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}
          >
            {isAudioPlaying ? <Pause size={16} /> : <Volume2 size={16} />}
            {isAudioPlaying ? 'Pausar Áudio' : 'Ouvir Aula (Voz Feminina)'}
          </button>

          {/* Botão Copiar Link */}
          <button
            onClick={handleCopyShareLink}
            style={{
              background: '#334155',
              color: '#ffffff',
              border: 'none',
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            {copiedLink ? <Check size={16} color="#10b981" /> : <Share2 size={16} />}
            {copiedLink ? 'Link Copiado!' : 'Compartilhar Link'}
          </button>

          {/* Baixar PDF */}
          <button
            onClick={handleDownloadPdf}
            style={{
              background: '#f59e0b',
              color: '#0f172a',
              border: 'none',
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Download size={16} /> Baixar PDF
          </button>
        </div>
      </header>

      {/* ÁREA DE LEITURA (SPLIT: SUMÁRIO + CONTEÚDO) */}
      <div style={{ display: 'flex', flex: 1, maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        {/* SIDEBAR COM MÓDULOS E AULAS */}
        <aside style={{
          width: 320,
          background: '#ffffff',
          borderRight: '1px solid #e2e8f0',
          padding: '24px 16px',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 65px)'
        }}>
          {coverImageUrl && (
            <div style={{ marginBottom: 20, borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <img src={coverImageUrl} alt={plan.courseTitle} style={{ width: '100%', display: 'block' }} />
            </div>
          )}

          <h3 style={{ fontSize: 13, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 12 }}>
            Sumário do Curso
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {plan.modules.map((mod, mIdx) => (
              <div key={mod.id || mIdx}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: 6 }}>
                  MÓDULO {mod.moduleNumber}: {mod.title}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {mod.lessons.map((les, lIdx) => {
                    const isSelected = activeModuleIdx === mIdx && activeLessonIdx === lIdx;
                    return (
                      <button
                        key={les.id || lIdx}
                        onClick={() => {
                          setActiveModuleIdx(mIdx);
                          setActiveLessonIdx(lIdx);
                        }}
                        style={{
                          textAlign: 'left',
                          padding: '8px 12px',
                          borderRadius: 6,
                          border: isSelected ? '1px solid #f59e0b' : '1px solid transparent',
                          background: isSelected ? '#fef3c7' : 'transparent',
                          color: isSelected ? '#92400e' : '#334155',
                          fontSize: 12.5,
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s'
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Aula {les.lessonNumber}: {les.title}
                        </span>
                        {isSelected && <ChevronRight size={14} color="#f59e0b" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* ÁREA PRINCIPAL DA AULA (LETRAS 10% MAIORES E TIPOGRAFIA CONFORTÁVEL) */}
        <main style={{
          flex: 1,
          padding: '40px 50px',
          maxWidth: 900,
          margin: '0 auto',
          background: '#ffffff',
          boxShadow: '0 0 20px rgba(0,0,0,0.03)',
          minHeight: 'calc(100vh - 65px)'
        }}>
          {/* Breadcrumb e Módulo */}
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>
            <span>MÓDULO {currentMod.moduleNumber}: {currentMod.title}</span>
            <span>•</span>
            <span>AULA {currentLes.lessonNumber}</span>
          </div>

          {/* TÍTULO DA AULA (+10% MAIOR) */}
          <h2 style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', margin: '0 0 16px', lineHeight: 1.25 }}>
            {currentLes.title}
          </h2>

          {/* BOX DE OBJETIVO */}
          <div style={{
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: 8,
            padding: '12px 18px',
            marginBottom: 28,
            fontSize: '1rem',
            color: '#0369a1'
          }}>
            <strong>Objetivo: </strong>{currentLes.objective}
          </div>

          {/* INTRODUÇÃO (+10% MAIOR) */}
          {currentLes.introduction && (
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>
                Introdução e Contexto Prático
              </h3>
              <p style={{ fontSize: '1.08rem', lineHeight: 1.8, color: '#334155', margin: 0, textAlign: 'justify' }}>
                {currentLes.introduction}
              </p>
            </div>
          )}

          {/* EXPLICAÇÃO DIDÁTICA (+10% MAIOR) */}
          {currentLes.didacticExplanation && (
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>
                Fundamentos Técnicos e Execução
              </h3>
              <p style={{ fontSize: '1.08rem', lineHeight: 1.8, color: '#334155', margin: 0, textAlign: 'justify' }}>
                {currentLes.didacticExplanation}
              </p>
            </div>
          )}

          {/* ILUSTRAÇÃO PRINCIPAL DA ETAPA */}
          {currentLes.images && currentLes.images.length > 0 && currentLes.images[0].imageDataUrl && (
            <div style={{ marginBottom: 36, textAlign: 'center' }}>
              <div style={{ maxWidth: 650, margin: '0 auto', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}>
                <img src={currentLes.images[0].imageDataUrl} alt={currentLes.title} style={{ width: '100%', display: 'block' }} />
              </div>
              <span style={{ fontSize: 12, fontStyle: 'italic', color: '#64748b', marginTop: 8, display: 'inline-block' }}>
                Figura {currentMod.moduleNumber}.{currentLes.lessonNumber} — Procedimento prático demonstrado
              </span>
            </div>
          )}

          {/* ========================================================= */}
          {/* SEÇÃO COMPARAÇÃO ANTES E DEPOIS (REQUISITO EXPLÍCITO) */}
          {/* ========================================================= */}
          {ba && (ba.beforeImageDataUrl || ba.afterImageDataUrl || ba.beforeDescription || ba.afterDescription) && (
            <section style={{
              background: '#f8fafc',
              border: '2px solid #e2e8f0',
              borderRadius: 14,
              padding: 24,
              marginBottom: 36
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={20} color="#f59e0b" />
                Comparação de Resultado: Antes e Depois
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* 1. CARD ANTES COM SELO VERMELHO */}
                <div style={{ border: '1px solid #fecaca', borderRadius: 10, overflow: 'hidden', background: '#ffffff', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
                  <div style={{ position: 'relative', height: 260, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {ba.beforeImageDataUrl || ba.beforeImageUrl ? (
                      <img
                        src={ba.beforeImageDataUrl || ba.beforeImageUrl}
                        alt="Estado Antes"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: 13 }}>Foto do estado inicial</span>
                    )}
                    {/* SELO NO CANTO SUPERIOR ESQUERDO COM FUNDO VERMELHO */}
                    <div style={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      background: '#dc2626',
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: 900,
                      letterSpacing: 1,
                      padding: '4px 14px',
                      borderRadius: 4,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      textTransform: 'uppercase'
                    }}>
                      ANTES
                    </div>
                  </div>
                  <div style={{ padding: 14 }}>
                    <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                      {ba.beforeDescription || 'Estado inicial antes de iniciar o procedimento técnico.'}
                    </p>
                  </div>
                </div>

                {/* 2. CARD DEPOIS COM SELO VERDE */}
                <div style={{ border: '1px solid #bbf7d0', borderRadius: 10, overflow: 'hidden', background: '#ffffff', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
                  <div style={{ position: 'relative', height: 260, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {ba.afterImageDataUrl || ba.afterImageUrl ? (
                      <img
                        src={ba.afterImageDataUrl || ba.afterImageUrl}
                        alt="Estado Depois"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: 13 }}>Foto do resultado final</span>
                    )}
                    {/* SELO NO CANTO SUPERIOR ESQUERDO COM FUNDO VERDE */}
                    <div style={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      background: '#16a34a',
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: 900,
                      letterSpacing: 1,
                      padding: '4px 14px',
                      borderRadius: 4,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      textTransform: 'uppercase'
                    }}>
                      DEPOIS
                    </div>
                  </div>
                  <div style={{ padding: 14 }}>
                    <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                      {ba.afterDescription || 'Resultado transformado com acabamento profissional e precisão.'}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* INSTRUÇÕES PASSO A PASSO (+10% MAIOR) */}
          {currentLes.stepByStepInstructions && currentLes.stepByStepInstructions.length > 0 && (
            <div style={{ marginBottom: 36 }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>
                Instruções Passo a Passo
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {currentLes.stepByStepInstructions.map((step) => (
                  <div key={step.stepNumber} style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '16px 20px',
                    background: '#f8fafc'
                  }}>
                    <strong style={{ fontSize: '1.08rem', color: '#0f172a' }}>
                      [Passo {step.stepNumber}] {step.title}
                    </strong>
                    <p style={{ margin: '8px 0', fontSize: '1.02rem', lineHeight: 1.7, color: '#475569' }}>
                      {step.instruction}
                    </p>
                    {step.technicalNote && (
                      <div style={{ fontSize: '0.92rem', color: '#0284c7', fontStyle: 'italic', marginTop: 4 }}>
                        • Nota técnica: {step.technicalNote}
                      </div>
                    )}
                    {step.safetyCaution && (
                      <div style={{ fontSize: '0.92rem', color: '#dc2626', fontWeight: 700, marginTop: 4 }}>
                        • Atenção de segurança: {step.safetyCaution}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DICA PRÁTICA E PREVENÇÃO DE ERROS */}
          {((currentLes.practicalTips && currentLes.practicalTips.length > 0) || (currentLes.commonMistakes && currentLes.commonMistakes.length > 0)) && (
            <div style={{
              background: '#fef3c7',
              border: '1px solid #fcd34d',
              borderRadius: 10,
              padding: '18px 22px',
              marginBottom: 32
            }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '1.05rem', fontWeight: 800, color: '#b45309' }}>
                Dica Prática e Prevenção de Erros
              </h4>
              {currentLes.practicalTips?.[0] && (
                <p style={{ margin: '0 0 6px', fontSize: '0.98rem', color: '#78350f', lineHeight: 1.6 }}>
                  • <strong>Dica:</strong> {currentLes.practicalTips[0]}
                </p>
              )}
              {currentLes.commonMistakes?.[0] && (
                <p style={{ margin: 0, fontSize: '0.98rem', color: '#78350f', lineHeight: 1.6 }}>
                  • <strong>Erro a evitar:</strong> {currentLes.commonMistakes[0]}
                </p>
              )}
            </div>
          )}

          {/* EXERCÍCIO PRÁTICO */}
          {currentLes.exercise && currentLes.exercise.description && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 10,
              padding: '18px 22px',
              marginBottom: 40
            }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 800, color: '#166534' }}>
                Atividade Prática: {currentLes.exercise.title || 'Exercício de Fixação'}
              </h4>
              <p style={{ margin: '0 0 10px', fontSize: '1rem', color: '#14532d', lineHeight: 1.6 }}>
                {currentLes.exercise.description}
              </p>
              {currentLes.exercise.expectedOutcome && (
                <div style={{ fontSize: '0.92rem', color: '#15803d', fontStyle: 'italic' }}>
                  Resultado esperado: {currentLes.exercise.expectedOutcome}
                </div>
              )}
            </div>
          )}

          {/* RODAPÉ DE NAVEGAÇÃO ENTRE AULAS */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 24,
            borderTop: '1px solid #e2e8f0',
            marginTop: 40
          }}>
            <button
              onClick={handlePrevLesson}
              disabled={activeModuleIdx === 0 && activeLessonIdx === 0}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                padding: '10px 18px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <ArrowLeft size={16} /> Aula Anterior
            </button>

            <button
              onClick={handleNextLesson}
              style={{
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                padding: '10px 22px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              Próxima Aula <ArrowRight size={16} />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};
