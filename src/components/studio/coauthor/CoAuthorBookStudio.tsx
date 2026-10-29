import React, { useState, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Check, Trash2, Plus, Sparkles, BookOpen,
  HelpCircle, RefreshCw, Layers, FileText, Download, Copy, ExternalLink,
  Edit3, BarChart3, Database, MessageSquare, ArrowLeft, AlertCircle, Eye
} from 'lucide-react';
import {
  CoAuthorWorkflowService,
  CoAuthorProjectState,
  CoAuthorCompetitorBook,
  CoAuthorChapter,
  CoAuthorSection
} from '../../../services/coauthor-workflow-service';
import { CoAuthorWritingAssistantDrawer } from './CoAuthorWritingAssistantDrawer';
import { buildKdpPdf } from '../../../services/kdp-pdf-builder';
import { BookProject } from '../../../types/book-project';

interface Props {
  initialProject?: BookProject | null;
  onExitBook: () => void;
  onProjectSaved?: (project: BookProject) => void;
}

export const CoAuthorBookStudio: React.FC<Props> = ({
  initialProject,
  onExitBook,
  onProjectSaved
}) => {
  // Estado completo do livro no fluxo do CoAuthor
  const [state, setState] = useState<CoAuthorProjectState>(() => {
    const saved = localStorage.getItem('coauthor_active_state');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return CoAuthorWorkflowService.createInitialState({
      bookTitle: initialProject?.title || '',
      authorName: initialProject?.author || 'Autor(a)',
      genre: initialProject?.categories?.[0] || 'Autoajuda & Desenvolvimento Pessoal',
      bookTopic: initialProject?.topic || 'Organização e Produtividade Pessoal'
    });
  });

  // Salva no localStorage sempre que houver alteração
  useEffect(() => {
    try {
      localStorage.setItem('coauthor_active_state', JSON.stringify(state));
    } catch {}
  }, [state]);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [newCompetitorUrl, setNewCompetitorUrl] = useState('');
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false);

  // Estados locais para edição inline no passo 10
  const [selectedText, setSelectedText] = useState('');
  const [inlineAction, setInlineAction] = useState<string | null>(null);
  const [isInlineLoading, setIsInlineLoading] = useState(false);
  const [copiedDescription, setCopiedDescription] = useState(false);

  // Lista canônica dos 13 passos do CoAuthor
  const stepList = CoAuthorWorkflowService.getStepList();
  const currentStepInfo = stepList.find(s => s.id === state.currentStep) || stepList[0];

  // ── NAVEGAÇÃO ENTRE PASSOS ──
  const goToStep = (stepId: number) => {
    if (stepId < 1 || stepId > 13) return;
    setState(prev => ({ ...prev, currentStep: stepId }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = async () => {
    // Ações automáticas inteligentes ao avançar determinadas etapas
    if (state.currentStep === 1 && state.competitors.length === 0) {
      // Step 1 -> 2: Busca concorrentes do nicho
      setIsLoading(true);
      setLoadingText('CoAuthor buscando bestsellers concorrentes na Amazon...');
      try {
        const comps = await CoAuthorWorkflowService.fetchMarketCompetitors(state.bookTopic, state.genre);
        setState(prev => ({ ...prev, competitors: comps, currentStep: 2 }));
      } catch (err) {
        setState(prev => ({ ...prev, currentStep: 2 }));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (state.currentStep === 2 && state.titleOptions.length === 0) {
      // Step 2 -> 3: Gera 10 títulos otimizados
      setIsLoading(true);
      setLoadingText('CoAuthor gerando 10 títulos campeões de venda...');
      try {
        const titles = await CoAuthorWorkflowService.generateTitleOptions({
          topic: state.bookTopic,
          stance: state.topicStance,
          uniqueStandout: state.uniqueStandout,
          genre: state.genre,
          authorName: state.authorName
        });
        setState(prev => ({
          ...prev,
          titleOptions: titles,
          selectedTitle: titles[0]?.title || prev.bookTitle,
          selectedSubtitle: titles[0]?.subtitle || '',
          bookTitle: titles[0]?.title || prev.bookTitle,
          currentStep: 3
        }));
      } catch (err) {
        setState(prev => ({ ...prev, currentStep: 3 }));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (state.currentStep === 5) {
      // Step 5 -> 6: Gera Proposta de Livro e USP com IA
      setIsLoading(true);
      setLoadingText('CoAuthor formulando o USP e diferenciação competitiva...');
      try {
        const proposed = await CoAuthorWorkflowService.generateProposedBook({
          title: state.bookTitle || state.selectedTitle,
          topic: state.bookTopic,
          stance: state.topicStance,
          uniqueStandout: state.uniqueStandout,
          genre: state.genre,
          selectedTags: state.proposedBook.selectedFocusTags,
          competitors: state.competitors,
          authorPersona: state.authorPersona
        });
        setState(prev => ({ ...prev, proposedBook: proposed, currentStep: 6 }));
      } catch {
        setState(prev => ({ ...prev, currentStep: 6 }));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (state.currentStep === 7 && !state.authorBiography) {
      // Step 7 -> 8: Gera a biografia oficial do autor
      setIsLoading(true);
      setLoadingText('CoAuthor escrevendo a biografia oficial do autor...');
      try {
        const bio = await CoAuthorWorkflowService.generateAuthorBiography({
          authorName: state.authorName,
          isPenName: state.authorPersona.isPenName,
          background: state.authorPersona.background,
          credentials: state.authorPersona.credentials,
          persona: state.authorPersona,
          topic: state.bookTopic
        });
        setState(prev => ({ ...prev, authorBiography: bio, currentStep: 8 }));
      } catch {
        setState(prev => ({ ...prev, currentStep: 8 }));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (state.currentStep === 8 && state.chapters.length === 0) {
      // Step 8 -> 9: Gera o Outline Granular
      setIsLoading(true);
      setLoadingText('CoAuthor criando o outline granular com ritmo dinâmico...');
      try {
        const chs = await CoAuthorWorkflowService.generateGranularOutline({
          title: state.bookTitle || state.selectedTitle,
          topic: state.bookTopic,
          proposedBook: state.proposedBook,
          details: state.details,
          persona: state.authorPersona
        });
        setState(prev => ({ ...prev, chapters: chs, currentStep: 9 }));
      } catch {
        setState(prev => ({ ...prev, currentStep: 9 }));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (state.currentStep === 10 && !state.amazonDescription.headline) {
      // Step 10 -> 11: Gera descrição oficial para a Amazon KDP
      setIsLoading(true);
      setLoadingText('CoAuthor redigindo copy de vendas da Amazon nos 5 blocos...');
      try {
        const desc = await CoAuthorWorkflowService.generateAmazonDescription({
          title: state.bookTitle || state.selectedTitle,
          subtitle: state.selectedSubtitle,
          topic: state.bookTopic,
          proposedBook: state.proposedBook,
          persona: state.authorPersona
        });
        setState(prev => ({ ...prev, amazonDescription: desc, currentStep: 11 }));
      } catch {
        setState(prev => ({ ...prev, currentStep: 11 }));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    goToStep(state.currentStep + 1);
  };

  const handleBack = () => {
    goToStep(state.currentStep - 1);
  };

  // ── STEP 2: REMOVER CONCORRENTE IRRELEVANTE (COMO NO PRINT 2) ──
  const handleRemoveCompetitor = (id: string) => {
    setState(prev => ({
      ...prev,
      competitors: prev.competitors.filter(c => c.id !== id)
    }));
  };

  // ── STEP 2: ADICIONAR LIVRO MANUALMENTE ──
  const handleAddManualBook = () => {
    if (!newCompetitorUrl.trim()) return;
    const newBook: CoAuthorCompetitorBook = {
      id: `manual-${Date.now()}`,
      title: newCompetitorUrl.trim().replace(/^https?:\/\//, '').slice(0, 50),
      author: 'Livro de Referência Selecionado',
      rating: 4.8,
      reviewCount: 350,
      badge: 'Referência Personalizada',
      coverImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80'
    };
    setState(prev => ({
      ...prev,
      competitors: [...prev.competitors, newBook]
    }));
    setNewCompetitorUrl('');
    setIsAddBookModalOpen(false);
  };

  // ── STEP 10: ESCREVER UMA SEÇÃO ESPECÍFICA (CONTINUIDADE SEQUENCIAL) ──
  const handleWriteSection = async (chapterIdx: number, sectionIdx: number) => {
    const chapter = state.chapters[chapterIdx];
    if (!chapter) return;
    const section = chapter.sections[sectionIdx];
    if (!section) return;

    setIsLoading(true);
    setLoadingText(`CoAuthor escrevendo Seção ${section.sectionNumber}: "${section.title}"...`);

    // Busca o conteúdo da seção imediatamente anterior para dar continuidade sem repetição
    let prevContent = '';
    if (sectionIdx > 0) {
      prevContent = chapter.sections[sectionIdx - 1]?.content || '';
    } else if (chapterIdx > 0) {
      const prevCh = state.chapters[chapterIdx - 1];
      const lastSec = prevCh?.sections[prevCh.sections.length - 1];
      prevContent = lastSec?.content || '';
    }

    try {
      const { content, wordCount } = await CoAuthorWorkflowService.writeBookSection({
        bookTitle: state.bookTitle || state.selectedTitle,
        chapter,
        section,
        previousSectionContent: prevContent,
        proposedBook: state.proposedBook,
        persona: state.authorPersona,
        resources: state.resources
      });

      const updatedChapters = [...state.chapters];
      updatedChapters[chapterIdx].sections[sectionIdx].content = content;
      updatedChapters[chapterIdx].sections[sectionIdx].actualWordCount = wordCount;
      updatedChapters[chapterIdx].sections[sectionIdx].isGenerated = true;

      // Recalcula contagem total
      const totalWords = updatedChapters.reduce((acc, ch) => {
        return acc + ch.sections.reduce((sAcc, sec) => sAcc + (sec.actualWordCount || 0), 0);
      }, 0);

      setState(prev => ({
        ...prev,
        chapters: updatedChapters,
        totalGeneratedWords: totalWords,
        activeChapterIdx: chapterIdx,
        activeSectionIdx: sectionIdx
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // ── STEP 10: GERAR O RESTANTE DO LIVRO TODO DE UMA VEZ ──
  const handleGenerateEntireBook = async () => {
    setIsLoading(true);
    const updated = [...state.chapters];

    for (let c = 0; c < updated.length; c++) {
      for (let s = 0; s < updated[c].sections.length; s++) {
        if (!updated[c].sections[s].content) {
          setLoadingText(`Escrevendo Cap. ${c + 1}, Seção ${s + 1} de ${updated[c].sections.length}...`);
          let prevContent = '';
          if (s > 0) prevContent = updated[c].sections[s - 1]?.content || '';
          else if (c > 0) prevContent = updated[c - 1]?.sections[updated[c - 1].sections.length - 1]?.content || '';

          try {
            const { content, wordCount } = await CoAuthorWorkflowService.writeBookSection({
              bookTitle: state.bookTitle || state.selectedTitle,
              chapter: updated[c],
              section: updated[c].sections[s],
              previousSectionContent: prevContent,
              proposedBook: state.proposedBook,
              persona: state.authorPersona,
              resources: state.resources
            });
            updated[c].sections[s].content = content;
            updated[c].sections[s].actualWordCount = wordCount;
            updated[c].sections[s].isGenerated = true;
            setState(prev => ({ ...prev, chapters: [...updated] }));
          } catch {}
        }
      }
    }

    const totalWords = updated.reduce((acc, ch) => {
      return acc + ch.sections.reduce((sAcc, sec) => sAcc + (sec.actualWordCount || 0), 0);
    }, 0);

    setState(prev => ({ ...prev, chapters: updated, totalGeneratedWords: totalWords }));
    setIsLoading(false);
  };

  // ── STEP 10: INLINE ENHANCEMENT (ELABORATE, STRENGTHEN WITH DATA, SOURCES) ──
  const handleInlineEnhance = async (action: 'elaborate' | 'data' | 'source' | 'story' | 'diagram') => {
    if (!selectedText.trim() || isInlineLoading) return;
    setIsInlineLoading(true);

    const activeSec = state.chapters[state.activeChapterIdx]?.sections[state.activeSectionIdx];
    const fullText = activeSec?.content || '';

    try {
      const enhanced = await CoAuthorWorkflowService.enhanceInlineText({
        action,
        selectedText,
        sectionContext: fullText,
        topic: state.bookTopic,
        persona: state.authorPersona
      });

      if (enhanced && activeSec) {
        const newContent = fullText.replace(selectedText, enhanced);
        const updatedChapters = [...state.chapters];
        updatedChapters[state.activeChapterIdx].sections[state.activeSectionIdx].content = newContent;
        updatedChapters[state.activeChapterIdx].sections[state.activeSectionIdx].actualWordCount = newContent.split(/\s+/).length;

        setState(prev => ({ ...prev, chapters: updatedChapters }));
        setSelectedText('');
        setInlineAction(null);
      }
    } finally {
      setIsInlineLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#f8fafc',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#0f172a'
      }}
    >
      {/* ============================================================ */}
      {/* 🧭 COLUNA 1: FLUXO VERTICAL DO COAUTHOR (EXATAMENTE COMO O PRINT 2) */}
      {/* ============================================================ */}
      <aside
        style={{
          width: 290,
          background: '#ffffff',
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 40,
          flexShrink: 0
        }}
      >
        {/* TOPO DA COLUNA LATERAL */}
        <div style={{ padding: '24px 20px 16px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: '#0f172a',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: 14
              }}
            >
              CA
            </div>
            <div>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
                CoAuthor<span style={{ color: '#0284c7' }}>.ai</span>
              </span>
              <span style={{ fontSize: 10, background: '#e0f2fe', color: '#0369a1', padding: '1px 5px', borderRadius: 4, marginLeft: 6, fontWeight: 700 }}>
                KDP Studio
              </span>
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Step {state.currentStep} of 13
          </div>
          <h1 style={{ margin: '2px 0 0', fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
            {currentStepInfo.title}
          </h1>
        </div>

        {/* TIMELINE VERTICAL DOS 13 PASSOS */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 16px 20px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 0
          }}
        >
          {stepList.map((step, idx) => {
            const isActive = state.currentStep === step.id;
            const isCompleted = state.currentStep > step.id;
            const isLast = idx === stepList.length - 1;

            return (
              <div
                key={step.id}
                onClick={() => goToStep(step.id)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  position: 'relative',
                  cursor: 'pointer',
                  padding: '8px 6px',
                  borderRadius: 8,
                  background: isActive ? '#f8fafc' : 'transparent',
                  transition: 'background 0.15s'
                }}
              >
                {/* LINHA CONECTORA VERTICAL */}
                {!isLast && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 24,
                      left: 17,
                      width: 2,
                      height: 'calc(100% - 6px)',
                      background: isCompleted ? '#0284c7' : '#e2e8f0',
                      zIndex: 1
                    }}
                  />
                )}

                {/* NÓ DO PASSO */}
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: isCompleted ? '#0284c7' : isActive ? '#0f172a' : '#ffffff',
                    border: isActive ? '3px solid #38bdf8' : isCompleted ? '2px solid #0284c7' : '2px solid #cbd5e1',
                    color: isCompleted || isActive ? '#ffffff' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                    zIndex: 2,
                    marginRight: 12,
                    flexShrink: 0
                  }}
                >
                  {isCompleted ? <Check size={12} strokeWidth={3} /> : step.id}
                </div>

                {/* TEXTO DO PASSO */}
                <div style={{ flex: 1, paddingTop: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: isActive ? 700 : isCompleted ? 600 : 500,
                      color: isActive ? '#0f172a' : isCompleted ? '#334155' : '#94a3b8',
                      lineHeight: 1.3
                    }}
                  >
                    {step.title}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* RODAPÉ DA COLUNA (EXIT BOOK) */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9' }}>
          <button
            onClick={onExitBook}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: 8,
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              padding: '6px 8px',
              borderRadius: 6,
              transition: 'all 0.15s'
            }}
          >
            <ArrowLeft size={16} />
            <span>Exit Book</span>
          </button>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* 📄 ÁREA CENTRAL: MAIN CONTENT CANVAS (EXATAMENTE COMO O PRINT 2) */}
      {/* ============================================================ */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          background: '#f8fafc'
        }}
      >
        {/* BARRA SUPERIOR DE AÇÕES (BACK - TÍTULO CENTRAL - NEXT) */}
        <header
          style={{
            height: 64,
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 36px',
            position: 'sticky',
            top: 0,
            zIndex: 30
          }}
        >
          {/* BOTÃO BACK */}
          <button
            onClick={handleBack}
            disabled={state.currentStep === 1 || isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 18px',
              borderRadius: 8,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: state.currentStep === 1 ? '#cbd5e1' : '#334155',
              fontSize: 13,
              fontWeight: 600,
              cursor: state.currentStep === 1 ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <ChevronLeft size={16} />
            Back
          </button>

          {/* TÍTULO CENTRAL DA ETAPA */}
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.2px' }}>
              {currentStepInfo.title}
            </span>
          </div>

          {/* BOTÃO NEXT (AÇÃO PRIMÁRIA DE ALTO CONTRASTE) */}
          <button
            onClick={handleNext}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 22px',
              borderRadius: 8,
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: isLoading ? 'wait' : 'pointer',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.2)',
              transition: 'all 0.15s'
            }}
          >
            {isLoading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <span>{state.currentStep === 13 ? 'Concluir Livro' : 'Next'}</span>
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </header>

        {/* ÁREA DE CONTEÚDO SCROLLÁVEL */}
        <div style={{ flex: 1, padding: '32px 36px 80px 36px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 860 }}>
            {/* ============================================================ */}
            {/* ETAPA 1: RESEARCH (PESQUISA, STANCE E DIFERENCIAL ÚNICO) */}
            {/* ============================================================ */}
            {state.currentStep === 1 && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                    Tell us about your book.
                  </h2>
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                    Enter your book details below. The more information and context you provide, the better the book output.
                  </p>
                </div>

                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 14,
                    padding: 28,
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20
                  }}
                >
                  {/* TÍTULO E AUTOR */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Book Title (Optional)
                      </label>
                      <input
                        type="text"
                        value={state.bookTitle}
                        onChange={e => setState(prev => ({ ...prev, bookTitle: e.target.value }))}
                        placeholder="Ex: O Desafio dos 10 Minutos (ou deixe vazio para sugerirmos)"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Author Name (Real Name or Pen Name)
                      </label>
                      <input
                        type="text"
                        value={state.authorName}
                        onChange={e => setState(prev => ({ ...prev, authorName: e.target.value }))}
                        placeholder="Ex: Leandro Palmeira ou Kate Hanson"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }}
                      />
                    </div>
                  </div>

                  {/* GÊNERO E TEMA */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Book Genre
                      </label>
                      <select
                        value={state.genre}
                        onChange={e => setState(prev => ({ ...prev, genre: e.target.value }))}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none', background: '#ffffff' }}
                      >
                        <option>Autoajuda & Desenvolvimento Pessoal</option>
                        <option>Produtividade, Organização & Hábitos</option>
                        <option>Negócios, Liderança & Empreendedorismo</option>
                        <option>Finanças Pessoais & Investimentos</option>
                        <option>Saúde, Bem-estar & Longevidade</option>
                        <option>Suspense Psicológico & Ficção</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Book Topic
                      </label>
                      <input
                        type="text"
                        value={state.bookTopic}
                        onChange={e => setState(prev => ({ ...prev, bookTopic: e.target.value }))}
                        placeholder="Ex: Decluttering / Destralhamento e Organização sem estresse"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }}
                      />
                    </div>
                  </div>

                  {/* STANCE ON THE TOPIC (O DIFERENCIAL MESTRE DO COAUTHOR) */}
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 10,
                      padding: 16
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                        Stance on the topic (Opinião Forte / Posicionamento Único)
                      </label>
                      <span style={{ fontSize: 11, color: '#0284c7', fontWeight: 600 }}>
                        ⭐ O que torna seu livro único
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 10px' }}>
                      Seja contraintuitivo. Em vez de conselhos genéricos, defina sua tese (Ex: você não precisa de dietas malucas, só jejum intermitente; ou arrumar a casa não exige finais de semana, apenas 10 minutos diários).
                    </p>
                    <textarea
                      rows={3}
                      value={state.topicStance}
                      onChange={e => setState(prev => ({ ...prev, topicStance: e.target.value }))}
                      placeholder="Ex: A verdadeira organização não exige maratonas exaustivas de finais de semana. Apenas 10 minutos diários com micro-vitórias consistentes são suficientes..."
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none', resize: 'vertical' }}
                    />
                  </div>

                  {/* WHAT MAKES THIS BOOK STAND OUT */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      What makes this book stand out (Diferencial Competitivo)
                    </label>
                    <textarea
                      rows={2}
                      value={state.uniqueStandout}
                      onChange={e => setState(prev => ({ ...prev, uniqueStandout: e.target.value }))}
                      placeholder="Ex: Foco em táticas realistas para pessoas ocupadas, com estratégias simples para mães e profissionais com pouco tempo..."
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none', resize: 'vertical' }}
                    />
                  </div>

                  {/* TOM DO AUTOR E PÚBLICO */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Author Tone
                      </label>
                      <select
                        value={state.authorTone}
                        onChange={e => setState(prev => ({ ...prev, authorTone: e.target.value }))}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none', background: '#ffffff' }}
                      >
                        <option>Conversacional, empático e prático</option>
                        <option>Autoritário, direto e analítico</option>
                        <option>Inspirador, motivacional e caloroso</option>
                        <option>Humorístico, leve e descomplicado</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Target Audience
                      </label>
                      <input
                        type="text"
                        value={state.targetAudience}
                        onChange={e => setState(prev => ({ ...prev, targetAudience: e.target.value }))}
                        placeholder="Ex: Adultos ocupados, mães sobrecarregadas, profissionais"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* ETAPA 2: ANALYSIS (ANÁLISE DE MERCADO - EXATAMENTE O PRINT 2) */}
            {/* ============================================================ */}
            {state.currentStep === 2 && (
              <div>
                {/* CABEÇALHO ORIENTADOR (IGUAL AO PRINT 2) */}
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                    We've gathered your analysis.
                  </h2>
                  <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 10px' }}>
                    Here you can view existing books in your niche. Next, we'll curate a proposed book for you.
                  </p>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                    Click <strong style={{ color: '#0f172a' }}>'Next'</strong> to save your changes and continue.
                  </p>
                </div>

                {/* DISCLAIMER DO COAUTHOR (IGUAL AO PRINT 2) */}
                <div
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '10px 14px',
                    textAlign: 'center',
                    fontSize: 11,
                    color: '#64748b',
                    marginBottom: 24
                  }}
                >
                  <strong>Disclaimer:</strong> We do not copy these books. CoAuthor looks at other books to generate original content. CoAuthor never steals any content.
                </div>

                {/* CARD DA ANÁLISE DE MERCADO (PRINT 2) */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 24,
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                        Market Analysis
                      </h3>
                      <HelpCircle size={15} color="#94a3b8" />
                    </div>

                    <button
                      onClick={() => setIsAddBookModalOpen(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        borderRadius: 6,
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#0f172a',
                        cursor: 'pointer'
                      }}
                    >
                      <Plus size={14} />
                      Add Book
                    </button>
                  </div>

                  {/* LISTA DE BESTSELLERS CONCORRENTES */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {state.competitors.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '36px 0', color: '#64748b' }}>
                        <p style={{ margin: 0, fontSize: 13 }}>Nenhum concorrente cadastrado ainda.</p>
                      </div>
                    ) : (
                      state.competitors.map(comp => (
                        <div
                          key={comp.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 16,
                            padding: '12px 14px',
                            background: '#f8fafc',
                            borderRadius: 10,
                            border: '1px solid #f1f5f9',
                            transition: 'all 0.15s'
                          }}
                        >
                          {/* CAPA MINIATURA */}
                          <img
                            src={comp.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=120&q=80'}
                            alt={comp.title}
                            style={{
                              width: 48,
                              height: 68,
                              objectFit: 'cover',
                              borderRadius: 4,
                              boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                            }}
                          />

                          {/* INFORMAÇÕES DO LIVRO */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {comp.title}
                              </h4>
                              {comp.badge && (
                                <span style={{ fontSize: 10, background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: 4, fontWeight: 700, flexShrink: 0 }}>
                                  {comp.badge}
                                </span>
                              )}
                            </div>
                            <p style={{ margin: '0 0 4px', fontSize: 12, color: '#64748b' }}>
                              por <strong style={{ color: '#334155' }}>{comp.author}</strong>
                              {comp.rating && ` • ⭐ ${comp.rating} (${comp.reviewCount || 0} reviews)`}
                            </p>
                            {comp.subtitle && (
                              <p style={{ margin: 0, fontSize: 12, color: '#475569', fontStyle: 'italic' }}>
                                {comp.subtitle}
                              </p>
                            )}
                          </div>

                          {/* BOTÃO DE LIXEIRA (REMOVER CONCORRENTE IRRELEVANTE - PRINT 2) */}
                          <button
                            onClick={() => handleRemoveCompetitor(comp.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: 8,
                              borderRadius: 6,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: 0.8,
                              transition: 'opacity 0.2s'
                            }}
                            title="Remover livro da análise"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* MODAL SIMPLES PARA ADICIONAR LIVRO */}
                {isAddBookModalOpen && (
                  <div
                    style={{
                      position: 'fixed',
                      inset: 0,
                      background: 'rgba(15, 23, 42, 0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 9999
                    }}
                  >
                    <div style={{ background: '#ffffff', borderRadius: 12, padding: 24, width: 440, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                      <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>
                        Adicionar Livro de Referência
                      </h3>
                      <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
                        Cole a URL ou o título do livro da Amazon para o CoAuthor aprender com ele:
                      </p>
                      <input
                        type="text"
                        value={newCompetitorUrl}
                        onChange={e => setNewCompetitorUrl(e.target.value)}
                        placeholder="Ex: https://amazon.com/dp/... ou Título do Livro"
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, marginBottom: 16, outline: 'none' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                        <button
                          onClick={() => setIsAddBookModalOpen(false)}
                          style={{ padding: '8px 14px', borderRadius: 6, background: '#f1f5f9', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleAddManualBook}
                          style={{ padding: '8px 16px', borderRadius: 6, background: '#0f172a', color: '#ffffff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ============================================================ */}
            {/* ETAPA 3: BOOK TITLE (10 OPÇÕES DE TÍTULOS CAMPEÕES) */}
            {/* ============================================================ */}
            {state.currentStep === 3 && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                    Choose your book title.
                  </h2>
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                    Select one of the 10 data-driven titles generated for maximum Amazon conversion, or customize your own.
                  </p>
                </div>

                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 24,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Selected Title
                    </label>
                    <input
                      type="text"
                      value={state.bookTitle || state.selectedTitle}
                      onChange={e => setState(prev => ({ ...prev, bookTitle: e.target.value, selectedTitle: e.target.value }))}
                      style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 15, fontWeight: 700, outline: 'none' }}
                    />
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Selected Subtitle (Promessa Clara e Método)
                    </label>
                    <input
                      type="text"
                      value={state.selectedSubtitle}
                      onChange={e => setState(prev => ({ ...prev, selectedSubtitle: e.target.value }))}
                      placeholder="Subtítulo do livro..."
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }}
                    />
                  </div>

                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
                    Sugestões Geradas pelo CoAuthor (Clique para Selecionar):
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                    {state.titleOptions.map((opt, idx) => {
                      const isSelected = (state.bookTitle === opt.title) || (state.selectedTitle === opt.title);
                      return (
                        <div
                          key={idx}
                          onClick={() => setState(prev => ({
                            ...prev,
                            bookTitle: opt.title,
                            selectedTitle: opt.title,
                            selectedSubtitle: opt.subtitle
                          }))}
                          style={{
                            padding: '12px 16px',
                            borderRadius: 8,
                            border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                            background: isSelected ? '#f0f9ff' : '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.15s'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                              {opt.title}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>
                              {opt.subtitle}
                            </div>
                          </div>
                          <span style={{ fontSize: 11, color: isSelected ? '#0284c7' : '#94a3b8', fontWeight: 600 }}>
                            {isSelected ? '✓ Selecionado' : 'Selecionar'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* ETAPA 4: RESOURCES (FONTES E DOCUMENTOS DO PROJETO) */}
            {/* ============================================================ */}
            {state.currentStep === 4 && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                    Add project resources & research.
                  </h2>
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                    Upload files, paste research notes, or link articles. CoAuthor will use these resources as background context to prevent generic AI text.
                  </p>
                </div>

                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 24,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16
                  }}
                >
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Adicionar Anotação ou Dado de Pesquisa
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Cole aqui links de autoridade, estatísticas ou tópicos que você quer que estejam no livro..."
                      onKeyDown={e => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                          const target = e.target as HTMLTextAreaElement;
                          if (target.value.trim()) {
                            setState(prev => ({
                              ...prev,
                              resources: [
                                ...prev.resources,
                                {
                                  id: `res-${Date.now()}`,
                                  type: 'text',
                                  title: target.value.trim().slice(0, 40) + '...',
                                  content: target.value.trim(),
                                  dateAdded: new Date().toLocaleDateString()
                                }
                              ]
                            }));
                            target.value = '';
                          }
                        }
                      }}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }}
                    />
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Dica: Pressione Ctrl + Enter para adicionar a anotação</span>
                  </div>

                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: '8px 0 0' }}>
                    Recursos Anexados ({state.resources.length})
                  </h3>

                  {state.resources.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 13, background: '#f8fafc', borderRadius: 8 }}>
                      Nenhum recurso extra adicionado ainda. A IA usará o corpus do nicho.
                    </div>
                  ) : (
                    state.resources.map(res => (
                      <div
                        key={res.id}
                        style={{
                          padding: 12,
                          background: '#f8fafc',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{res.title}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>Adicionado em {res.dateAdded}</div>
                        </div>
                        <button
                          onClick={() => setState(prev => ({ ...prev, resources: prev.resources.filter(r => r.id !== res.id) }))}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* ETAPA 5: AUTHOR PERSONA (VOZ E STORYTELLING DO AUTOR) */}
            {/* ============================================================ */}
            {state.currentStep === 5 && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                    Define the author persona.
                  </h2>
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                    Great non-fiction books deliver advice through compelling storytelling. Define who is speaking to create a cohesive voice across your book or series.
                  </p>
                </div>

                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 24,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Author Name / Pen Name
                      </label>
                      <input
                        type="text"
                        value={state.authorPersona.name}
                        onChange={e => setState(prev => ({
                          ...prev,
                          authorPersona: { ...prev.authorPersona, name: e.target.value },
                          authorName: e.target.value
                        }))}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Tipo de Assinatura
                      </label>
                      <select
                        value={state.authorPersona.isPenName ? 'pen-name' : 'real-name'}
                        onChange={e => setState(prev => ({
                          ...prev,
                          authorPersona: { ...prev.authorPersona, isPenName: e.target.value === 'pen-name' }
                        }))}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none', background: '#ffffff' }}
                      >
                        <option value="pen-name">Pseudônimo Estratégico (Pen Name)</option>
                        <option value="real-name">Nome Real do Autor</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Background & Vivência Pessoal (Ex: Mãe de dois filhos, empresário, médico)
                    </label>
                    <input
                      type="text"
                      value={state.authorPersona.background}
                      onChange={e => setState(prev => ({
                        ...prev,
                        authorPersona: { ...prev.authorPersona, background: e.target.value }
                      }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Histórias Reais de Vida a Serem Usadas nos Capítulos (Storytelling)
                    </label>
                    <textarea
                      rows={3}
                      value={state.authorPersona.realLifeStories.join('\n')}
                      onChange={e => setState(prev => ({
                        ...prev,
                        authorPersona: { ...prev.authorPersona, realLifeStories: e.target.value.split('\n').filter(Boolean) }
                      }))}
                      placeholder="Ex: O dia em que a sobrecarga quase a fez desistir e como uma regra de 5 minutos transformou sua rotina..."
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* ETAPA 6: PROPOSED BOOK (USP E COMPARAÇÃO COM CONCORRENTES) */}
            {/* ============================================================ */}
            {state.currentStep === 6 && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                    Proposed Book & Unique Selling Point.
                  </h2>
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                    Here is the strategic book proposal. We model the proven strengths of best-sellers and differentiate with your unique edge.
                  </p>
                </div>

                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 24,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 18
                  }}
                >
                  {/* TAGS DE FOCO INTERATIVAS */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                      Aspectos e Tags de Foco do Livro:
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {['Táticas de 10 Minutos', 'Estratégias Realistas', 'Mudança de Mentalidade', 'Vida Sem Estresse', 'Guia Conversacional', 'Micro-Vitórias Diárias'].map(tag => {
                        const isSelected = state.proposedBook.selectedFocusTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            onClick={() => {
                              const tags = isSelected
                                ? state.proposedBook.selectedFocusTags.filter(t => t !== tag)
                                : [...state.proposedBook.selectedFocusTags, tag];
                              setState(prev => ({
                                ...prev,
                                proposedBook: { ...prev.proposedBook, selectedFocusTags: tags }
                              }));
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 20,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: isSelected ? '1px solid #0284c7' : '1px solid #e2e8f0',
                              background: isSelected ? '#0284c7' : '#f8fafc',
                              color: isSelected ? '#ffffff' : '#334155',
                              transition: 'all 0.15s'
                            }}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* USP */}
                  <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', marginBottom: 4 }}>
                      Unique Selling Point (USP)
                    </div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0f172a', lineHeight: 1.5 }}>
                      {state.proposedBook.uniqueSellingPoint}
                    </p>
                  </div>

                  {/* DIFERENCIAÇÃO COMPETITIVA */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: 6 }}>
                      Como este livro se diferencia dos concorrentes da Amazon:
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                      {state.proposedBook.competitiveDifferentiation}
                    </p>
                  </div>

                  {/* PONTOS DE VENDA CHAVE */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: 8 }}>
                      Key Selling Points:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {state.proposedBook.keySellingPoints.map((ksp, i) => (
                        <li key={i} style={{ fontSize: 13, color: '#334155' }}>
                          <strong>{ksp}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* ETAPA 7: DETAILS (PARÂMETROS TÉCNICOS DA OBRA) */}
            {/* ============================================================ */}
            {state.currentStep === 7 && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                    Configure book details.
                  </h2>
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                    Select word count target, chapters and architectural flow.
                  </p>
                </div>

                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 24,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20
                  }}
                >
                  {/* META DE PALAVRAS (CHIPS) */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                      Target Word Count
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                      {[
                        { id: '10k-15k', label: '10K - 15K', sub: 'Leitura rápida (40-60 páginas)' },
                        { id: '20k-25k', label: '20K - 25K', sub: 'Padrão Bestseller (80-110 páginas)' },
                        { id: '30k-35k', label: '30K - 35K', sub: 'Manual Completo (130-160 páginas)' },
                        { id: '35k-40k', label: '35K - 40K', sub: 'Guia Definitivo (170+ páginas)' }
                      ].map(wc => {
                        const isSel = state.details.wordCountTarget === wc.id;
                        return (
                          <button
                            key={wc.id}
                            onClick={() => setState(prev => ({ ...prev, details: { ...prev.details, wordCountTarget: wc.id as any } }))}
                            style={{
                              padding: '12px 10px',
                              borderRadius: 8,
                              border: isSel ? '2px solid #0284c7' : '1px solid #e2e8f0',
                              background: isSel ? '#f0f9ff' : '#ffffff',
                              cursor: 'pointer',
                              textAlign: 'center'
                            }}
                          >
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{wc.label}</div>
                            <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>{wc.sub}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* QUANTIDADE DE CAPÍTULOS */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                      Número de Capítulos: <strong style={{ color: '#0284c7' }}>{state.details.chapterCount} Capítulos</strong>
                    </label>
                    <input
                      type="range"
                      min={6}
                      max={15}
                      step={1}
                      value={state.details.chapterCount}
                      onChange={e => setState(prev => ({ ...prev, details: { ...prev.details, chapterCount: Number(e.target.value) } }))}
                      style={{ width: '100%' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
                      <span>6 Capítulos</span>
                      <span>10 Capítulos (Recomendado)</span>
                      <span>15 Capítulos</span>
                    </div>
                  </div>

                  {/* ESTRUTURA DO LIVRO */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                      Book Structure
                    </label>
                    <select
                      value={state.details.bookStructure}
                      onChange={e => setState(prev => ({ ...prev, details: { ...prev.details, bookStructure: e.target.value as any } }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#ffffff' }}
                    >
                      <option value="problem-solution">Problem - Solution (Ideal para Autoajuda & Produtividade)</option>
                      <option value="step-by-step">Framework Step-by-Step (Método progressivo passo a passo)</option>
                      <option value="chronological">Jornada Narrativa Cronológica</option>
                      <option value="topical-mastery">Domínio Temático por Módulos</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* ETAPA 8: AUTHOR BIO (BIOGRAFIA OFICIAL) */}
            {/* ============================================================ */}
            {state.currentStep === 8 && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                    Author Biography.
                  </h2>
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                    This biography will be displayed in Amazon Author Central and inside the book.
                  </p>
                </div>

                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 24,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                  }}
                >
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                    Official Author Bio (Editável)
                  </label>
                  <textarea
                    rows={6}
                    value={state.authorBiography}
                    onChange={e => setState(prev => ({ ...prev, authorBiography: e.target.value }))}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, lineHeight: 1.6, outline: 'none' }}
                  />
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* ETAPA 9: OUTLINE (SUMÁRIO GRANULAR COM RITMO DINÂMICO) */}
            {/* ============================================================ */}
            {state.currentStep === 9 && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                    Book Outline & Chapter Hierarchy.
                  </h2>
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                    Notice that word counts vary per chapter and section to deliver a natural reading tempo without robotic repetition.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {state.chapters.map((ch, cIdx) => (
                    <div
                      key={ch.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                        padding: 20,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>
                            Capítulo {ch.chapterNumber}
                          </span>
                          <h3 style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                            {ch.title}
                          </h3>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '3px 8px', borderRadius: 6 }}>
                          ~{ch.targetWordCount} palavras
                        </span>
                      </div>

                      {/* SEÇÕES DO CAPÍTULO */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 12, borderLeft: '2px solid #e2e8f0' }}>
                        {ch.sections.map((sec, sIdx) => (
                          <div
                            key={sec.id}
                            style={{
                              background: '#f8fafc',
                              padding: '10px 14px',
                              borderRadius: 8,
                              border: '1px solid #f1f5f9'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                                {sec.sectionNumber}. {sec.title}
                              </span>
                              <span style={{ fontSize: 11, color: '#64748b' }}>
                                ~{sec.suggestedWordCount} palavras
                              </span>
                            </div>

                            {/* SUBSEÇÕES */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                              {sec.subSections.map(sub => (
                                <span
                                  key={sub.id}
                                  style={{ fontSize: 10, background: '#ffffff', border: '1px solid #e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: 4 }}
                                >
                                  • {sub.title}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* ETAPA 10: WRITE (ESCRITA SEÇÃO POR SEÇÃO COM INLINE EDITOR) */}
            {/* ============================================================ */}
            {state.currentStep === 10 && (
              <div>
                {/* BARRA SUPERIOR DE PROGRESSO E AÇÕES */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: '16px 20px',
                    marginBottom: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      Progresso da Obra
                    </span>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                      {state.totalGeneratedWords.toLocaleString()} palavras escritas
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={handleGenerateEntireBook}
                      disabled={isLoading}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        background: '#0284c7',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Gerar Livro Completo de Uma Vez
                    </button>
                  </div>
                </div>

                {/* VISUALIZAÇÃO SEÇÃO POR SEÇÃO */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {state.chapters.map((ch, cIdx) => (
                    <div key={ch.id} style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
                      <h3 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                        {ch.title}
                      </h3>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                        {ch.sections.map((sec, sIdx) => {
                          const hasContent = Boolean(sec.content);

                          return (
                            <div
                              key={sec.id}
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: 10,
                                padding: 18
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                <div>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0284c7' }}>
                                    Seção {sec.sectionNumber}
                                  </span>
                                  <h4 style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                                    {sec.title}
                                  </h4>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  {hasContent && (
                                    <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>
                                      ✓ {sec.actualWordCount} palavras
                                    </span>
                                  )}
                                  <button
                                    onClick={() => handleWriteSection(cIdx, sIdx)}
                                    disabled={isLoading}
                                    style={{
                                      padding: '6px 14px',
                                      borderRadius: 6,
                                      background: hasContent ? '#ffffff' : '#0f172a',
                                      color: hasContent ? '#334155' : '#ffffff',
                                      border: hasContent ? '1px solid #cbd5e1' : 'none',
                                      fontSize: 12,
                                      fontWeight: 600,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {hasContent ? 'Regenerar Seção' : 'Escrever Esta Seção'}
                                  </button>
                                </div>
                              </div>

                              {/* TEXTO GERADO COM SUPORTE A SELEÇÃO INLINE */}
                              {hasContent ? (
                                <div>
                                  <div
                                    onMouseUp={() => {
                                      const sel = window.getSelection()?.toString();
                                      if (sel && sel.trim().length > 5) {
                                        setSelectedText(sel.trim());
                                        setState(prev => ({ ...prev, activeChapterIdx: cIdx, activeSectionIdx: sIdx }));
                                      }
                                    }}
                                    style={{
                                      fontSize: 14,
                                      lineHeight: 1.7,
                                      color: '#1e293b',
                                      whiteSpace: 'pre-wrap',
                                      background: '#ffffff',
                                      padding: 16,
                                      borderRadius: 8,
                                      border: '1px solid #e2e8f0'
                                    }}
                                  >
                                    {sec.content}
                                  </div>

                                  {/* MENU FLUTUANTE DE MELHORIA INLINE (QUANDO SELECIONA TEXTO) */}
                                  {selectedText && state.activeChapterIdx === cIdx && state.activeSectionIdx === sIdx && (
                                    <div
                                      style={{
                                        marginTop: 10,
                                        padding: '10px 14px',
                                        background: '#0f172a',
                                        borderRadius: 8,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        flexWrap: 'wrap',
                                        boxShadow: '0 8px 20px rgba(0,0,0,0.2)'
                                      }}
                                    >
                                      <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8' }}>
                                        CoAuthor Inline:
                                      </span>
                                      <button
                                        onClick={() => handleInlineEnhance('elaborate')}
                                        disabled={isInlineLoading}
                                        style={{ background: '#1e293b', color: '#ffffff', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}
                                      >
                                        ✨ Elaborate
                                      </button>
                                      <button
                                        onClick={() => handleInlineEnhance('data')}
                                        disabled={isInlineLoading}
                                        style={{ background: '#1e293b', color: '#ffffff', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}
                                      >
                                        📊 Strengthen with Data
                                      </button>
                                      <button
                                        onClick={() => handleInlineEnhance('source')}
                                        disabled={isInlineLoading}
                                        style={{ background: '#1e293b', color: '#ffffff', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}
                                      >
                                        📚 Add Source
                                      </button>
                                      <button
                                        onClick={() => handleInlineEnhance('story')}
                                        disabled={isInlineLoading}
                                        style={{ background: '#1e293b', color: '#ffffff', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}
                                      >
                                        📖 Insert Story
                                      </button>
                                      <button
                                        onClick={() => handleInlineEnhance('diagram')}
                                        disabled={isInlineLoading}
                                        style={{ background: '#1e293b', color: '#ffffff', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}
                                      >
                                        🎨 Diagram
                                      </button>
                                      <button
                                        onClick={() => setSelectedText('')}
                                        style={{ background: 'transparent', color: '#94a3b8', border: 'none', padding: '4px 6px', fontSize: 11, cursor: 'pointer' }}
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                                  Seção pendente de geração. Clique no botão acima para escrever com o CoAuthor.
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* ETAPA 11: DESCRIPTION (COPY DE VENDAS AMAZON - 5 BLOCOS) */}
            {/* ============================================================ */}
            {state.currentStep === 11 && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                    Amazon Book Description (5 Blocks Formula).
                  </h2>
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                    Trained on Sean Dollwet's high-converting structure: Headline, Relate, Bullets, Overcoming Objections, Call to Action.
                  </p>
                </div>

                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 24,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(state.amazonDescription.formattedHtml);
                        setCopiedDescription(true);
                        setTimeout(() => setCopiedDescription(false), 2000);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        borderRadius: 6,
                        background: copiedDescription ? '#10b981' : '#0f172a',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {copiedDescription ? <Check size={14} /> : <Copy size={14} />}
                      {copiedDescription ? 'Copiado para KDP!' : 'Copiar HTML para Amazon KDP'}
                    </button>
                  </div>

                  <div
                    dangerouslySetInnerHTML={{ __html: state.amazonDescription.formattedHtml }}
                    style={{
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: '#1e293b',
                      background: '#f8fafc',
                      padding: 20,
                      borderRadius: 8,
                      border: '1px solid #e2e8f0'
                    }}
                  />
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* ETAPA 12: BOOK COVER (DIREÇÃO DE ARTE EDITORIAL) */}
            {/* ============================================================ */}
            {state.currentStep === 12 && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                    Book Cover Design Direction.
                  </h2>
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                    Editorial cover styling aligned with bestselling trends in your category.
                  </p>
                </div>

                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 28,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 32
                  }}
                >
                  <div
                    style={{
                      width: 200,
                      height: 300,
                      borderRadius: 8,
                      background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
                      color: '#ffffff',
                      boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
                      padding: 20,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#38bdf8', letterSpacing: '1px', fontWeight: 700 }}>
                      BESTSELLER KDP
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 900, lineHeight: 1.2 }}>
                        {state.bookTitle || state.selectedTitle}
                      </h4>
                      <p style={{ margin: 0, fontSize: 10, color: '#94a3b8' }}>
                        {state.selectedSubtitle}
                      </p>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#f8fafc' }}>
                      {state.authorName}
                    </div>
                  </div>

                  <div style={{ maxWidth: 360 }}>
                    <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>
                      Direção de Arte Recomendada
                    </h3>
                    <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px', lineHeight: 1.5 }}>
                      Tipografia imponente, contraste elevado e paleta minimalista inspirada nas capas campeãs de vendas da Amazon KDP.
                    </p>
                    <div style={{ fontSize: 12, color: '#334155', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div>🎨 <strong>Estilo:</strong> {state.coverStyle}</div>
                      <div>🎨 <strong>Paleta:</strong> {state.coverPalette}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* ETAPA 13: FINISH (RESUMO GERAL E EXPORTAÇÕES KDP) */}
            {/* ============================================================ */}
            {state.currentStep === 13 && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
                  <h2 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '0 0 6px' }}>
                    Congratulations! Your book is complete.
                  </h2>
                  <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
                    Your book was structured, analyzed and written following CoAuthor's bestseller standards.
                  </p>
                </div>

                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 28,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                    <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                        {state.totalGeneratedWords.toLocaleString()}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Palavras Geradas</div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                        {state.chapters.length}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Capítulos Estruturados</div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                        ~{Math.round(state.totalGeneratedWords / 250)}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Páginas KDP (6x9")</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 10 }}>
                    <button
                      onClick={() => {
                        try {
                          const capitulos = state.chapters.map(ch => ({
                            titulo: ch.title,
                            texto: ch.sections.map(s => `### ${s.title}\n\n${s.content || ''}`).join('\n\n')
                          }));

                          const res = buildKdpPdf({
                            livro: {
                              titulo: state.bookTitle || state.selectedTitle || 'Livro Sem Título',
                              subtitulo: state.selectedSubtitle,
                              autor: state.authorName || 'Autor KDP',
                              genero: state.genre,
                              idioma: 'pt-BR',
                              capitulos: capitulos.length > 0 ? capitulos : [{ titulo: 'Introdução', texto: 'Conteúdo em desenvolvimento.' }]
                            },
                            formato: '6x9',
                            optSumario: true,
                            tamCapitulo: 18,
                            corCapitulo: '#1e293b'
                          });

                          const filename = `${(state.bookTitle || state.selectedTitle || 'livro_kdp').toLowerCase().replace(/[^a-z0-9]/g, '_')}_kdp.pdf`;
                          const blob = new Blob([res.bytes as any], { type: 'application/pdf' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = filename;
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch (err: any) {
                          alert(`Erro ao gerar PDF: ${err.message}`);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px 24px',
                        borderRadius: 8,
                        background: '#0f172a',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <Download size={16} />
                      Download PDF KDP Diagramado
                    </button>

                    <button
                      onClick={() => {
                        try {
                          let docText = `# ${state.bookTitle || state.selectedTitle || 'Livro Sem Título'}\n`;
                          if (state.selectedSubtitle) docText += `## ${state.selectedSubtitle}\n\n`;
                          docText += `**Autor:** ${state.authorName || 'Autor'}\n\n`;
                          if (state.authorBiography) docText += `### Sobre o Autor\n${state.authorBiography}\n\n---\n\n`;

                          state.chapters.forEach(ch => {
                            docText += `\n# Capítulo ${ch.chapterNumber}: ${ch.title}\n\n`;
                            ch.sections.forEach(s => {
                              docText += `## ${s.title}\n\n`;
                              docText += `${s.content || ''}\n\n`;
                            });
                          });

                          const blob = new Blob([docText], { type: 'text/markdown;charset=utf-8' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${(state.bookTitle || state.selectedTitle || 'livro').toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`;
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch (err: any) {
                          alert(`Erro ao exportar: ${err.message}`);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px 24px',
                        borderRadius: 8,
                        background: '#ffffff',
                        color: '#0f172a',
                        border: '1px solid #cbd5e1',
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <FileText size={16} />
                      Download DOCX / Manuscrito
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ============================================================ */}
      {/* 🤖 CHATBOT WRITING ASSISTANT INTEGRADO (CANTO INFERIOR DIREITO) */}
      {/* ============================================================ */}
      <CoAuthorWritingAssistantDrawer
        project={state}
        onApplySnippet={(text, targetField) => {
          if (targetField === 'topicStance') {
            setState(prev => ({ ...prev, topicStance: text }));
          } else if (targetField === 'uniqueStandout') {
            setState(prev => ({ ...prev, uniqueStandout: text }));
          }
        }}
      />
    </div>
  );
};
