import React, { useState } from 'react';
import {
  Film, Sparkles, ArrowRight, ArrowLeft, Check, Camera, Layers,
  BookOpen, RefreshCw, Eye, CheckCircle2, AlertCircle, Edit3, X
} from 'lucide-react';
import {
  CinematicNovelProjectData,
  CinematicCharacter,
  CinematicGenre
} from '../../../types/cinematic-novel';
import {
  CinematicNovelService,
  CreateCinematicNovelParams
} from '../../../services/cinematic-novel-service';

interface CinematicNovelWizardProps {
  onComplete: (project: CinematicNovelProjectData) => void;
  onCancel: () => void;
}

export const CinematicNovelWizard: React.FC<CinematicNovelWizardProps> = ({
  onComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');

  // Etapa 1: Dados da História
  const [genre, setGenre] = useState<CinematicGenre>('suspense-psicologico');
  const [subgenre, setSubgenre] = useState<string>('Mistério Doméstico & Investigação Psicológica');
  const [language, setLanguage] = useState<string>('Português');
  const [targetAudience, setTargetAudience] = useState<string>('Adulto / Geral');
  const [title, setTitle] = useState<string>('A Última Mentira Perfeita');
  const [subtitle, setSubtitle] = useState<string>('O Despertar no Quarto Cinza');
  const [premise, setPremise] = useState<string>(
    'Uma mulher acorda às 06:17 da manhã em seu quarto silencioso com a sensação paralisante de ter perdido a memória da noite anterior. Ao descer para a cozinha, encontra a cafeteira ligada e um envelope pardo contendo um bilhete perturbador: "Você esqueceu o que aconteceu na ponte". Ao buscar respostas com seu psiquiatra, descobre que todos ao seu redor estão escondendo um segredo estarrecedor.'
  );
  const [totalChaptersPlanned, setTotalChaptersPlanned] = useState<number>(3);
  const [approximatePages, setApproximatePages] = useState<number>(12);
  const [visualStyle, setVisualStyle] = useState<string>('Fotografia Cinematográfica 35mm Realista');
  const [emotionalTone, setEmotionalTone] = useState<string>('Tenso, claustrofóbico e envolvente');
  const [endingType, setEndingType] = useState<string>('Plot twist chocante com revelação psicológica');
  const [narrativePov, setNarrativePov] = useState<string>('Terceira pessoa limitada focada na protagonista');

  // Estado do Projeto construído ao longo dos passos
  const [projectData, setProjectData] = useState<CinematicNovelProjectData | null>(null);

  // Etapa 1 -> Etapa 2: Gerar Roteiro e Bíblias
  const handleProceedToStep2 = async () => {
    setIsLoading(true);
    setLoadingMessage('Construindo Story Bible e Roteiro Cinematográfico...');
    try {
      const initial = CinematicNovelService.createInitialProject({
        title,
        subtitle,
        author: 'Leandro Palmeira',
        genre,
        subgenre,
        language,
        targetAudience,
        premise,
        totalChaptersPlanned,
        approximatePages,
        visualStyle,
        emotionalTone,
        endingType,
        narrativePov
      });

      const { storyBible, characters, suggestedTitle, suggestedSubtitle } =
        await CinematicNovelService.generateScriptAndBibles(initial);

      const updatedChecklist = initial.checklist.map(t => {
        if (t.id === 't1' || t.id === 't2' || t.id === 't3' || t.id === 't6' || t.id === 't7') {
          return { ...t, isCompleted: true, completedAt: Date.now() };
        }
        return t;
      });

      const readyProject: CinematicNovelProjectData = {
        ...initial,
        title: suggestedTitle || title,
        subtitle: suggestedSubtitle || subtitle,
        storyBible,
        characters,
        checklist: updatedChecklist,
        status: 'roteiro',
        updatedAt: Date.now()
      };

      setProjectData(readyProject);
      setCurrentStep(2);
    } catch (err: any) {
      alert(`Erro ao planejar roteiro: ${err?.message || 'Falha de conexão'}`);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  // Etapa 2 -> Etapa 3: Aprovação de Roteiro e ir para Personagens
  const handleProceedToStep3 = async () => {
    if (!projectData) return;
    setIsLoading(true);
    setLoadingMessage('Gerando fotos de referência fotorrealistas para a Character Bible...');
    try {
      // Gera referências visuais fotorrealistas para os personagens
      const charactersWithPhotos = await Promise.all(
        projectData.characters.map(async (char) => {
          if (char.referenceImageUrl) return char;
          const { imageUrl, prompt } = await CinematicNovelService.generateCharacterVisualReference(char);
          return {
            ...char,
            referenceImageUrl: imageUrl,
            referencePrompt: prompt
          };
        })
      );

      const updatedChecklist = projectData.checklist.map(t => {
        if (t.id === 't4') return { ...t, isCompleted: true, completedAt: Date.now() };
        return t;
      });

      setProjectData({
        ...projectData,
        characters: charactersWithPhotos,
        checklist: updatedChecklist,
        status: 'personagens',
        updatedAt: Date.now()
      });
      setCurrentStep(3);
    } catch (err: any) {
      alert(`Falha ao preparar personagens: ${err?.message || ''}`);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  // Aprova um personagem individualmente
  const handleToggleApproveCharacter = (charId: string) => {
    if (!projectData) return;
    const updatedChars = projectData.characters.map(c => 
      c.id === charId ? { ...c, isApproved: !c.isApproved } : c
    );
    setProjectData({
      ...projectData,
      characters: updatedChars
    });
  };

  // Etapa 3 -> Etapa 4: Planejar Páginas (Pipeline individual por página)
  const handleProceedToStep4 = async () => {
    if (!projectData) return;
    setIsLoading(true);
    setLoadingMessage('Executando Page Generation Pipeline (prompts exclusivos por página)...');
    try {
      // Planeja as páginas iniciais do livro
      const page1 = await CinematicNovelService.planPage(projectData, 1, 1);
      const page2 = await CinematicNovelService.planPage(projectData, 1, 2);

      const updatedChecklist = projectData.checklist.map(t => {
        if (t.id === 't5' || t.id === 't8' || t.id === 't9') {
          return { ...t, isCompleted: true, completedAt: Date.now() };
        }
        return t;
      });

      setProjectData({
        ...projectData,
        pages: [page1, page2],
        checklist: updatedChecklist,
        status: 'paginas_planejadas',
        updatedAt: Date.now()
      });
      setCurrentStep(4);
    } catch (err: any) {
      alert(`Erro no planejamento de páginas: ${err?.message || ''}`);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  // Etapa 4 -> Etapa 5: Gerar Fotografias e Montar o Livro
  const handleProceedToStep5 = async () => {
    if (!projectData) return;
    setIsLoading(true);
    setLoadingMessage('Gerando fotografia cinematográfica das páginas com IA e integrando textos...');
    try {
      const generatedPages = await Promise.all(
        projectData.pages.map(async (p) => {
          if (p.imageUrl) return p;
          const imageUrl = await CinematicNovelService.generatePageVisual(p);
          return {
            ...p,
            imageUrl,
            validationStatus: 'gerado' as const
          };
        })
      );

      const updatedChecklist = projectData.checklist.map(t => {
        if (t.id === 't10' || t.id === 't11' || t.id === 't12' || t.id === 't13') {
          return { ...t, isCompleted: true, completedAt: Date.now() };
        }
        return t;
      });

      const finalProject: CinematicNovelProjectData = {
        ...projectData,
        pages: generatedPages,
        checklist: updatedChecklist,
        status: 'revisao',
        coverImageUrl: generatedPages[0]?.imageUrl,
        updatedAt: Date.now()
      };

      setProjectData(finalProject);
      setCurrentStep(5);
    } catch (err: any) {
      alert(`Falha na geração visual: ${err?.message || ''}`);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  // Concluir e abrir o Editor
  const handleFinishWizard = () => {
    if (projectData) {
      onComplete(projectData);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(2, 6, 23, 0.96)',
      backdropFilter: 'blur(16px)',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* CABEÇALHO DO WIZARD */}
      <div style={{
        padding: '16px 32px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#090d16'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0f172a',
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
          }}>
            <Film size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#ffffff' }}>
              Foto Livro Realista
            </h2>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              Assistente de Criação Editorial Especializado (6 Etapas)
            </span>
          </div>
        </div>

        {/* INDICADOR DE ETAPAS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {[
            { num: 1, label: 'História' },
            { num: 2, label: 'Roteiro' },
            { num: 3, label: 'Personagens' },
            { num: 4, label: 'Pipeline' },
            { num: 5, label: 'Montagem' }
          ].map(s => (
            <div
              key={s.num}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 20,
                background: currentStep === s.num ? '#2563eb' : currentStep > s.num ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: currentStep === s.num ? '#ffffff' : currentStep > s.num ? '#34d399' : '#64748b',
                fontSize: 12,
                fontWeight: 700
              }}
            >
              <span>{currentStep > s.num ? '✓' : s.num}</span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onCancel}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: 8
          }}
          title="Fechar"
        >
          <X size={20} />
        </button>
      </div>

      {/* OVERLAY DE CARREGAMENTO */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 73,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(9, 13, 22, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          zIndex: 10
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 999,
            border: '3px solid #334155',
            borderTopColor: '#f59e0b',
            animation: 'spin 1s linear infinite'
          }} />
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>
            {loadingMessage || 'Processando com IA...'}
          </h3>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>
            Garantindo coerência cinematográfica e imagens de alta resolução
          </span>
        </div>
      )}

      {/* CORPO DO FORMULÁRIO */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
        
        {/* ============================================================ */}
        {/* ETAPA 1: DEFINIR A HISTÓRIA */}
        {/* ============================================================ */}
        {currentStep === 1 && (
          <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Etapa 1 de 5
              </span>
              <h3 style={{ margin: '4px 0 8px', fontSize: 24, fontWeight: 900, color: '#ffffff' }}>
                Defina a Atmosfera e a Premissa do Foto Livro Realista
              </h3>
              <p style={{ margin: 0, fontSize: 14, color: '#94a3b8', lineHeight: 1.5 }}>
                O gênero e o tom emocional determinam a direção artística das fotos, a tensão dramática e a estrutura visual dos quadros.
              </p>
            </div>

            {/* SELEÇÃO DE GÊNEROS */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: 8 }}>
                Gênero Literário:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                {[
                  { id: 'suspense-psicologico', label: 'Suspense Psicológico' },
                  { id: 'misterio', label: 'Mistério & Enigma' },
                  { id: 'thriller-criminal', label: 'Thriller Criminal' },
                  { id: 'romance-dramatico', label: 'Romance Dramático' },
                  { id: 'terror', label: 'Terror Psicológico' },
                  { id: 'ficcao-cientifica', label: 'Ficção Científica' },
                  { id: 'fantasia', label: 'Fantasia Sombria' },
                  { id: 'aventura', label: 'Aventura' },
                  { id: 'drama', label: 'Drama Realista' },
                  { id: 'ficcao-historica', label: 'Ficção Histórica' }
                ].map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGenre(g.id as CinematicGenre)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: genre === g.id ? '2px solid #f59e0b' : '1px solid #334155',
                      background: genre === g.id ? 'rgba(245, 158, 11, 0.15)' : '#0f172a',
                      color: genre === g.id ? '#fef3c7' : '#cbd5e1',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* TÍTULO E SUBGÊNERO */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                  Título Provisório:
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    color: '#fff',
                    padding: '10px 14px',
                    fontSize: 14,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                  Subgênero / Nicho:
                </label>
                <input
                  type="text"
                  value={subgenre}
                  onChange={(e) => setSubgenre(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    color: '#fff',
                    padding: '10px 14px',
                    fontSize: 14,
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* PREMISSA DETALHADA */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: 6 }}>
                Premissa Central da História:
              </label>
              <textarea
                rows={4}
                value={premise}
                onChange={(e) => setPremise(e.target.value)}
                placeholder="Descreva o incidente incitante, o conflito e os segredos da trama..."
                style={{
                  width: '100%',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  color: '#fff',
                  padding: '12px 14px',
                  fontSize: 13,
                  lineHeight: 1.5,
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* CONFIGURAÇÕES ESTÉTICAS CINEMATOGRÁFICAS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                  Estilo Visual:
                </label>
                <select
                  value={visualStyle}
                  onChange={(e) => setVisualStyle(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    color: '#fff',
                    padding: '10px',
                    fontSize: 13
                  }}
                >
                  <option value="Fotografia Cinematográfica 35mm Realista">Fotografia 35mm Realista</option>
                  <option value="Noir Contemporâneo de Alto Contraste">Noir Contemporâneo</option>
                  <option value="Drama Intimista com Iluminação Suave">Drama Intimista Suave</option>
                  <option value="Thriller Realista Hiper-detalhado">Thriller Hiper-realista</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                  Tom Emocional:
                </label>
                <select
                  value={emotionalTone}
                  onChange={(e) => setEmotionalTone(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    color: '#fff',
                    padding: '10px',
                    fontSize: 13
                  }}
                >
                  <option value="Tenso, claustrofóbico e envolvente">Tenso e Claustrofóbico</option>
                  <option value="Misterioso e reflexivo">Misterioso e Reflexivo</option>
                  <option value="Melancólico e dramático">Melancólico e Dramático</option>
                  <option value="Eletrizante e urgente">Eletrizante e Urgente</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                  Tipo de Final:
                </label>
                <select
                  value={endingType}
                  onChange={(e) => setEndingType(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    color: '#fff',
                    padding: '10px',
                    fontSize: 13
                  }}
                >
                  <option value="Plot twist chocante com revelação psicológica">Plot Twist Chocante</option>
                  <option value="Redenção dramática agridoce">Redenção Agridoce</option>
                  <option value="Final aberto reflexivo">Final Aberto Reflexivo</option>
                  <option value="Revelação de conspiração implacável">Revelação Implacável</option>
                </select>
              </div>
            </div>

            {/* BOTÃO AVANÇAR */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button
                type="button"
                onClick={handleProceedToStep2}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#0f172a',
                  border: 'none',
                  borderRadius: 10,
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 16px rgba(245, 158, 11, 0.35)'
                }}
              >
                Gerar Roteiro & Story Bible com IA <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ETAPA 2: REVISAR E APROVAR ROTEIRO */}
        {/* ============================================================ */}
        {currentStep === 2 && projectData && (
          <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Etapa 2 de 5
              </span>
              <h3 style={{ margin: '4px 0 8px', fontSize: 24, fontWeight: 900, color: '#ffffff' }}>
                Roteiro & Story Bible Estruturados
              </h3>
              <p style={{ margin: 0, fontSize: 14, color: '#94a3b8' }}>
                Revise os acontecimentos planejados para os capítulos antes de definirmos as referências visuais dos personagens.
              </p>
            </div>

            {/* CARD SINOPSE E CONFLITO CENTRAL */}
            <div style={{
              background: '#0f172a',
              borderRadius: 12,
              border: '1px solid #1e293b',
              padding: 22,
              display: 'flex',
              flexDirection: 'column',
              gap: 14
            }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase' }}>
                  Sinopse Desenvolvida:
                </span>
                <p style={{ margin: '6px 0 0', fontSize: 14, color: '#f1f5f9', lineHeight: 1.6 }}>
                  {projectData.storyBible.synopsis}
                </p>
              </div>

              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase' }}>
                  Conflito Central & Desfecho:
                </span>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>
                  {projectData.storyBible.centralConflict} • <em>{projectData.storyBible.plannedResolution}</em>
                </p>
              </div>
            </div>

            {/* ESTRUTURA DOS CAPÍTULOS */}
            <div>
              <h4 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, color: '#fff' }}>
                Capítulos & Sequência de Cenas ({projectData.storyBible.chapterSummaries.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {projectData.storyBible.chapterSummaries.map((c) => (
                  <div
                    key={c.chapterNumber}
                    style={{
                      background: '#0f172a',
                      borderRadius: 10,
                      border: '1px solid #334155',
                      padding: 16
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <strong style={{ fontSize: 15, color: '#f59e0b' }}>
                        Capítulo {c.chapterNumber}: {c.title}
                      </strong>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{c.timeline}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: '#cbd5e1', lineHeight: 1.4 }}>
                      {c.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* BOTÕES DE NAVEGAÇÃO */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                style={{
                  background: 'transparent',
                  border: '1px solid #475569',
                  color: '#94a3b8',
                  padding: '10px 18px',
                  borderRadius: 8,
                  cursor: 'pointer'
                }}
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={handleProceedToStep3}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#0f172a',
                  border: 'none',
                  borderRadius: 10,
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                Aprovar Roteiro & Criar Referências Visuais <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ETAPA 3: DEFINIR OS PERSONAGENS E APROVAR FOTOS */}
        {/* ============================================================ */}
        {currentStep === 3 && projectData && (
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Etapa 3 de 5
              </span>
              <h3 style={{ margin: '4px 0 8px', fontSize: 24, fontWeight: 900, color: '#ffffff' }}>
                Character Bible: Consistência Visual dos Personagens
              </h3>
              <p style={{ margin: 0, fontSize: 14, color: '#94a3b8' }}>
                Aprove a aparência fotorrealista de cada personagem antes de iniciar a montagem das páginas.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 20 }}>
              {projectData.characters.map((char) => (
                <div
                  key={char.id}
                  style={{
                    background: '#0f172a',
                    borderRadius: 14,
                    border: char.isApproved ? '2px solid #10b981' : '1px solid #334155',
                    padding: 20,
                    display: 'flex',
                    gap: 18
                  }}
                >
                  <div style={{
                    width: 130,
                    height: 180,
                    borderRadius: 8,
                    overflow: 'hidden',
                    background: '#1e293b',
                    flexShrink: 0
                  }}>
                    {char.referenceImageUrl ? (
                      <img src={char.referenceImageUrl} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Camera size={24} color="#64748b" />
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff' }}>{char.name}</h4>
                      <span style={{ fontSize: 10, background: '#2563eb', color: '#fff', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>
                        {char.role}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.4 }}>
                      <div><strong>Idade:</strong> {char.age}</div>
                      <div><strong>Traços:</strong> {char.faceShape}, {char.eyes}</div>
                      <div><strong>Cabelo:</strong> {char.hair}</div>
                      <div><strong>Figurino:</strong> {char.costumes[0]}</div>
                    </div>

                    <div style={{ marginTop: 'auto' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleApproveCharacter(char.id)}
                        style={{
                          width: '100%',
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: char.isApproved ? 'none' : '1px solid #10b981',
                          background: char.isApproved ? '#059669' : 'transparent',
                          color: char.isApproved ? '#fff' : '#34d399',
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: 'pointer'
                        }}
                      >
                        {char.isApproved ? '✓ Aparência Aprovada' : 'Aprovar Aparência'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* BOTÕES DE NAVEGAÇÃO */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                style={{
                  background: 'transparent',
                  border: '1px solid #475569',
                  color: '#94a3b8',
                  padding: '10px 18px',
                  borderRadius: 8,
                  cursor: 'pointer'
                }}
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={handleProceedToStep4}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#0f172a',
                  border: 'none',
                  borderRadius: 10,
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                Planejar Páginas (Pipeline Individual) <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ETAPA 4: PLANEJAR PÁGINAS COM PIPELINE INDIVIDUAL */}
        {/* ============================================================ */}
        {currentStep === 4 && projectData && (
          <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Etapa 4 de 5
              </span>
              <h3 style={{ margin: '4px 0 8px', fontSize: 24, fontWeight: 900, color: '#ffffff' }}>
                Planos Individuais das Páginas Preparados
              </h3>
              <p style={{ margin: 0, fontSize: 14, color: '#94a3b8' }}>
                Cada página possui seu próprio prompt visual fotorrealista de 22 parâmetros, narração densa e diálogos atribuídos.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {projectData.pages.map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: '#0f172a',
                    borderRadius: 12,
                    border: '1px solid #334155',
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 16, color: '#38bdf8' }}>
                      Página {p.pageNumber}: {p.sceneSummary}
                    </strong>
                    <span style={{ fontSize: 11, background: '#1e293b', color: '#cbd5e1', padding: '3px 8px', borderRadius: 4 }}>
                      {p.cameraFraming}
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>
                    Prompt Visual: "{p.visualPrompt.slice(0, 160)}..."
                  </p>

                  <div style={{ background: '#090d16', padding: 12, borderRadius: 8, fontSize: 12, color: '#e2e8f0', lineHeight: 1.4 }}>
                    <strong>Narração:</strong> {p.narrationText.slice(0, 200)}...
                  </div>
                </div>
              ))}
            </div>

            {/* BOTÕES DE NAVEGAÇÃO */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                style={{
                  background: 'transparent',
                  border: '1px solid #475569',
                  color: '#94a3b8',
                  padding: '10px 18px',
                  borderRadius: 8,
                  cursor: 'pointer'
                }}
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={handleProceedToStep5}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                Gerar Fotografias & Montar o Livro <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ETAPA 5: LIVRO MONTADO COM SUCESSO! */}
        {/* ============================================================ */}
        {currentStep === 5 && projectData && (
          <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center', padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: 999,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)'
            }}>
              <Check size={36} />
            </div>

            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 900, color: '#fff' }}>
                Foto Livro Realista Montado com Sucesso!
              </h3>
              <p style={{ margin: 0, fontSize: 15, color: '#94a3b8', maxWidth: 540 }}>
                As fotografias fotorrealistas foram produzidas e os textos integrados diretamente na composição gráfica sem fundos brancos genéricos.
              </p>
            </div>

            <div style={{
              background: '#0f172a',
              borderRadius: 14,
              border: '1px solid #1e293b',
              padding: 20,
              width: '100%',
              display: 'flex',
              justifyContent: 'space-around',
              textAlign: 'center'
            }}>
              <div>
                <span style={{ fontSize: 22, fontWeight: 900, color: '#f59e0b' }}>{projectData.pages.length}</span>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Páginas Montadas</div>
              </div>
              <div>
                <span style={{ fontSize: 22, fontWeight: 900, color: '#38bdf8' }}>{projectData.characters.length}</span>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Personagens Consistentes</div>
              </div>
              <div>
                <span style={{ fontSize: 22, fontWeight: 900, color: '#10b981' }}>13/17</span>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Etapas do Checklist</div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFinishWizard}
              style={{
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '14px 32px',
                fontSize: 15,
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                boxShadow: '0 8px 20px rgba(37, 99, 235, 0.4)'
              }}
            >
              Abrir no Editor do Foto Livro Realista <ArrowRight size={18} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
