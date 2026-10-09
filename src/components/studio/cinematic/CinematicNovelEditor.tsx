import React, { useState } from 'react';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Download, Sparkles, RefreshCw,
  Eye, CheckCircle2, ShieldCheck, Camera, Film, BookOpen, Layers,
  FileText, MessageSquare, ZoomIn, Sliders, Check, AlertCircle, Edit3
} from 'lucide-react';
import {
  CinematicNovelProjectData,
  CinematicPagePlan,
  CinematicDialogueItem
} from '../../../types/cinematic-novel';
import { CinematicNovelService } from '../../../services/cinematic-novel-service';

interface CinematicNovelEditorProps {
  project: CinematicNovelProjectData;
  onUpdateProject: (updated: CinematicNovelProjectData) => void;
  onBackToDashboard: () => void;
}

export const CinematicNovelEditor: React.FC<CinematicNovelEditorProps> = ({
  project,
  onUpdateProject,
  onBackToDashboard
}) => {
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'pagina' | 'prompt' | 'story_bible' | 'characters' | 'checklist'>('pagina');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState<boolean>(false);
  const [editingNarration, setEditingNarration] = useState<boolean>(false);
  const [narrationDraft, setNarrationDraft] = useState<string>('');
  const [selectedDialogueId, setSelectedDialogueId] = useState<string | null>(null);
  const [dialogueDraft, setDialogueDraft] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const currentPage: CinematicPagePlan | undefined = project.pages[currentPageIndex] || project.pages[0];

  // Alterna página
  const goToPage = (idx: number) => {
    if (idx >= 0 && idx < project.pages.length) {
      setCurrentPageIndex(idx);
      setEditingNarration(false);
      setSelectedDialogueId(null);
    }
  };

  // Salva narração editada sem mexer na imagem
  const handleSaveNarration = () => {
    if (!currentPage) return;
    const updatedPages = [...project.pages];
    updatedPages[currentPageIndex] = {
      ...currentPage,
      narrationText: narrationDraft,
      updatedAt: Date.now()
    };
    onUpdateProject({
      ...project,
      pages: updatedPages,
      updatedAt: Date.now()
    });
    setEditingNarration(false);
    showNotice('✓ Narração atualizada com sucesso sem alterar a imagem.');
  };

  // Salva fala de diálogo editada
  const handleSaveDialogue = (dialId: string) => {
    if (!currentPage) return;
    const updatedDialogues = currentPage.dialogues.map(d => 
      d.id === dialId ? { ...d, speechText: dialogueDraft } : d
    );
    const updatedPages = [...project.pages];
    updatedPages[currentPageIndex] = {
      ...currentPage,
      dialogues: updatedDialogues,
      updatedAt: Date.now()
    };
    onUpdateProject({
      ...project,
      pages: updatedPages,
      updatedAt: Date.now()
    });
    setSelectedDialogueId(null);
    showNotice('✓ Diálogo atualizado na composição gráfica.');
  };

  // Regenera somente a imagem da página preservando textos e prompt individual
  const handleRegenerateImage = async () => {
    if (!currentPage) return;
    setIsRegeneratingImage(true);
    setStatusMessage('Regenerando imagem fotorrealista da página via IA...');
    try {
      const newImageUrl = await CinematicNovelService.generatePageVisual(currentPage);
      const updatedPages = [...project.pages];
      updatedPages[currentPageIndex] = {
        ...currentPage,
        imageUrl: newImageUrl,
        validationStatus: 'gerado',
        updatedAt: Date.now()
      };
      onUpdateProject({
        ...project,
        pages: updatedPages,
        updatedAt: Date.now()
      });
      showNotice('✓ Nova fotografia cinematográfica gerada preservando todos os textos!');
    } catch (err: any) {
      alert(`Falha ao regenerar imagem: ${err?.message || 'Erro desconhecido'}`);
    } finally {
      setIsRegeneratingImage(false);
      setStatusMessage(null);
    }
  };

  // Aprova a página individualmente
  const handleApprovePage = () => {
    if (!currentPage) return;
    const updatedPages = [...project.pages];
    updatedPages[currentPageIndex] = {
      ...currentPage,
      isApproved: true,
      validationStatus: 'aprovado',
      updatedAt: Date.now()
    };
    
    // Atualiza checklist
    const updatedChecklist = project.checklist.map(t => {
      if (t.id === 't14') return { ...t, isCompleted: true, completedAt: Date.now() };
      return t;
    });

    onUpdateProject({
      ...project,
      pages: updatedPages,
      checklist: updatedChecklist,
      updatedAt: Date.now()
    });
    showNotice(`✓ Página ${currentPage.pageNumber} aprovada para publicação!`);
  };

  // Exportação em PDF Full Bleed Colorido KDP
  const handleExportPdf = async () => {
    setIsExporting(true);
    setStatusMessage('Compilando Foto Livro Cinematográfico em PDF Full Bleed 300 DPI...');
    try {
      const blob = await CinematicNovelService.exportPdfFullBleed(project);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title.replace(/[^a-zA-Z0-9]/g, '_')}_ROMANCE_CINEMATOGRAFICO_KDP.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      // Marca tarefas de exportação no checklist
      const updatedChecklist = project.checklist.map(t => {
        if (t.id === 't16' || t.id === 't17') return { ...t, isCompleted: true, completedAt: Date.now() };
        return t;
      });
      onUpdateProject({
        ...project,
        checklist: updatedChecklist,
        updatedAt: Date.now()
      });

      showNotice('✓ PDF Full Bleed baixado com sucesso!');
    } catch (err: any) {
      alert(`Erro ao compilar PDF: ${err?.message || 'Falha desconhecida'}`);
    } finally {
      setIsExporting(false);
      setStatusMessage(null);
    }
  };

  const showNotice = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  if (!currentPage) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#fff', background: '#020617', minHeight: '100vh' }}>
        <h2>Nenhuma página disponível no projeto.</h2>
        <button onClick={onBackToDashboard} style={{ marginTop: 20, padding: '10px 20px', borderRadius: 8 }}>
          Voltar à Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#090d16',
      color: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* 1. TOP BAR PROFISSIONAL DO EDITOR CINEMATOGRÁFICO */}
      <header style={{
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={onBackToDashboard}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#f8fafc',
              padding: '6px 12px',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 600
            }}
          >
            <ArrowLeft size={16} /> Dashboard
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#0f172a',
                fontSize: 10,
                fontWeight: 900,
                padding: '2px 8px',
                borderRadius: 4,
                letterSpacing: '0.05em'
              }}>
                ROMANCE CINEMATOGRÁFICO REALISTA
              </span>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#ffffff' }}>
                {project.title}
              </h2>
            </div>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              {project.genre} • {currentPage.chapterTitle || `Capítulo ${currentPage.chapterNumber}`} • Página {currentPage.pageNumber} de {project.pages.length}
            </span>
          </div>
        </div>

        {/* NAVEGAÇÃO ENTRE ABAS DO EDITOR */}
        <div style={{ display: 'flex', gap: 6, background: 'rgba(0, 0, 0, 0.3)', padding: 4, borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <button
            onClick={() => setActiveTab('pagina')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              background: activeTab === 'pagina' ? '#2563eb' : 'transparent',
              color: activeTab === 'pagina' ? '#ffffff' : '#94a3b8',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Eye size={14} /> Prévia da Página
          </button>

          <button
            onClick={() => setActiveTab('prompt')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              background: activeTab === 'prompt' ? '#2563eb' : 'transparent',
              color: activeTab === 'prompt' ? '#ffffff' : '#94a3b8',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Camera size={14} /> Pipeline & Prompt
          </button>

          <button
            onClick={() => setActiveTab('characters')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              background: activeTab === 'characters' ? '#2563eb' : 'transparent',
              color: activeTab === 'characters' ? '#ffffff' : '#94a3b8',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Layers size={14} /> Personagens ({project.characters.length})
          </button>

          <button
            onClick={() => setActiveTab('story_bible')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              background: activeTab === 'story_bible' ? '#2563eb' : 'transparent',
              color: activeTab === 'story_bible' ? '#ffffff' : '#94a3b8',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <BookOpen size={14} /> Story Bible
          </button>

          <button
            onClick={() => setActiveTab('checklist')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              background: activeTab === 'checklist' ? '#2563eb' : 'transparent',
              color: activeTab === 'checklist' ? '#ffffff' : '#94a3b8',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <ShieldCheck size={14} /> Checklist ({project.checklist.filter(c => c.isCompleted).length}/17)
          </button>
        </div>

        {/* AÇÕES DA DIREITA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handleApprovePage}
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              border: '1px solid #10b981',
              background: currentPage.isApproved ? '#059669' : 'rgba(16, 185, 129, 0.15)',
              color: currentPage.isApproved ? '#ffffff' : '#34d399',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <CheckCircle2 size={15} /> {currentPage.isApproved ? 'Página Aprovada' : 'Aprovar Página'}
          </button>

          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#0f172a',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
            }}
          >
            <Download size={15} /> {isExporting ? 'Exportando...' : 'Exportar PDF Full-Bleed KDP'}
          </button>
        </div>
      </header>

      {/* NOTIFICAÇÃO DE STATUS TOPO */}
      {statusMessage && (
        <div style={{
          background: 'linear-gradient(90deg, #1e293b, #0f172a)',
          color: '#38bdf8',
          borderBottom: '1px solid #38bdf8',
          padding: '8px 24px',
          fontSize: 13,
          fontWeight: 600,
          textAlign: 'center',
          animation: 'fadeIn 0.2s'
        }}>
          {statusMessage}
        </div>
      )}

      {/* 2. CORPO PRINCIPAL COM CONTEÚDO DA ABA */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* ============================================================ */}
        {/* ABA 1: PRÉVIA DA PÁGINA COM COMPOSIÇÃO INTEGRADA (SEM FUNDO BRANCO) */}
        {/* ============================================================ */}
        {activeTab === 'pagina' && (
          <div style={{ flex: 1, display: 'flex', gap: 24, padding: 24, overflowY: 'auto' }}>
            
            {/* LADO ESQUERDO: PÁGINA DIAGRAMADA NO PADRÃO DE FOTO LIVRO REALISTA */}
            <div style={{ flex: '0 0 680px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              
              {/* MOLDURA DA PÁGINA (PADRÃO 7X10 POL KDP FULL BLEED) */}
              <div style={{
                width: 640,
                minHeight: 900,
                background: '#0a0f1d',
                borderRadius: 12,
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                padding: '24px 22px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: 14
              }}>
                
                {/* CABEÇALHO DO CAPÍTULO INTEGRADO NA PÁGINA */}
                <div style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
                  paddingBottom: 10,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end'
                }}>
                  <div>
                    <h1 style={{
                      margin: 0,
                      fontSize: 22,
                      fontWeight: 900,
                      color: '#ffffff',
                      letterSpacing: '-0.02em',
                      fontFamily: 'Merriweather, serif'
                    }}>
                      {project.title.toUpperCase()}
                    </h1>
                    <span style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>
                      {currentPage.chapterTitle || `Capítulo ${currentPage.chapterNumber}`}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                    Página {currentPage.pageNumber}
                  </span>
                </div>

                {/* IMAGEM PRINCIPAL FOTORREALISTA */}
                <div style={{
                  position: 'relative',
                  width: '100%',
                  minHeight: 480,
                  borderRadius: 10,
                  overflow: 'hidden',
                  background: '#1e293b',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  {currentPage.imageUrl ? (
                    <img
                      src={currentPage.imageUrl}
                      alt={currentPage.sceneSummary}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{
                      height: 480,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                      gap: 12,
                      padding: 24,
                      textAlign: 'center'
                    }}>
                      <Film size={44} color="#38bdf8" />
                      <span style={{ fontWeight: 600 }}>Imagem Cinematográfica da Página</span>
                      <p style={{ fontSize: 12, maxWidth: 380, color: '#64748b', margin: 0 }}>
                        {currentPage.visualPrompt}
                      </p>
                      <button
                        onClick={handleRegenerateImage}
                        disabled={isRegeneratingImage}
                        style={{
                          background: '#2563eb',
                          color: '#fff',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {isRegeneratingImage ? 'Gerando...' : 'Gerar Fotografia da Cena'}
                      </button>
                    </div>
                  )}

                  {/* CAIXA DE NARRAÇÃO SOBREPOSTA COM EFEITO TRANSLÚCIDO ELEGANTE (SEM FUNDO BRANCO!) */}
                  {currentPage.narrationText && (
                    <div style={{
                      position: 'absolute',
                      bottom: 16,
                      left: 16,
                      right: 16,
                      background: 'rgba(15, 23, 42, 0.78)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.18)',
                      borderRadius: 10,
                      padding: '14px 18px',
                      color: '#f8fafc',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
                      fontSize: 13,
                      lineHeight: 1.55,
                      fontFamily: 'Merriweather, Georgia, serif',
                      textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#38bdf8', fontWeight: 800 }}>
                          Narração Cinematográfica
                        </span>
                        <button
                          onClick={() => {
                            setNarrationDraft(currentPage.narrationText);
                            setEditingNarration(true);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11
                          }}
                          title="Editar Narração sem regenerar a imagem"
                        >
                          <Edit3 size={12} /> Editar
                        </button>
                      </div>
                      <div>
                        {currentPage.narrationText.slice(0, 320)}...
                      </div>
                    </div>
                  )}
                </div>

                {/* PAINÉIS SEQUENCIAIS ADICIONAIS OU DIÁLOGOS DA CENA */}
                {currentPage.dialogues && currentPage.dialogues.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                    {currentPage.dialogues.map((dial) => (
                      <div
                        key={dial.id}
                        style={{
                          background: dial.speechType === 'thought' 
                            ? 'rgba(30, 41, 59, 0.75)' 
                            : 'rgba(15, 23, 42, 0.85)',
                          backdropFilter: 'blur(8px)',
                          border: dial.speechType === 'thought'
                            ? '1px dashed rgba(148, 163, 184, 0.35)'
                            : '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: 8,
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 12
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: dial.speechType === 'thought' ? '#a5b4fc' : '#38bdf8',
                            display: 'block',
                            marginBottom: 2
                          }}>
                            {dial.speakerName} {dial.speechType === 'thought' ? '(Pensamento)' : ''}:
                          </span>
                          <span style={{
                            fontSize: 13,
                            color: '#f1f5f9',
                            fontStyle: dial.speechType === 'thought' ? 'italic' : 'normal',
                            lineHeight: 1.45
                          }}>
                            "{dial.speechText}"
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedDialogueId(dial.id);
                            setDialogueDraft(dial.speechText);
                          }}
                          style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: 'none',
                            color: '#cbd5e1',
                            padding: '4px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            cursor: 'pointer'
                          }}
                        >
                          <Edit3 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* DESTAQUE DE DOCUMENTO OU BILHETE NA CENA (EXEMPLO DO BILHETE DO ENVELOPE) */}
                {currentPage.pageNumber === 1 && (
                  <div style={{
                    marginTop: 8,
                    background: '#d4b996',
                    color: '#291b0f',
                    borderRadius: 6,
                    padding: '14px 20px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                    border: '1px solid #b89873',
                    fontFamily: '"Caveat", cursive, "Comic Sans MS", sans-serif',
                    fontSize: 20,
                    textAlign: 'center',
                    transform: 'rotate(-0.8deg)',
                    lineHeight: 1.3
                  }}>
                    <span style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6d4c2b', marginBottom: 4 }}>
                      Documento inserido na cena • Papel Pardo Rústico
                    </span>
                    "Você esqueceu o que aconteceu na ponte."
                  </div>
                )}

                {/* RODAPÉ EDITORIAL DA PÁGINA */}
                <div style={{
                  marginTop: 'auto',
                  paddingTop: 10,
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  color: '#64748b'
                }}>
                  <span>Formato KDP: 7x10 pol Full-Bleed</span>
                  <span>Romance Cinematográfico Realista</span>
                </div>
              </div>

              {/* CONTROLES DE NAVEGAÇÃO DE PÁGINAS */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 18 }}>
                <button
                  onClick={() => goToPage(currentPageIndex - 1)}
                  disabled={currentPageIndex === 0}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: 8,
                    cursor: currentPageIndex === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    opacity: currentPageIndex === 0 ? 0.4 : 1
                  }}
                >
                  <ChevronLeft size={16} /> Página Anterior
                </button>

                <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>
                  {currentPageIndex + 1} de {project.pages.length}
                </span>

                <button
                  onClick={() => goToPage(currentPageIndex + 1)}
                  disabled={currentPageIndex === project.pages.length - 1}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: 8,
                    cursor: currentPageIndex === project.pages.length - 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    opacity: currentPageIndex === project.pages.length - 1 ? 0.4 : 1
                  }}
                >
                  Próxima Página <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* LADO DIREITO: PAINEL DE CONTROLE, EDIÇÃO DE TEXTO E REGENERAÇÃO */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
              
              {/* CARD DE AÇÕES RÁPIDAS DA PÁGINA */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.7)',
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#ffffff' }}>
                    ⚙️ Ferramentas da Página {currentPage.pageNumber}
                  </h3>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: currentPage.isApproved ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: currentPage.isApproved ? '#34d399' : '#fbbf24'
                  }}>
                    {currentPage.isApproved ? 'Aprovada' : 'Em Revisão'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={handleRegenerateImage}
                    disabled={isRegeneratingImage}
                    style={{
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      color: '#38bdf8',
                      padding: '8px 14px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <RefreshCw size={14} className={isRegeneratingImage ? 'animate-spin' : ''} />
                    {isRegeneratingImage ? 'Regenerando Imagem...' : 'Regenerar Imagem Pontual'}
                  </button>

                  <button
                    onClick={() => {
                      setNarrationDraft(currentPage.narrationText);
                      setEditingNarration(true);
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#f8fafc',
                      padding: '8px 14px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Edit3 size={14} /> Editar Narração
                  </button>
                </div>
              </div>

              {/* MODAL / CAMPO DE EDIÇÃO DE NARRAÇÃO */}
              {editingNarration && (
                <div style={{
                  background: 'rgba(15, 23, 42, 0.95)',
                  borderRadius: 12,
                  border: '1px solid #38bdf8',
                  padding: 18,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#38bdf8' }}>
                      Editar Narração da Página {currentPage.pageNumber}
                    </h4>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                      Não altera a imagem fotográfica
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    value={narrationDraft}
                    onChange={(e) => setNarrationDraft(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#090d16',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      color: '#f8fafc',
                      padding: 12,
                      fontSize: 13,
                      lineHeight: 1.5,
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      resize: 'vertical'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                    <button
                      onClick={() => setEditingNarration(false)}
                      style={{
                        background: 'transparent',
                        border: '1px solid #475569',
                        color: '#94a3b8',
                        padding: '6px 14px',
                        borderRadius: 6,
                        cursor: 'pointer'
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveNarration}
                      style={{
                        background: '#10b981',
                        border: 'none',
                        color: '#fff',
                        padding: '6px 16px',
                        borderRadius: 6,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Salvar Narração
                    </button>
                  </div>
                </div>
              )}

              {/* MODAL / CAMPO DE EDIÇÃO DE DIÁLOGO */}
              {selectedDialogueId && (
                <div style={{
                  background: 'rgba(15, 23, 42, 0.95)',
                  borderRadius: 12,
                  border: '1px solid #a855f7',
                  padding: 18,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#c084fc' }}>
                      Editar Fala do Diálogo
                    </h4>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                      Atualiza o balão cinematográfico
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={dialogueDraft}
                    onChange={(e) => setDialogueDraft(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#090d16',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      color: '#f8fafc',
                      padding: 12,
                      fontSize: 13,
                      lineHeight: 1.5,
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                    <button
                      onClick={() => setSelectedDialogueId(null)}
                      style={{
                        background: 'transparent',
                        border: '1px solid #475569',
                        color: '#94a3b8',
                        padding: '6px 14px',
                        borderRadius: 6,
                        cursor: 'pointer'
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleSaveDialogue(selectedDialogueId)}
                      style={{
                        background: '#9333ea',
                        border: 'none',
                        color: '#fff',
                        padding: '6px 16px',
                        borderRadius: 6,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Salvar Diálogo
                    </button>
                  </div>
                </div>
              )}

              {/* CONTEXTO NARRATIVO E OBJETIVO DRAMÁTICO DA PÁGINA */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.5)',
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}>
                <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', fontWeight: 800 }}>
                  Planejamento Narrativo Desta Página
                </span>
                <div>
                  <strong style={{ fontSize: 12, color: '#38bdf8' }}>Objetivo Dramático:</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#e2e8f0', lineHeight: 1.4 }}>
                    {currentPage.dramaticObjective}
                  </p>
                </div>
                <div>
                  <strong style={{ fontSize: 12, color: '#38bdf8' }}>Cenário & Iluminação:</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#cbd5e1' }}>
                    {currentPage.environmentSetting} • {currentPage.timeAndLighting}
                  </p>
                </div>
              </div>

              {/* ÍNDICE DE TODAS AS PÁGINAS DO LIVRO */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.5)',
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '16px 20px'
              }}>
                <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', fontWeight: 800, display: 'block', marginBottom: 12 }}>
                  Grade de Páginas ({project.pages.length})
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))', gap: 8 }}>
                  {project.pages.map((p, idx) => (
                    <button
                      key={p.id}
                      onClick={() => goToPage(idx)}
                      style={{
                        height: 48,
                        borderRadius: 6,
                        border: idx === currentPageIndex ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                        background: idx === currentPageIndex ? '#2563eb' : p.isApproved ? 'rgba(16, 185, 129, 0.15)' : '#1e293b',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2
                      }}
                      title={`Página ${p.pageNumber}: ${p.sceneSummary}`}
                    >
                      <span>{p.pageNumber}</span>
                      {p.isApproved && <span style={{ fontSize: 8, color: '#34d399' }}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 2: PIPELINE & PROMPT VISUAL INDIVIDUAL DA PÁGINA */}
        {/* ============================================================ */}
        {activeTab === 'prompt' && (
          <div style={{ flex: 1, padding: 32, overflowY: 'auto', maxWidth: 900, margin: '0 auto' }}>
            <div style={{
              background: 'rgba(15, 23, 42, 0.8)',
              borderRadius: 14,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 20
            }}>
              <div>
                <span style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: 4
                }}>
                  PAGE GENERATION PIPELINE • 22 PARÂMETROS
                </span>
                <h3 style={{ margin: '8px 0 4px', fontSize: 18, fontWeight: 800, color: '#ffffff' }}>
                  Plano Individual da Página {currentPage.pageNumber}
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
                  Cada página armazena seu próprio prompt fotorrealista detalhado, sem prompt compartilhado ou genérico.
                </p>
              </div>

              {/* PROMPT VISUAL ESPECÍFICO */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 800, color: '#f59e0b', display: 'block', marginBottom: 6 }}>
                  PROMPT VISUAL ESPECÍFICO DESTA PÁGINA:
                </label>
                <div style={{
                  background: '#0a0f1d',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  padding: 14,
                  fontSize: 13,
                  color: '#f8fafc',
                  lineHeight: 1.5,
                  fontFamily: 'monospace'
                }}>
                  {currentPage.visualPrompt}
                </div>
              </div>

              {/* LISTA DOS CAMPOS DO PIPELINE */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: '#0f172a', padding: 14, borderRadius: 8, border: '1px solid #1e293b' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8' }}>Enquadramento Cinematográfico:</span>
                  <div style={{ fontSize: 13, color: '#f1f5f9', marginTop: 4 }}>{currentPage.cameraFraming}</div>
                </div>

                <div style={{ background: '#0f172a', padding: 14, borderRadius: 8, border: '1px solid #1e293b' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8' }}>Personagens Presentes:</span>
                  <div style={{ fontSize: 13, color: '#f1f5f9', marginTop: 4 }}>
                    {currentPage.charactersPresent.map(id => {
                      const c = project.characters.find(char => char.id === id);
                      return c ? c.name : id;
                    }).join(', ')}
                  </div>
                </div>

                <div style={{ background: '#0f172a', padding: 14, borderRadius: 8, border: '1px solid #1e293b' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8' }}>Figurinos & Adereços:</span>
                  <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 4 }}>{currentPage.costumeAndProps}</div>
                </div>

                <div style={{ background: '#0f172a', padding: 14, borderRadius: 8, border: '1px solid #1e293b' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8' }}>Elementos Que Não Podem Mudar (Continuidade):</span>
                  <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 4 }}>
                    {currentPage.persistentElements.join(' • ')}
                  </div>
                </div>
              </div>

              {/* CRITÉRIOS DE VALIDAÇÃO */}
              <div>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#10b981', display: 'block', marginBottom: 8 }}>
                  Critérios de Validação da Página:
                </span>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#cbd5e1', fontSize: 13, lineHeight: 1.6 }}>
                  {currentPage.validationCriteria.map((crit, i) => (
                    <li key={i}>{crit}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 3: CHARACTER BIBLE COM CONSISTÊNCIA VISUAL */}
        {/* ============================================================ */}
        {activeTab === 'characters' && (
          <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
            <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#ffffff' }}>
                  Fichas da Character Bible (Consistência Visual Estrita)
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
                  Os traços fundamentais dos personagens permanecem consistentes ao longo de todas as páginas.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))', gap: 20 }}>
                {project.characters.map((char) => (
                  <div
                    key={char.id}
                    style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      borderRadius: 14,
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      padding: 22,
                      display: 'flex',
                      gap: 20
                    }}
                  >
                    {/* FOTO DE REFERÊNCIA VISUAL */}
                    <div style={{
                      width: 140,
                      height: 190,
                      borderRadius: 10,
                      overflow: 'hidden',
                      background: '#1e293b',
                      flexShrink: 0,
                      boxShadow: '0 8px 18px rgba(0, 0, 0, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.15)'
                    }}>
                      {char.referenceImageUrl ? (
                        <img
                          src={char.referenceImageUrl}
                          alt={char.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', padding: 8, textAlign: 'center' }}>
                          <Camera size={28} />
                          <span style={{ fontSize: 10, marginTop: 4 }}>Sem foto</span>
                        </div>
                      )}
                    </div>

                    {/* DETALHES DA FICHA NARRATIVA E FÍSICA */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#ffffff' }}>
                          {char.name}
                        </h4>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          background: char.role === 'protagonista' ? '#2563eb' : '#475569',
                          color: '#fff',
                          padding: '2px 8px',
                          borderRadius: 4
                        }}>
                          {char.role}
                        </span>
                      </div>

                      <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.4 }}>
                        <div><strong>Idade:</strong> {char.age} • {char.heightAndBuild}</div>
                        <div><strong>Rosto & Pele:</strong> {char.faceShape}, {char.skinTone}</div>
                        <div><strong>Olhos & Cabelos:</strong> {char.eyes}, {char.hair}</div>
                        <div><strong>Marcas Físicas:</strong> {char.distinctiveMarks}</div>
                        <div><strong>Figurinos:</strong> {char.costumes.join(', ')}</div>
                      </div>

                      <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #334155', fontSize: 11, color: '#94a3b8' }}>
                        <em>Personalidade:</em> {char.personality}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 4: STORY BIBLE (CONTINUIDADE DA HISTÓRIA) */}
        {/* ============================================================ */}
        {activeTab === 'story_bible' && (
          <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
            <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                borderRadius: 14,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#ffffff' }}>
                  📖 Story Bible & Registro de Continuidade
                </h3>

                <div>
                  <h4 style={{ margin: '0 0 6px', fontSize: 13, color: '#38bdf8' }}>Sinopse Consolidada:</h4>
                  <p style={{ margin: 0, fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 }}>
                    {project.storyBible.synopsis}
                  </p>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 6px', fontSize: 13, color: '#38bdf8' }}>Conflito Central:</h4>
                  <p style={{ margin: 0, fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>
                    {project.storyBible.centralConflict}
                  </p>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 6px', fontSize: 13, color: '#38bdf8' }}>Objetos Importantes na Trama:</h4>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {project.storyBible.importantObjects.map((obj, i) => (
                      <span key={i} style={{ background: '#1e293b', color: '#f1f5f9', padding: '4px 10px', borderRadius: 6, fontSize: 12 }}>
                        {obj}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 6px', fontSize: 13, color: '#38bdf8' }}>Segredos Ainda Não Revelados:</h4>
                  <ul style={{ margin: 0, paddingLeft: 20, color: '#cbd5e1', fontSize: 13 }}>
                    {project.storyBible.unrevealedSecrets.map((sec, i) => (
                      <li key={i}>{sec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 5: CHECKLIST DE PRODUÇÃO COM 17 ITENS REAIS */}
        {/* ============================================================ */}
        {activeTab === 'checklist' && (
          <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
            <div style={{ maxWidth: 840, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#ffffff' }}>
                    Checklist de Produção Oficial (17 Etapas)
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
                    Acompanhamento rigoroso do estado real da produção do Romance Cinematográfico.
                  </p>
                </div>

                <span style={{ fontSize: 18, fontWeight: 900, color: '#10b981' }}>
                  {project.checklist.filter(c => c.isCompleted).length} / 17 Concluídos
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {project.checklist.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      background: task.isCompleted ? 'rgba(16, 185, 129, 0.08)' : 'rgba(15, 23, 42, 0.7)',
                      border: task.isCompleted ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 10,
                      padding: '12px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14
                    }}
                  >
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      background: task.isCompleted ? '#10b981' : '#334155',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 12,
                      flexShrink: 0
                    }}>
                      {task.isCompleted ? <Check size={16} /> : task.number}
                    </div>

                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: task.isCompleted ? '#f8fafc' : '#cbd5e1' }}>
                        {task.number}. {task.title}
                      </h4>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
                        {task.description}
                      </p>
                    </div>

                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: task.isCompleted ? '#34d399' : '#64748b'
                    }}>
                      {task.isCompleted ? '✓ Concluído' : 'Pendente'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
