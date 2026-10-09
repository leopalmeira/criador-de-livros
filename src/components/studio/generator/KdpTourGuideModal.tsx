// ================================================================
// TOUR GUIADO & GUIA DE FUNÇÕES — BOOKENGIN
// Explicação passo a passo e mapa completo de cada botão e função
// ================================================================

import React, { useState } from 'react';
import {
  HelpCircle, ChevronRight, ChevronLeft, X, CheckCircle2,
  Sparkles, BookOpen, Layers, ShieldCheck, Headphones,
  Download, Play, Wand2, Compass, Check, ArrowRight, Info
} from 'lucide-react';

interface KdpTourGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab?: (tab: string) => void;
}

interface TourStep {
  title: string;
  badge: string;
  description: string;
  buttonHighlights: Array<{
    name: string;
    action: string;
    tip: string;
  }>;
  relatedTab?: string;
}

export const KdpTourGuideModal: React.FC<KdpTourGuideModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTab
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'step-by-step' | 'full-glossary'>('step-by-step');

  if (!isOpen) return null;

  const tourSteps: TourStep[] = [
    {
      title: '1. Tema Central & Gênero Literário',
      badge: 'ETAPA INICIAL OBRIGATÓRIA',
      description: 'O tema define o nicho exato da obra e calibra todo o vocabulário, estrutura narrativa e referências de mercado que o motor IA do BookEngin irá utilizar.',
      buttonHighlights: [
        {
          name: 'Tema Central do Livro (60 Opções)',
          action: 'Seleciona a categoria primária (ex: Investigação Criminal, Desenvolvimento Pessoal, Fantasia, Livro de Colorir).',
          tip: 'Sempre escolha o tema antes de definir o título para alinhar o algoritmo.'
        },
        {
          name: 'Subtema / Especialização',
          action: 'Filtra um sub-nicho específico com menor concorrência no KDP.',
          tip: 'Subtemas bem definidos aumentam a taxa de conversão orgânica.'
        },
        {
          name: '👶 Faixa Etária Obrigatória',
          action: 'Ativado automaticamente para livros infantis para limitar a complexidade vocabular.',
          tip: 'Essencial para aprovação nas diretrizes infantis da Amazon.'
        }
      ]
    },
    {
      title: '2. Inteligência de Mercado Amazon KDP',
      badge: 'BENCHMARK EM TEMPO REAL',
      description: 'Analisa livros reais mais vendidos da Amazon Brasil e Internacional (#1 a #200) para modelar estrutura de capítulos e diferenciais sem copiar conteúdo.',
      buttonHighlights: [
        {
          name: '🎲 Sortear Outros (#1-#200)',
          action: 'Embaralha aleatoriamente novas referências dos rankings de busca e best-sellers.',
          tip: 'Use quando quiser novas ideias de títulos e abordagens sem ficar preso aos 5 primeiros.'
        },
        {
          name: '🔍 Analisar Mercado',
          action: 'Executa a varredura profunda de demanda, estimativa de royalties e palavras-chave.',
          tip: 'Revela brechas editoriais que os concorrentes deixaram de fora.'
        }
      ]
    },
    {
      title: '3. Título, Subtítulo & Diferencial Editorial',
      badge: 'POSICIONAMENTO COMERCIAL',
      description: 'Criação de títulos magnéticos, subtítulos explicativos e a proposta única de valor (USP) para ranquear nos mecanismos de busca da Amazon.',
      buttonHighlights: [
        {
          name: '✨ 5 Sugestões Originais',
          action: 'Gera 5 títulos inéditos com alto apelo comercial baseados no tema.',
          tip: 'Clique em qualquer pílula de sugestão para aplicar diretamente no campo.'
        },
        {
          name: 'Botão 🪄 IA (Título e Subtítulo)',
          action: 'Gera novas variações com fórmulas de copywriting de alta conversão.',
          tip: 'O subtítulo deve sempre conter a promessa ou transformação do livro.'
        },
        {
          name: '✨ Sugerir com IA (Diferencial Editorial)',
          action: 'Cria o ângulo único que torna o livro irresistível comparado aos concorrentes.',
          tip: 'Esse diferencial é inserido na sinopse e na introdução da obra.'
        }
      ]
    },
    {
      title: '4. Correção Editorial Automática — Capítulo a Capítulo',
      badge: 'FLUXO EDITORIAL SEM RISCO',
      description: 'O coração da revisão: preserva o manuscrito original, corrige capítulo por capítulo com salvamento sequencial e registra continuidade.',
      buttonHighlights: [
        {
          name: '⏸️ Pausar / Continuar Processo',
          action: 'Permite pausar a correção a qualquer momento sem perder o progresso salvo.',
          tip: 'Mesmo fechando o navegador, o progresso fica salvo no IndexedDB local.'
        },
        {
          name: '⚠️ Pendente de validação / ✓ Autorizar',
          action: 'Avisos da IA sobre continuidade ou palavras repetidas que requerem o aval do autor.',
          tip: 'Clique em "✓ Autorizar" na linha do capítulo ou no modal para aprovar em 1 clique.'
        },
        {
          name: '👁️ Ver detalhes',
          action: 'Abre o comparador de texto mostrando o original e o corrigido linha por linha.',
          tip: 'Permite auditar exatamente o que a IA ajustou (ortografia, pontuação, diálogos).'
        },
        {
          name: 'Sumário & Validação PDF',
          action: 'Gera o sumário com páginas reais calculadas e verifica a integridade do PDF.',
          tip: 'Garante que o PDF final atende 100% das normas de impressão da Amazon.'
        }
      ]
    },
    {
      title: '5. Abas do Studio (Múltiplos Formatos)',
      badge: '1 CONTEÚDO → VÁRIOS FORMATOS',
      description: 'Transforme o manuscrito aprovado em produtos digitais e físicos de alto valor:',
      buttonHighlights: [
        {
          name: '📖 Livro Diagramado',
          action: 'Visualizador de páginas formatadas para leitura e revisão do miolo.',
          tip: 'Permite verificar o layout com fontes e margens editoriais.'
        },
        {
          name: '🎨 Capa KDP',
          action: 'Estúdio de criação de capas profissionais com Imagen 3 em dimensões oficiais KDP.',
          tip: 'Gera versões variadas e salva a capa oficial no projeto.'
        },
        {
          name: '📢 Página Promocional',
          action: 'Landing page comercial completa pronta para marketing e vendas online.',
          tip: 'Pode ser exportada em HTML puro para rodar em qualquer hospedagem.'
        },
        {
          name: '🔍 Auditoria & Verificadores (92%)',
          action: 'Pente-fino de 11 regras (ISBN, margens, sumário, metadados) anti-rejeição.',
          tip: 'Só submeta à Amazon quando todos os verificadores estiverem verdes.'
        },
        {
          name: '🖍️ Livro de Colorir KDP',
          action: 'Módulo para gerar livros ilustrados de colorir com traços vetoriais em alta nitidez.',
          tip: 'Excelente nicho de baixo texto e alta margem de lucro.'
        },
        {
          name: '🎧 Audiobook Studio',
          action: 'Estúdio com Kokoro TTS, 10 perfis de narrador, Smart Sound Design e mixagem.',
          tip: 'Cria o áudio cinematográfico com efeitos sonoros e auto-ducking.'
        },
        {
          name: '🚀 Publicação Multiplataforma',
          action: 'Pacote pronto para distribuir no Spotify, Audible, Apple Books e Amazon.',
          tip: 'Gera o arquivo ZIP com todas as pastas e metadados oficiais.'
        }
      ]
    },
    {
      title: '6. Barra de Ações Rápidas (Rodapé do Gerador)',
      badge: 'FINALIZAÇÃO E EXPORTAÇÃO',
      description: 'Botões de ação imediata localizados no rodapé da página para publicação e guarda do projeto:',
      buttonHighlights: [
        {
          name: '🔍 Auditar & Verificar (1 Clique)',
          action: 'Executa a suíte de auditoria completa em segundos.',
          tip: 'Economiza tempo conferindo todas as pendências de uma só vez.'
        },
        {
          name: '📥 PDF KDP',
          action: 'Baixa o arquivo PDF final diagramado com capa e sumário pronto para impressão.',
          tip: 'Arquivo já em formato A5/6x9 compatível com Kindle Direct Publishing.'
        },
        {
          name: '🚀 Finalizar Livro (Disponibilizar na Dashboard)',
          action: 'Marca o livro como 100% concluído e disponibiliza na estante de obras da Dashboard.',
          tip: 'Permite que você acesse a obra final a qualquer momento na tela inicial.'
        },
        {
          name: '💾 Salvar no Catálogo / Baixar JSON',
          action: 'Salva o estado no banco de dados local ou exporta backup em arquivo JSON.',
          tip: 'Garante que você nunca perca o trabalho mesmo limpando o navegador.'
        }
      ]
    }
  ];

  const currentStep = tourSteps[currentStepIndex];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      zIndex: 999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: 14,
        maxWidth: 780,
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0'
      }}>
        {/* CABEÇALHO DO MODAL */}
        <div style={{
          padding: '16px 22px',
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Compass size={20} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
                Tour Guiado & Guia das Funções do BookEngin
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>
                Entenda exatamente o que faz cada botão e como validar o seu livro
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Alternância de Modo */}
            <div style={{
              display: 'flex',
              background: '#334155',
              padding: 2,
              borderRadius: 6,
              fontSize: 11
            }}>
              <button
                type="button"
                onClick={() => setViewMode('step-by-step')}
                style={{
                  background: viewMode === 'step-by-step' ? '#2563eb' : 'transparent',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 4,
                  padding: '4px 8px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Passo a Passo
              </button>
              <button
                type="button"
                onClick={() => setViewMode('full-glossary')}
                style={{
                  background: viewMode === 'full-glossary' ? '#2563eb' : 'transparent',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 4,
                  padding: '4px 8px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Guia Completo
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: 4
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL DO MODAL */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {viewMode === 'step-by-step' ? (
            /* ============================================================== */
            /* MODO PASSO A PASSO */
            /* ============================================================== */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Barra de Progresso do Tour */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  fontSize: 10,
                  fontWeight: 800,
                  background: '#dbeafe',
                  color: '#1e40af',
                  padding: '3px 8px',
                  borderRadius: 12
                }}>
                  {currentStep.badge}
                </span>

                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                  Passo {currentStepIndex + 1} de {tourSteps.length}
                </span>
              </div>

              {/* Título & Descrição */}
              <div>
                <h4 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                  {currentStep.title}
                </h4>
                <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                  {currentStep.description}
                </p>
              </div>

              {/* Lista dos Botões e Funções Destaque */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                  Principais Botões & Funções Desta Área:
                </div>

                {currentStep.buttonHighlights.map((btn, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#2563eb',
                        background: '#eff6ff',
                        padding: '2px 8px',
                        borderRadius: 4,
                        border: '1px solid #bfdbfe'
                      }}>
                        {btn.name}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: '#334155', marginTop: 2 }}>
                      {btn.action}
                    </div>

                    <div style={{ fontSize: 11, color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <CheckCircle2 size={12} /> Dica Pro: {btn.tip}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ============================================================== */
            /* MODO GUIA COMPLETO (GLOSSÁRIO) */
            /* ============================================================== */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 8,
                padding: 12,
                fontSize: 12,
                color: '#1e40af',
                lineHeight: 1.5
              }}>
                <strong>Guia Geral de Navegação:</strong> Aqui você pode consultar rapidamente o significado e impacto de cada botão da interface do BookEngin.
              </div>

              {tourSteps.map((step, sIdx) => (
                <div key={sIdx} style={{ borderBottom: sIdx === tourSteps.length - 1 ? 'none' : '1px solid #e2e8f0', paddingBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb' }}>{step.badge}</span>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{step.title}</h4>
                  </div>
                  <p style={{ margin: '0 0 10px', fontSize: 12, color: '#64748b' }}>{step.description}</p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8 }}>
                    {step.buttonHighlights.map((btn, bIdx) => (
                      <div key={bIdx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 10 }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: '#0f172a', marginBottom: 2 }}>{btn.name}</div>
                        <div style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{btn.action}</div>
                        <div style={{ fontSize: 10, color: '#16a34a', fontWeight: 600 }}>💡 {btn.tip}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RODAPÉ DE NAVEGAÇÃO ENTRE PASSOS */}
        <div style={{
          padding: '14px 22px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {viewMode === 'step-by-step' ? (
            <>
              <button
                type="button"
                onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
                disabled={currentStepIndex === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: currentStepIndex === 0 ? '#94a3b8' : '#334155',
                  cursor: currentStepIndex === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                <ChevronLeft size={16} /> Anterior
              </button>

              <div style={{ display: 'flex', gap: 6 }}>
                {tourSteps.map((_, i) => (
                  <div
                    key={i}
                    onClick={() => setCurrentStepIndex(i)}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: currentStepIndex === i ? '#2563eb' : '#cbd5e1',
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </div>

              {currentStepIndex < tourSteps.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStepIndex(prev => Math.min(tourSteps.length - 1, prev + 1))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    background: '#2563eb',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  Próximo <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    background: '#059669',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  ✓ Concluir Tour
                </button>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 20px',
                  background: '#2563eb',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                Entendi, Fechar Guia
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
