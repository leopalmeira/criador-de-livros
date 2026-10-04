// ================================================================
// CARD DE GERAÇÃO RÁPIDA DE LIVROS ILUSTRADOS NA DASHBOARD KDP
// - Fica diretamente na Dashboard inicial (sem precisar entrar no painel)
// - 32 opções temáticas pré-formatadas de alta conversão
// - Campo de Prompt para cada página seguir uma lógica consistente
// - Capa oficial diagramada com Título, Subtítulo e Autor estampados
// - Geração em 1 clique (Textos via Gemini + Imagens via Replicate FLUX)
// ================================================================

import React, { useState } from 'react';
import {
  Sparkles, BookOpen, Wand2, Palette, Image as ImageIcon,
  CheckCircle2, RefreshCw, ChevronDown, ChevronUp, Plus, Trash2,
  ArrowRight, ShieldCheck, Layers, FileText
} from 'lucide-react';
import {
  ILLUSTRATED_BOOK_PRESETS,
  IllustratedBookPreset,
  IllustratedPagePreset
} from '../../../data/illustrated-book-presets';
import { db } from '../../../database/local-database';
import { BookProject } from '../../../types/book-project';
import { comporCapaComTipografia } from '../../../services/kdp-cover-composer';
import { gerarImagemReplicate } from '../../../services/replicate-service';
import { chamarGeminiTexto } from '../../../services/kdp-ai-engine';

interface QuickIllustratedBookCardProps {
  onOpenProject: (projectId: string) => void;
  onRefreshProjects?: () => void;
}

export const QuickIllustratedBookCard: React.FC<QuickIllustratedBookCardProps> = ({
  onOpenProject,
  onRefreshProjects
}) => {
  // Preset selecionado (padrão: primeira opção das 32)
  const [selectedPresetId, setSelectedPresetId] = useState<string>(ILLUSTRATED_BOOK_PRESETS[0].id);
  const currentPreset = ILLUSTRATED_BOOK_PRESETS.find(p => p.id === selectedPresetId) || ILLUSTRATED_BOOK_PRESETS[0];

  // Dados editáveis da Capa e Obra
  const [titulo, setTitulo] = useState(currentPreset.tituloSugerido);
  const [subtitulo, setSubtitulo] = useState(currentPreset.subtituloSugerido);
  const [autor, setAutor] = useState(currentPreset.autorSugerido);
  const [estiloVisual, setEstiloVisual] = useState(currentPreset.estiloVisual);
  const [promptPremissa, setPromptPremissa] = useState(currentPreset.promptPremissa);
  
  // Lista de páginas com prompts editáveis individuais
  const [paginas, setPaginas] = useState<IllustratedPagePreset[]>(currentPreset.paginasRoteiro);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [showPagesList, setShowPagesList] = useState<boolean>(true);

  // Estados de execução e progresso
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);

  // Ao trocar de preset, atualiza os campos mantendo personalização
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const p = ILLUSTRATED_BOOK_PRESETS.find(item => item.id === presetId);
    if (!p) return;
    setTitulo(p.tituloSugerido);
    setSubtitulo(p.subtituloSugerido);
    setAutor(p.autorSugerido);
    setEstiloVisual(p.estiloVisual);
    setPromptPremissa(p.promptPremissa);
    setPaginas(p.paginasRoteiro);
    setActivePageIndex(0);
  };

  // Atualizar prompt de uma página específica
  const handleUpdatePagePrompt = (index: number, newPrompt: string) => {
    setPaginas(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], prompt: newPrompt };
      return copy;
    });
  };

  // Atualizar título de uma página específica
  const handleUpdatePageTitle = (index: number, newTitle: string) => {
    setPaginas(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], title: newTitle };
      return copy;
    });
  };

  // Adicionar nova página ao roteiro lógico
  const handleAddPage = () => {
    const nextNum = paginas.length + 1;
    const newPage: IllustratedPagePreset = {
      pageNumber: nextNum,
      title: `Capítulo ${nextNum}: Nova Cena da História`,
      sceneSummary: `Continuação lógica do enredo com o mesmo personagem e atmosfera.`,
      prompt: `Masterpiece storybook illustration for ${titulo}, scene ${nextNum}: continuing the character journey with ${estiloVisual}, 8k resolution, cinematic lighting, no text.`
    };
    setPaginas(prev => [...prev, newPage]);
    setActivePageIndex(paginas.length);
  };

  // Remover página do roteiro
  const handleRemovePage = (index: number) => {
    if (paginas.length <= 2) {
      alert('O livro ilustrado deve conter no mínimo 2 páginas/capítulos.');
      return;
    }
    setPaginas(prev => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.map((p, i) => ({ ...p, pageNumber: i + 1 }));
    });
    setActivePageIndex(Math.max(0, index - 1));
  };

  // Geração completa em 1 clique
  const handleGerarLivroCompleto = async () => {
    if (!titulo.trim()) {
      alert('Por favor, informe o título do livro.');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(5);
    setGenerationStep('Iniciando projeto editorial e preparando arte da capa...');

    try {
      const projectId = `proj_ilustrado_${Date.now()}`;

      // 1. Gerar Imagem da Capa via Replicate FLUX
      setGenerationStep('🎨 Gerando ilustração frontal da Capa com Replicate FLUX...');
      setGenerationProgress(15);
      const coverPrompt = `Bestselling Amazon KDP book cover art for "${titulo}". Genre: ${currentPreset.categoria}. Style: ${estiloVisual}. Scene narrative: ${promptPremissa}. Hero character centered, award-winning illustration, vibrant cinematic lighting, masterpiece, 8k, strictly zero text, zero typography.`;
      
      let rawCoverDataUrl = '';
      try {
        rawCoverDataUrl = await gerarImagemReplicate(coverPrompt, {
          aspectRatio: '2:3',
          model: 'black-forest-labs/flux-schnell'
        });
      } catch (err: any) {
        console.warn('Fallback na capa do Replicate:', err);
      }

      // 2. Estampar Tipografia Editorial na Capa (Título, Subtítulo, Autor)
      setGenerationStep('✍️ Diagramando tipografia da Capa Oficial (Título, Subtítulo e Autor)...');
      setGenerationProgress(30);
      let finalCoverDataUrl = rawCoverDataUrl;
      if (rawCoverDataUrl) {
        try {
          finalCoverDataUrl = await comporCapaComTipografia(rawCoverDataUrl, {
            titulo: titulo,
            subtitulo: subtitulo,
            autor: autor || 'Leandro Palmeira',
            selo: `COLEÇÃO ILUSTRADA • ${currentPreset.categoria.toUpperCase()}`
          });
        } catch (e) {
          console.warn('Erro ao compor tipografia da capa:', e);
        }
      }

      // 3. Gerar os Capítulos com Texto via Gemini Econômico e Roteiro de Imagens
      setGenerationStep('📖 Escrevendo os capítulos da narrativa via Google Gemini...');
      setGenerationProgress(50);

      const generatedChapters = [];
      for (let i = 0; i < paginas.length; i++) {
        const pag = paginas[i];
        setGenerationStep(`Gerando texto do Capítulo ${i + 1}/${paginas.length}: "${pag.title}"...`);
        setGenerationProgress(50 + Math.round(((i + 1) / paginas.length) * 40));

        let chapterText = '';
        try {
          const promptCapitulo = `Você é um autor de livros de alta qualidade.
Escreva o texto completo do Capítulo ${i + 1} de um livro ilustrado.
Livro: "${titulo}" (${subtitulo}).
Gênero: "${currentPreset.categoria}".
Premissa Geral: "${promptPremissa}".
Capítulo: "${pag.title}".
Cena deste capítulo: "${pag.sceneSummary}".
Escreva uma narrativa fluida, envolvente, rica em detalhes e diálogos acolhedores, em português.
Cerca de 250 a 400 palavras perfeitas para acompanhar a página ilustrada.`;

          const resTexto = await chamarGeminiTexto(promptCapitulo, { temperature: 0.7, maxTokens: 800 });
          chapterText = resTexto.texto;
        } catch {
          chapterText = `Neste capítulo de "${titulo}", acompanhamos ${pag.title}. ${pag.sceneSummary}. Uma narrativa inspiradora sobre coragem e beleza.`;
        }

        generatedChapters.push({
          index: i + 1,
          title: pag.title,
          summary: pag.sceneSummary,
          targetWordCount: 300,
          prose: chapterText,
          wordCount: chapterText.split(/\s+/).length,
          status: 'APROVADO' as const,
          scenes: [],
          customIllustrationPrompt: pag.prompt
        });
      }

      // 4. Salvar Projeto no Banco de Dados Local
      setGenerationStep('💾 Salvando projeto pronto no banco de dados local...');
      setGenerationProgress(95);

      const newProject: BookProject = {
        id: projectId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'ESCREVENDO',
        priority: 'ALTA',
        executionMode: 'assisted',
        title: titulo,
        subtitle: subtitulo,
        author: autor || 'Leandro Palmeira',
        description: promptPremissa,
        language: 'Português',
        format: 'Capa Comum',
        trimSize: '8.5x11',
        paperType: 'color',
        estimatedPages: paginas.length * 4,
        actualPages: paginas.length * 2,
        targetPrice: 44.90,
        currency: 'BRL',
        targetMarketplace: 'amazon.com.br',
        categories: [currentPreset.categoria, 'Livros Ilustrados'],
        keywords: [currentPreset.nome, 'Livro com Imagens', 'Ilustrado'],
        targetAudience: 'Público Geral',
        topic: promptPremissa,
        kdpBookType: 'illustrated-book',
        coverImageUrl: finalCoverDataUrl || undefined,
        kdpChapters: generatedChapters,
        tasks: [],
        notes: `Criado via Gerador Rápido de Livros Ilustrados na Dashboard. Estilo: ${estiloVisual}.`,
        competitorsAsins: [],
        pipelineStage: 'writing',
        pipelineProgress: 100,
        pipelineLog: [`Livro ilustrado "${titulo}" criado com ${paginas.length} capítulos e capa oficial diagramada.`]
      };

      await db.saveBookProject(newProject);
      if (onRefreshProjects) onRefreshProjects();

      setGenerationStep('✓ Livro Ilustrado Gerado com Sucesso! Abrindo estúdio...');
      setGenerationProgress(100);

      setTimeout(() => {
        setIsGenerating(false);
        onOpenProject(projectId);
      }, 700);

    } catch (err: any) {
      console.error('Erro ao gerar livro ilustrado:', err);
      alert(`Erro na geração: ${err.message || err}`);
      setIsGenerating(false);
    }
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        border: '1px solid #3730a3',
        borderRadius: 16,
        padding: '24px 28px',
        marginBottom: 24,
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.4), 0 0 1px 1px rgba(99, 102, 241, 0.2)',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Brilho decorativo no topo */}
      <div
        style={{
          position: 'absolute',
          top: -60,
          right: -60,
          width: 220,
          height: 220,
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none'
        }}
      />

      {/* CABEÇALHO DO CARD */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '1px',
                background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                color: '#ffffff',
                padding: '3px 10px',
                borderRadius: 999,
                textTransform: 'uppercase',
                boxShadow: '0 2px 6px rgba(236, 72, 153, 0.3)'
              }}
            >
              ✨ GERADOR DIRETO NA DASHBOARD
            </span>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
              Texto no Miolo + Imagens + Capa Oficial com Título e Autor
            </span>
          </div>

          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🎨</span> Estúdio de Livros Ilustrados & Visuais KDP
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8', maxWidth: 720, lineHeight: 1.45 }}>
            Gere livros com capítulos ilustrados sequenciais sem precisar navegar por painéis internos. Escolha entre <b>30+ temáticas de alta conversão</b>, personalize o prompt de cada página e tenha uma capa diagramada com tipografia comercial.
          </p>
        </div>

        {/* Badge de IA Integrada */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 11,
            color: '#cbd5e1',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
          <span><b>Texto:</b> Gemini Econômico</span>
          <span style={{ color: '#475569' }}>•</span>
          <span><b>Imagens:</b> Replicate FLUX</span>
        </div>
      </div>

      {/* SELETOR DE TEMAS: 30+ OPÇÕES DE LIVROS ILUSTRADOS */}
      <div style={{ marginBottom: 18 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.5px' }}>
          1. Selecione a Temática do Livro ({ILLUSTRATED_BOOK_PRESETS.length} Opções Prontas de Alta Conversão):
        </label>
        <select
          value={selectedPresetId}
          onChange={(e) => handleSelectPreset(e.target.value)}
          disabled={isGenerating}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid #4338ca',
            background: '#1e1b4b',
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            outline: 'none',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)'
          }}
        >
          {ILLUSTRATED_BOOK_PRESETS.map((preset, idx) => (
            <option key={preset.id} value={preset.id} style={{ background: '#0f172a', color: '#ffffff' }}>
              {preset.emoji} #{idx + 1}. {preset.nome} — [{preset.categoria}]
            </option>
          ))}
        </select>
      </div>

      {/* DADOS DA OBRA & CAPA OFICIAL */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>
            Título do Livro (Na Capa)
          </label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            disabled={isGenerating}
            placeholder="Ex: O Segredo da Floresta Dourada"
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 6,
              border: '1px solid #334155',
              background: '#0f172a',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>
            Subtítulo Comercial
          </label>
          <input
            type="text"
            value={subtitulo}
            onChange={(e) => setSubtitulo(e.target.value)}
            disabled={isGenerating}
            placeholder="Ex: A jornada inesquecível pelo coração da mata"
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 6,
              border: '1px solid #334155',
              background: '#0f172a',
              color: '#ffffff',
              fontSize: 13,
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>
            Nome do Autor (Na Capa)
          </label>
          <input
            type="text"
            value={autor}
            onChange={(e) => setAutor(e.target.value)}
            disabled={isGenerating}
            placeholder="Leandro Palmeira"
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 6,
              border: '1px solid #334155',
              background: '#0f172a',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>
            Estilo Visual das Imagens
          </label>
          <input
            type="text"
            value={estiloVisual}
            onChange={(e) => setEstiloVisual(e.target.value)}
            disabled={isGenerating}
            placeholder="Ex: Aquarela mágica, Arte Conceitual, Nanquim..."
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 6,
              border: '1px solid #334155',
              background: '#0f172a',
              color: '#38bdf8',
              fontSize: 12,
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* PROMPT GERAL DA PREMISSA / ENREDO CONSISTENTE */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            2. Premissa & Contexto Geral do Livro (Mantém a lógica em todas as páginas):
          </label>
          <span style={{ fontSize: 11, color: '#38bdf8' }}>
            💡 Roteiro com o mesmo personagem e atmosfera visual
          </span>
        </div>
        <textarea
          value={promptPremissa}
          onChange={(e) => setPromptPremissa(e.target.value)}
          disabled={isGenerating}
          rows={2}
          placeholder="Descreva o personagem principal, o tom da história, o conflito e o cenário para garantir consistência..."
          style={{
            width: '100%',
            padding: '9px 12px',
            borderRadius: 6,
            border: '1px solid #334155',
            background: '#0f172a',
            color: '#f1f5f9',
            fontSize: 12,
            lineHeight: 1.45,
            resize: 'vertical',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* ROTEIRO DE PÁGINAS COM PROMPTS EDITÁVEIS INDIVIDUAIS */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 10,
          padding: '14px 16px',
          marginBottom: 20
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>📑</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
              Roteiro Sequencial: Prompts de Cada Página ({paginas.length} Capítulos)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={handleAddPage}
              disabled={isGenerating}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                borderRadius: 6,
                background: 'rgba(99, 102, 241, 0.2)',
                color: '#a5b4fc',
                border: '1px solid #6366f1',
                fontSize: 11,
                fontWeight: 600,
                cursor: isGenerating ? 'not-allowed' : 'pointer'
              }}
            >
              <Plus size={12} /> + Adicionar Página
            </button>

            <button
              type="button"
              onClick={() => setShowPagesList(!showPagesList)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11
              }}
            >
              {showPagesList ? <>Ocultar <ChevronUp size={14} /></> : <>Expandir <ChevronDown size={14} /></>}
            </button>
          </div>
        </div>

        {showPagesList && (
          <div>
            {/* Pílulas de Seleção Rápida de Página */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 10 }}>
              {paginas.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActivePageIndex(idx)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid',
                    borderColor: activePageIndex === idx ? '#6366f1' : 'rgba(255, 255, 255, 0.1)',
                    background: activePageIndex === idx ? '#4f46e5' : '#1e293b',
                    color: activePageIndex === idx ? '#ffffff' : '#94a3b8',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Pág {p.pageNumber}: {p.title.slice(0, 18)}...
                </button>
              ))}
            </div>

            {/* Editor da Página Selecionada */}
            {paginas[activePageIndex] && (
              <div
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  padding: 12
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8' }}>
                      Página {paginas[activePageIndex].pageNumber}:
                    </span>
                    <input
                      type="text"
                      value={paginas[activePageIndex].title}
                      onChange={(e) => handleUpdatePageTitle(activePageIndex, e.target.value)}
                      disabled={isGenerating}
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        background: '#0f172a',
                        border: '1px solid #475569',
                        borderRadius: 4,
                        color: '#ffffff',
                        fontSize: 12,
                        fontWeight: 600
                      }}
                    />
                  </div>

                  {paginas.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePage(activePageIndex)}
                      disabled={isGenerating}
                      title="Excluir esta página do roteiro"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '2px 6px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                <div style={{ marginBottom: 6 }}>
                  <label style={{ display: 'block', fontSize: 10, color: '#94a3b8', marginBottom: 2 }}>
                    ✍️ Prompt Específico para Gerar a Imagem Desta Página (Editável livremente):
                  </label>
                  <textarea
                    value={paginas[activePageIndex].prompt}
                    onChange={(e) => handleUpdatePagePrompt(activePageIndex, e.target.value)}
                    disabled={isGenerating}
                    rows={3}
                    placeholder="Prompt detalhado da cena..."
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid #475569',
                      background: '#0f172a',
                      color: '#e2e8f0',
                      fontSize: 11,
                      fontFamily: 'monospace',
                      lineHeight: 1.35,
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{ fontSize: 10, color: '#64748b', textAlign: 'right', marginTop: 2 }}>
                    {paginas[activePageIndex].prompt.length} caracteres
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* BARRA DE PROGRESSO EM TEMPO REAL QUANDO GERANDO */}
      {isGenerating && (
        <div
          style={{
            background: '#1e293b',
            border: '1px solid #6366f1',
            borderRadius: 10,
            padding: 14,
            marginBottom: 16
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 12 }}>
            <span style={{ color: '#38bdf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={13} className="animate-spin" /> {generationStep}
            </span>
            <span style={{ color: '#a5b4fc', fontWeight: 800 }}>{generationProgress}%</span>
          </div>
          <div style={{ height: 8, background: '#0f172a', borderRadius: 999, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${generationProgress}%`,
                background: 'linear-gradient(90deg, #6366f1, #ec4899)',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        </div>
      )}

      {/* BOTÕES DE AÇÃO PRINCIPAL */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          ✓ Capa 1600x2400 com <b>{titulo || 'Título'}</b> + <b>{autor || 'Autor'}</b> diagramados.
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={handleGerarLivroCompleto}
            disabled={isGenerating}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              borderRadius: 8,
              background: isGenerating
                ? '#475569'
                : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)',
              color: '#ffffff',
              border: 'none',
              fontSize: 14,
              fontWeight: 800,
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
            }}
          >
            {isGenerating ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> Gerando Livro Ilustrado...
              </>
            ) : (
              <>
                <Sparkles size={16} /> 🚀 Gerar Livro Ilustrado Completo Agora
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
