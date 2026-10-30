import React, { useState, useMemo } from 'react';
import {
  Sliders,
  BookOpen,
  Sparkles,
  Layers,
  FileText,
  Clock,
  Compass,
  CheckCircle,
  HelpCircle,
  Maximize2,
  RefreshCw,
  Bookmark,
  ChevronRight,
  ShieldCheck,
  Palette,
  Eye,
  ArrowRight,
  Save,
  PenTool,
  Search,
  Check,
  Tag,
  Target,
  Users
} from 'lucide-react';
import { chamarGeminiTexto } from '../../../services/kdp-ai-engine';
import { AmazonLiveService } from '../../../services/amazon-live-service';
import { BOOK_THEMES, getTheme, isChildrenTheme, type BookTheme } from '../../../data/book-themes';
import { BookEnginAnimatedBook } from '../../common/BookEnginAnimatedBook';
import type { CoAuthorBookType } from './CoAuthorAgentSuite';

export interface BookArchitectureData {
  titulo: string;
  subtitulo: string;
  tipoLivro: CoAuthorBookType;
  premissa: string;
  totalCapitulos: number;
  palavrasPorCapitulo: number;
  paginasEstimadas: number;
  sobrecapaTexto: string;
  sobrecapaPaleta: string;
  fraseDestaqueSobrecapa?: string;
  tema?: string;
  subtema?: string;
  faixaEtaria?: string;
  publicoAlvo?: string;
  diferencial?: string;
}

export interface BookArchitecturePanelProps {
  initialTitle?: string;
  initialSubtitle?: string;
  initialAuthor?: string;
  initialGenre?: string;
  initialBookType?: CoAuthorBookType;
  initialChaptersCount?: number;
  initialWordsPerChapter?: number;
  initialPremise?: string;
  initialSobrecapaTexto?: string;
  initialFraseDestaque?: string;
  coverDataUrl?: string | null;
  initialTheme?: string;
  initialSubtheme?: string;
  initialFaixaEtaria?: string;
  onApplyArchitecture: (data: BookArchitectureData) => void;
  onNavigateToChat?: () => void;
  isSaving?: boolean;
}

export const BookArchitecturePanel: React.FC<BookArchitecturePanelProps> = ({
  initialTitle = '',
  initialSubtitle = '',
  initialAuthor = 'Autor BookEngin',
  initialGenre = 'Geral',
  initialBookType = 'tecnico',
  initialChaptersCount = 8,
  initialWordsPerChapter = 1200,
  initialPremise = '',
  initialSobrecapaTexto = '',
  initialFraseDestaque = '',
  coverDataUrl = null,
  initialTheme = '',
  initialSubtheme = '',
  initialFaixaEtaria = '',
  onApplyArchitecture,
  onNavigateToChat,
  isSaving = false
}) => {
  // ─── Estados Principais de Configuração Prévia ───
  const [titulo, setTitulo] = useState<string>(initialTitle || 'Novo Livro Bestseller');
  const [subtitulo, setSubtitulo] = useState<string>(initialSubtitle);
  const [autor, setAutor] = useState<string>(initialAuthor);
  const [tipoLivro, setTipoLivro] = useState<CoAuthorBookType>(initialBookType);
  const [premissa, setPremissa] = useState<string>(initialPremise);

  // ─── Estados de Tema Central e Inteligência de Mercado (Prompt Master) ───
  const [temaSelecionado, setTemaSelecionado] = useState<string>(initialTheme || '');
  const [subtemaSelecionado, setSubtemaSelecionado] = useState<string>(initialSubtheme || '');
  const [usarTemaLivre, setUsarTemaLivre] = useState<boolean>(false);
  const [temaLivre, setTemaLivre] = useState<string>('');
  const [faixaEtaria, setFaixaEtaria] = useState<string>(initialFaixaEtaria || '');
  const [publicoAlvo, setPublicoAlvo] = useState<string>('');
  const [diferencial, setDiferencial] = useState<string>('');
  const [marketTrends, setMarketTrends] = useState<string[]>([]);
  const [isLoadingTrends, setIsLoadingTrends] = useState<boolean>(false);

  // Tema final e checagem de obra infantil
  const temaFinal = (usarTemaLivre && temaLivre.trim()) ? temaLivre.trim() : temaSelecionado;
  const isInfantil = isChildrenTheme(temaFinal) || (typeof initialGenre === 'string' && initialGenre.toLowerCase().includes('infantil'));

  // Quantidade de Capítulos
  const [totalCapitulos, setTotalCapitulos] = useState<number>(() => {
    return Math.max(3, Math.min(40, initialChaptersCount || 8));
  });

  // Slider Lateral Deslizante: Palavras por Capítulo
  const [palavrasPorCapitulo, setPalavrasPorCapitulo] = useState<number>(() => {
    return Math.max(500, Math.min(4000, initialWordsPerChapter || 1200));
  });

  // Sobrecapa / Contracapa
  const [sobrecapaTexto, setSobrecapaTexto] = useState<string>(
    initialSobrecapaTexto || ''
  );
  const [fraseDestaque, setFraseDestaque] = useState<string>(
    initialFraseDestaque || ''
  );
  const [sobrecapaPaleta, setSobrecapaPaleta] = useState<string>('harmonia_capa');

  // Estados de IA
  const [isSuggestingTitles, setIsSuggestingTitles] = useState<boolean>(false);
  const [titleSuggestions, setTitleSuggestions] = useState<
    Array<{ title: string; subtitle: string; rationale: string }>
  >([]);
  const [isGeneratingSobrecapa, setIsGeneratingSobrecapa] = useState<boolean>(false);
  const [previewTab, setPreviewTab] = useState<'jaqueta' | 'sobrecapa' | 'capa'>('jaqueta');

  // ─── Projeções Dinâmicas em Tempo Real ───
  const projection = useMemo(() => {
    const totalPalavras = totalCapitulos * palavrasPorCapitulo;
    // Padrão editorial KDP (6x9 pol, corpo 11pt, entrelinha 1.5 = ~250 palavras/página útil)
    // + 6 páginas pré-textuais (falsa folha de rosto, ficha catalográfica, sumário, agradecimentos)
    const paginasUteis = Math.round(totalPalavras / 250);
    const paginasEstimadas = Math.max(24, paginasUteis + 6);
    // Espessura da lombada em mm (KDP padrão papel creme 80g: págs * 0.0572 mm)
    const lombadaMm = (paginasEstimadas * 0.0572).toFixed(1);
    // Tempo estimado de leitura (média de 220 palavras/minuto)
    const minutosLeitura = Math.round(totalPalavras / 220);
    const horasLeitura = (minutosLeitura / 60).toFixed(1);

    let porteBadge = 'Bestseller Padrão KDP';
    let porteCor = '#0284c7';
    if (paginasEstimadas < 65) {
      porteBadge = 'Ensaio / Guia Ágil KDP';
      porteCor = '#10b981';
    } else if (paginasEstimadas > 190) {
      porteBadge = 'Obra Extensa / Manual Definitivo';
      porteCor = '#7c3aed';
    }

    return {
      totalPalavras,
      paginasEstimadas,
      lombadaMm,
      minutosLeitura,
      horasLeitura,
      porteBadge,
      porteCor
    };
  }, [totalCapitulos, palavrasPorCapitulo]);

  // ─── Paletas Harmônicas de Capa / Sobrecapa ───
  const paletas = {
    harmonia_capa: {
      nome: 'Sintonia Padrão KDP',
      bgSobrecapa: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
      textoCor: '#f8fafc',
      destaqueCor: '#38bdf8',
      bordaCor: '#334155'
    },
    noite_profunda: {
      nome: 'Dark Elegance (Ficção & Mistério)',
      bgSobrecapa: 'linear-gradient(145deg, #09090b 0%, #18181b 100%)',
      textoCor: '#fafafa',
      destaqueCor: '#fbbf24',
      bordaCor: '#27272a'
    },
    pergaminho_nobel: {
      nome: 'Pergaminho Editorial (Clássico)',
      bgSobrecapa: 'linear-gradient(145deg, #fefce8 0%, #fef3c7 100%)',
      textoCor: '#1c1917',
      destaqueCor: '#b45309',
      bordaCor: '#fde68a'
    },
    safira_tech: {
      nome: 'Safira Tech (Técnico / Negócios)',
      bgSobrecapa: 'linear-gradient(145deg, #082f49 0%, #0369a1 100%)',
      textoCor: '#f0f9ff',
      destaqueCor: '#38bdf8',
      bordaCor: '#0284c7'
    },
    esmeralda_ouro: {
      nome: 'Esmeralda & Ouro (Autoajuda)',
      bgSobrecapa: 'linear-gradient(145deg, #064e3b 0%, #065f46 100%)',
      textoCor: '#ecfdf5',
      destaqueCor: '#facc15',
      bordaCor: '#047857'
    }
  };

  const paletaAtiva = paletas[sobrecapaPaleta as keyof typeof paletas] || paletas.harmonia_capa;

  // ─── Consultar Tendências de Mercado na Amazon KDP ───
  const handleConsultarTendenciasTema = async () => {
    const query = (temaFinal || 'livros').slice(0, 30);
    setIsLoadingTrends(true);
    try {
      const sugs = await AmazonLiveService.getLiveSuggestions(query, 'br');
      if (sugs && sugs.length > 0) {
        setMarketTrends(sugs.slice(0, 8));
      } else {
        const found = getTheme(temaFinal);
        const fbSub = found?.subthemes || [];
        setMarketTrends(
          fbSub.length > 0
            ? fbSub.map(s => `${temaFinal}: ${s}`)
            : [
                `${temaFinal} guia prático`,
                `${temaFinal} para iniciantes`,
                `como dominar ${temaFinal}`,
                `estratégias de ${temaFinal}`
              ]
        );
      }
    } catch (e) {
      console.warn('Erro ao consultar tendências do tema:', e);
      setMarketTrends([
        `${temaFinal} essencial`,
        `passo a passo ${temaFinal}`,
        `manual definitivo ${temaFinal}`
      ]);
    } finally {
      setIsLoadingTrends(false);
    }
  };

  // ─── Gerar Sugestões de Títulos com IA Baseado no Tema Central ───
  const handleGerarTitulosIA = async () => {
    setIsSuggestingTitles(true);
    try {
      const prompt = `Você é um Consultor Editorial Sênior e Especialista em Bestsellers da Amazon KDP.
Crie 5 propostas magnéticas de TÍTULO e SUBTÍTULO para uma obra antes do início da escrita, rigorosamente alinhadas ao TEMA CENTRAL escolhido.

TEMA CENTRAL DA OBRA: ${temaFinal || 'Desenvolvimento pessoal e alta conversão'}
SUBTEMA / ESPECIALIZAÇÃO: ${subtemaSelecionado || 'Geral'}
GÊNERO / FORMATO: ${tipoLivro}
${isInfantil && faixaEtaria ? `FAIXA ETÁRIA OBRIGATÓRIA: ${faixaEtaria}` : ''}
${publicoAlvo ? `PÚBLICO-ALVO: ${publicoAlvo}` : ''}
${diferencial ? `DIFERENCIAL ÚNICO: ${diferencial}` : ''}
Premissa / Assunto: ${premissa || 'Transformação e conhecimento de alto valor'}
Meta de Porte: ${projection.paginasEstimadas} páginas em ${totalCapitulos} capítulos.

FORMATO OBRIGATÓRIO (retorne 5 opções sem introdução):
[OPCAO 1]
TITULO: ...
SUBTITULO: ...
MOTIVO: Por que fisga o leitor no algoritmo da Amazon e valoriza o tema
[/OPCAO]
[OPCAO 2]
TITULO: ...
SUBTITULO: ...
MOTIVO: ...
[/OPCAO]
[OPCAO 3]
TITULO: ...
SUBTITULO: ...
MOTIVO: ...
[/OPCAO]
[OPCAO 4]
TITULO: ...
SUBTITULO: ...
MOTIVO: ...
[/OPCAO]
[OPCAO 5]
TITULO: ...
SUBTITULO: ...
MOTIVO: ...
[/OPCAO]`;

      const res = await chamarGeminiTexto(prompt, {
        temperature: 0.85,
        maxTokens: 1100
      });
      const rawText = res.texto || '';

      const options: Array<{ title: string; subtitle: string; rationale: string }> = [];
      const blocks = rawText.split(/\[OPCAO\s*\d*\]/i).filter(Boolean);

      for (const block of blocks) {
        const cleanBlock = block.replace(/\[\/OPCAO\]/i, '').trim();
        const tMatch = cleanBlock.match(/TITULO:\s*(.+)/i);
        const sMatch = cleanBlock.match(/SUBTITULO:\s*(.+)/i);
        const mMatch = cleanBlock.match(/MOTIVO:\s*(.+)/i);
        if (tMatch && tMatch[1]) {
          options.push({
            title: tMatch[1].replace(/[*_"`]/g, '').trim(),
            subtitle: sMatch ? sMatch[1].replace(/[*_"`]/g, '').trim() : '',
            rationale: mMatch ? mMatch[1].trim() : 'Alta aderência editorial ao tema'
          });
        }
      }

      if (options.length > 0) {
        setTitleSuggestions(options);
      }
    } catch (err) {
      console.error('Erro ao gerar títulos:', err);
    } finally {
      setIsSuggestingTitles(false);
    }
  };

  // ─── Gerar Sinopse Instigante para Sobrecapa com IA ───
  const handleGerarSobrecapaIA = async () => {
    setIsGeneratingSobrecapa(true);
    try {
      const prompt = `Você é um Copywriter Editorial de Capas e Contracapas de Bestsellers KDP.
Escreva o texto completo da SOBRECAPA (Contracapa / Dust Jacket) para o livro:
Título: "${titulo}"
Subtítulo: "${subtitulo}"
Gênero: ${tipoLivro}
Capítulos: ${totalCapitulos} capítulos (~${projection.paginasEstimadas} páginas)
Premissa do Autor: ${premissa || 'Uma jornada transformadora de grande impacto'}

DIRETRIZES CRÍTICAS PARA A SOBRECAPA:
1. Deve estar em sintonia com a capa e CONSTAR UM PEDAÇO DA HISTÓRIA OU DO CONCEITO de forma magnética para INSTIGAR o leitor a comprar e abrir o livro imediatamente.
2. Não revele o final; revele a tensão, o dilema ou a promessa de transformação irresistível.
3. Comece com uma frase de impacto em maiúsculas ou citação de abertura.
4. Desenvolva 2 parágrafos envolventes resumindo o coração do livro com gancho final ("cliffhanger" ou chamado irrecusável à ação).

Retorne no formato:
FRASE_DESTAQUE: "..."
TEXTO_SOBRECAPA:
[Texto completo da sinopse da sobrecapa]`;

      const res = await chamarGeminiTexto(prompt, {
        temperature: 0.85,
        maxTokens: 1000
      });
      const rawText = res.texto || '';

      const fraseMatch = rawText.match(/FRASE_DESTAQUE:\s*["“]?([^"\n\r]+)["”]?/i);
      let corpoTexto = rawText;
      if (rawText.includes('TEXTO_SOBRECAPA:')) {
        corpoTexto = rawText.split('TEXTO_SOBRECAPA:')[1].trim();
      } else if (fraseMatch) {
        corpoTexto = rawText.replace(/FRASE_DESTAQUE:[^\n]+/, '').trim();
      }

      if (fraseMatch && fraseMatch[1]) {
        setFraseDestaque(fraseMatch[1].trim());
      }
      setSobrecapaTexto(corpoTexto.replace(/[*_]/g, '').trim());
    } catch (err) {
      console.error('Erro ao gerar sobrecapa:', err);
    } finally {
      setIsGeneratingSobrecapa(false);
    }
  };

  // ─── Salvar e Aplicar Arquitetura ───
  const handleConfirmar = () => {
    onApplyArchitecture({
      titulo: titulo.trim() || 'Novo Livro Bestseller',
      subtitulo: subtitulo.trim(),
      tipoLivro,
      premissa: premissa.trim(),
      totalCapitulos,
      palavrasPorCapitulo,
      paginasEstimadas: projection.paginasEstimadas,
      sobrecapaTexto: sobrecapaTexto.trim(),
      sobrecapaPaleta,
      fraseDestaqueSobrecapa: fraseDestaque.trim(),
      tema: temaFinal,
      subtema: subtemaSelecionado,
      faixaEtaria,
      publicoAlvo,
      diferencial
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#f8fafc',
        overflowY: 'auto'
      }}
    >
      {/* ─── BANNER DE CABEÇALHO DO PAINEL ─── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          padding: '24px 32px',
          borderBottom: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span
              style={{
                background: '#0284c7',
                color: '#ffffff',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 0.5
              }}
            >
              ETAPA PRÉVIA EDITORIAL
            </span>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>
              Planeje a arquitetura do livro antes de começar a escrever
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#f8fafc' }}>
            📐 Arquitetura da Obra, Capa & Sobrecapa
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13.5, color: '#cbd5e1' }}>
            Defina o tema central, título magnético, quantidade de capítulos e ajuste o slider lateral de densidade de palavras com projeção imediata de páginas.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onNavigateToChat && (
            <button
              type="button"
              onClick={onNavigateToChat}
              style={{
                background: '#334155',
                color: '#e2e8f0',
                border: 'none',
                padding: '9px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              💬 Ir ao Chat CoAuthor
            </button>
          )}

          <button
            type="button"
            onClick={handleConfirmar}
            disabled={isSaving}
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '10px 22px',
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 800,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
            }}
          >
            {isSaving ? <BookEnginAnimatedBook size="micro" /> : <Save size={16} />}
            <span>Salvar Arquitetura & Iniciar Livro →</span>
          </button>
        </div>
      </div>

      {/* ─── CORPO PRINCIPAL COM CONTEÚDO ESTRUTURADO ─── */}
      <div
        style={{
          maxWidth: 1320,
          width: '100%',
          margin: '0 auto',
          padding: '28px 24px 60px',
          display: 'flex',
          flexDirection: 'column',
          gap: 28
        }}
      >
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* BLOCO 1: TEMA CENTRAL DA OBRA & INTELIGÊNCIA EDITORIAL (PROMPT MASTER) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section
          style={{
            background: '#ffffff',
            borderRadius: 14,
            border: '1.5px solid #bfdbfe',
            padding: 24,
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.06)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
                }}
              >
                <Compass size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                    1. Tema Central & Nicho da Obra (Defina antes do Título)
                  </h3>
                  <span
                    style={{
                      background: '#dbeafe',
                      color: '#1e40af',
                      fontSize: 10.5,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 12,
                      letterSpacing: 0.4
                    }}
                  >
                    PASSO FUNDAMENTAL
                  </span>
                </div>
                <span style={{ fontSize: 12.5, color: '#64748b' }}>
                  O tema central orienta o enredo, o vocabulário, o nicho de mercado e as propostas de título da IA.
                </span>
              </div>
            </div>

            <div>
              {temaFinal ? (
                <span
                  style={{
                    background: '#f0fdf4',
                    color: '#15803d',
                    border: '1px solid #bbf7d0',
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 6,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                >
                  <Check size={14} color="#15803d" /> Tema Ativo: <strong>{temaFinal}</strong>
                </span>
              ) : (
                <span
                  style={{
                    background: '#fef3c7',
                    color: '#b45309',
                    border: '1px solid #fde68a',
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 6
                  }}
                >
                  ⚠️ Escolha o Tema para destravar sugestões ideais
                </span>
              )}
            </div>
          </div>

          {/* GRID: SELEÇÃO DE TEMA + SUBTEMA */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>
            {/* TEMA CENTRAL */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 800, color: '#334155' }}>
                  Tema Central do Livro:
                </label>
                <button
                  type="button"
                  onClick={() => setUsarTemaLivre(!usarTemaLivre)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0284c7',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  {usarTemaLivre ? '← Escolher do catálogo (60 temas)' : '✏️ Digitar tema livre'}
                </button>
              </div>

              {usarTemaLivre ? (
                <input
                  type="text"
                  value={temaLivre}
                  onChange={e => setTemaLivre(e.target.value)}
                  placeholder="Ex: Inteligência Artificial para Gestores de Tráfego"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 8,
                    border: '1.5px solid #0284c7',
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#f0f9ff'
                  }}
                />
              ) : (
                <select
                  value={temaSelecionado}
                  onChange={e => {
                    const val = e.target.value;
                    setTemaSelecionado(val);
                    const found = getTheme(val);
                    if (found && found.subthemes.length > 0) {
                      setSubtemaSelecionado(found.subthemes[0]);
                    } else {
                      setSubtemaSelecionado('');
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 8,
                    border: '1.5px solid #cbd5e1',
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#ffffff'
                  }}
                >
                  <option value="">-- Selecione o Tema da Obra ({BOOK_THEMES.length} opções) --</option>
                  <optgroup label="📘 Não Ficção, Guias, Negócios & Autoajuda">
                    {BOOK_THEMES.filter(t => t.kind === 'nao-ficcao').map(t => (
                      <option key={t.id} value={t.label}>{t.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="📕 Ficção, Suspense, Romance & Fantasia">
                    {BOOK_THEMES.filter(t => t.kind === 'ficcao').map(t => (
                      <option key={t.id} value={t.label}>{t.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="👶 Infantil & Histórias Ilustradas (Faixa Etária Obrigatória)">
                    {BOOK_THEMES.filter(t => t.kind === 'infantil').map(t => (
                      <option key={t.id} value={t.label}>👶 {t.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="🎨 Atividades, Colorir & Puzzles">
                    {BOOK_THEMES.filter(t => t.kind === 'atividades').map(t => (
                      <option key={t.id} value={t.label}>🎨 {t.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="✨ Outros Temas & Mistos">
                    {BOOK_THEMES.filter(t => t.kind === 'misto').map(t => (
                      <option key={t.id} value={t.label}>{t.label}</option>
                    ))}
                  </optgroup>
                </select>
              )}
            </div>

            {/* SUBTEMA DINÂMICO OU ESPECIALIZAÇÃO */}
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                Subtema / Especialização Editorial:
              </label>
              {getTheme(temaSelecionado)?.subthemes && getTheme(temaSelecionado)!.subthemes.length > 0 && !usarTemaLivre ? (
                <select
                  value={subtemaSelecionado}
                  onChange={e => setSubtemaSelecionado(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 8,
                    border: '1.5px solid #cbd5e1',
                    fontSize: 13.5,
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#ffffff'
                  }}
                >
                  <option value="">-- Todos os ângulos do tema --</option>
                  {getTheme(temaSelecionado)!.subthemes.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={subtemaSelecionado}
                  onChange={e => setSubtemaSelecionado(e.target.value)}
                  placeholder="Ex: Foco profundo, gestão do tempo ou para iniciantes"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 8,
                    border: '1.5px solid #cbd5e1',
                    fontSize: 13.5,
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              )}
            </div>
          </div>

          {/* FAIXA ETÁRIA OBRIGATÓRIA (SE FOR TEMA INFANTIL OU GÊNERO INFANTIL) */}
          {isInfantil && (
            <div
              style={{
                marginBottom: 16,
                padding: '12px 16px',
                background: '#fffbeb',
                border: '1.5px solid #fde68a',
                borderRadius: 8
              }}
            >
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 800, color: '#92400e', marginBottom: 4 }}>
                👶 Faixa Etária Obrigatória (Regra KDP Infantil):
              </label>
              <span style={{ display: 'block', fontSize: 11.5, color: '#b45309', marginBottom: 8 }}>
                A faixa etária calibra o vocabulário, tamanho das frases, narrativa e complexidade moral do texto.
              </span>
              <select
                value={faixaEtaria}
                onChange={e => setFaixaEtaria(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 6,
                  border: '1.5px solid #d97706',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#78350f',
                  background: '#ffffff'
                }}
              >
                <option value="">-- Selecione a Faixa Etária --</option>
                <option value="3-5 anos">3–5 anos (Frases ultracurtas, vocabulário concreto e sonoro)</option>
                <option value="6-8 anos">6–8 anos (Linguagem acessível, narrativa direta e ilustrações)</option>
                <option value="9-12 anos">9–12 anos (Vocabulário intermediário, desafios e mistérios)</option>
                <option value="13-15 anos">13–15 anos (Transição Young Adult, temas identitários)</option>
                <option value="16-17 anos">16–17 anos (Linguagem madura e reflexiva)</option>
              </select>
            </div>
          )}

          {/* PÚBLICO-ALVO & DIFERENCIAL */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Público-Alvo Leitor:
              </label>
              <input
                type="text"
                value={publicoAlvo}
                onChange={e => setPublicoAlvo(e.target.value)}
                placeholder="Ex: Empreendedores, concurseiros, entusiastas de mistério..."
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 7,
                  border: '1px solid #cbd5e1',
                  fontSize: 12.5,
                  color: '#334155',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Diferencial Competitivo Único:
              </label>
              <input
                type="text"
                value={diferencial}
                onChange={e => setDiferencial(e.target.value)}
                placeholder="Ex: Passo a passo descomplicado em 7 dias sem jargões"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 7,
                  border: '1px solid #cbd5e1',
                  fontSize: 12.5,
                  color: '#334155',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* CONSULTA DE TENDÊNCIAS AO VIVO DA AMAZON PARA O TEMA */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleConsultarTendenciasTema}
                disabled={isLoadingTrends}
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #0284c7',
                  color: '#0369a1',
                  padding: '8px 16px',
                  borderRadius: 7,
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: isLoadingTrends ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Search size={14} color="#0284c7" />
                <span>{isLoadingTrends ? 'Consultando tendências...' : `🔎 Tendências de "${temaFinal || 'Tema'}" na Amazon KDP`}</span>
              </button>
              <span style={{ fontSize: 11.5, color: '#64748b' }}>
                Verifica em tempo real os termos mais buscados por compradores da Amazon
              </span>
            </div>

            {/* TAGS DE TENDÊNCIAS */}
            {marketTrends.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Termos em alta:</span>
                {marketTrends.map((trend, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (!subtemaSelecionado) setSubtemaSelecionado(trend);
                      else setDiferencial(trend);
                    }}
                    title="Clique para usar como subtema/diferencial"
                    style={{
                      background: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      color: '#0369a1',
                      padding: '3px 8px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Tag size={10} color="#0284c7" /> {trend}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* BLOCO 2: IDENTIDADE DO LIVRO (TÍTULO, SUBTÍTULO & GÊNERO) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section
          style={{
            background: '#ffffff',
            borderRadius: 14,
            border: '1px solid #e2e8f0',
            padding: 24,
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: '#f0f9ff',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <BookOpen size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                  2. Título & Subtítulo Comercial da Obra
                </h3>
                <span style={{ fontSize: 12.5, color: '#64748b' }}>
                  Defina o título magnético e o gancho de promessa que posiciona seu livro no topo da Amazon KDP.
                </span>
              </div>
            </div>

            <span style={{ fontSize: 12, color: '#64748b' }}>
              Autor da Obra: <strong style={{ color: '#0f172a' }}>{autor}</strong>
            </span>
          </div>

          {/* SINALIZADOR VISUAL DO TEMA VINCULADO */}
          {temaFinal ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                padding: '8px 12px',
                borderRadius: 8,
                marginBottom: 16,
                fontSize: 12.5,
                color: '#166534'
              }}
            >
              <Compass size={15} color="#15803d" />
              <span>
                Alinhado ao Tema Central: <strong>{temaFinal}</strong>
                {subtemaSelecionado ? ` • Especialização: ${subtemaSelecionado}` : ''}
              </span>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#fffbeb',
                border: '1px solid #fde68a',
                padding: '8px 12px',
                borderRadius: 8,
                marginBottom: 16,
                fontSize: 12.5,
                color: '#92400e'
              }}
            >
              <HelpCircle size={15} color="#b45309" />
              <span>
                Dica: Selecione o <strong>Tema Central</strong> no Bloco 1 acima para que a IA crie títulos com altíssima taxa de conversão na Amazon.
              </span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 16, marginBottom: 16 }}>
            {/* TÍTULO */}
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                Título Principal da Obra:
              </label>
              <input
                type="text"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Ex: O Código da Automação com IA"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: 8,
                  border: '1.5px solid #cbd5e1',
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* SUBTÍTULO */}
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                Subtítulo (Gancho Comercial & Promessa ao Leitor):
              </label>
              <input
                type="text"
                value={subtitulo}
                onChange={e => setSubtitulo(e.target.value)}
                placeholder="Ex: Como Criar Sistemas Autônomos de Alta Conversão em 30 Dias"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: 8,
                  border: '1.5px solid #cbd5e1',
                  fontSize: 13.5,
                  color: '#334155',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* PREMISSA / HISTÓRIA CENTRAL (OPCIONAL) */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
              Premissa / Sinopse Básica da História ou Conteúdo:
            </label>
            <textarea
              value={premissa}
              onChange={e => setPremissa(e.target.value)}
              placeholder="Descreva o enredo da história ou o objetivo transformador do livro para guiar a IA..."
              rows={2}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                fontFamily: 'inherit',
                color: '#334155',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />
          </div>

          {/* BOTÕES GERADORES DE SUGESTÕES DE TÍTULOS E AMAZON */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleGerarTitulosIA}
              disabled={isSuggestingTitles}
              style={{
                background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                border: 'none',
                color: '#ffffff',
                padding: '9px 18px',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 800,
                cursor: isSuggestingTitles ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
              }}
            >
              {isSuggestingTitles ? <BookEnginAnimatedBook size="micro" /> : <Sparkles size={14} />}
              <span>{isSuggestingTitles ? 'Criando 5 Títulos Bestseller...' : '✨ Sugerir 5 Pares de Título & Subtítulo com IA'}</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                const seed = (titulo || premissa || 'autoajuda').split(/[:\-\–]/)[0].trim().slice(0, 20);
                setIsSuggestingTitles(true);
                try {
                  const sugs = await AmazonLiveService.getLiveSuggestions(seed, 'br');
                  if (sugs && sugs.length > 0) {
                    const mapped = sugs.slice(0, 5).map(s => ({
                      title: s.charAt(0).toUpperCase() + s.slice(1),
                      subtitle: `O Guia Definitivo e Prático: Como Dominar ${s}`,
                      rationale: 'Termo real pesquisado por leitores ao vivo na caixa de busca da Amazon Brasil'
                    }));
                    setTitleSuggestions(mapped);
                  }
                } catch (e) {
                  console.warn('Erro ao consultar Amazon:', e);
                } finally {
                  setIsSuggestingTitles(false);
                }
              }}
              disabled={isSuggestingTitles}
              style={{
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                color: '#334155',
                padding: '9px 16px',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: isSuggestingTitles ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 7
              }}
            >
              <Search size={14} color="#0284c7" />
              <span>🔎 Consultar Tendências da Amazon KDP</span>
            </button>
          </div>

          {/* LISTA DE SUGESTÕES GERADAS */}
          {titleSuggestions.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 800, color: '#0369a1', marginBottom: 10 }}>
                💡 Clique em qualquer sugestão abaixo para aplicar o Título e o Subtítulo automaticamente:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                {titleSuggestions.map((sug, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setTitulo(sug.title);
                      setSubtitulo(sug.subtitle);
                    }}
                    style={{
                      background: '#f8fafc',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: 10,
                      padding: 14,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#0284c7';
                      e.currentTarget.style.background = '#f0f9ff';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#0284c7', background: '#e0f2fe', padding: '2px 6px', borderRadius: 4 }}>
                        OPÇÃO #{idx + 1}
                      </span>
                      <span style={{ fontSize: 11, color: '#059669', fontWeight: 700 }}>
                        ✓ Clique p/ aplicar
                      </span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{sug.title}</div>
                    <div style={{ fontSize: 12.5, color: '#475569', marginTop: 4, lineHeight: 1.4 }}>{sug.subtitle}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 6, fontStyle: 'italic', borderTop: '1px dashed #cbd5e1', paddingTop: 4 }}>
                      {sug.rationale}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* BLOCO 3: CAPÍTULOS + SLIDER LATERAL COM PROJEÇÃO DINÂMICA KDP */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section
          style={{
            background: '#ffffff',
            borderRadius: 14,
            border: '1px solid #e2e8f0',
            padding: 24,
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#f0fdf4',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Sliders size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                3. Quantidade de Capítulos & Slider Deslizante de Palavras
              </h3>
              <span style={{ fontSize: 12.5, color: '#64748b' }}>
                Deslize o controle de palavras por capítulo para ver a projeção do livro físico e páginas KDP ao lado.
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 24, alignItems: 'stretch' }}>
            {/* COLUNA ESQUERDA: CONTROLES DE CAPÍTULOS & SLIDER DESLIZANTE */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 20
              }}
            >
              {/* ESCOLHA DE QUANTIDADE DE CAPÍTULOS */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>
                  Quantidade de Capítulos do Livro:
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {[5, 8, 10, 12, 15, 20].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setTotalCapitulos(n)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 7,
                        fontSize: 12.5,
                        fontWeight: 800,
                        cursor: 'pointer',
                        border: totalCapitulos === n ? '2px solid #0284c7' : '1px solid #cbd5e1',
                        background: totalCapitulos === n ? '#0284c7' : '#ffffff',
                        color: totalCapitulos === n ? '#ffffff' : '#334155',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {n} Caps
                    </button>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Outro:</span>
                    <input
                      type="number"
                      min={3}
                      max={40}
                      value={totalCapitulos}
                      onChange={e => setTotalCapitulos(Math.max(3, Math.min(40, Number(e.target.value) || 8)))}
                      style={{
                        width: 60,
                        padding: '5px 8px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 12.5,
                        fontWeight: 800,
                        textAlign: 'center'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* SLIDER LATERAL DESLIZANTE: PALAVRAS POR CAPÍTULO */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>
                    Palavras por Capítulo (Densidade):
                  </label>
                  <span
                    style={{
                      background: '#0284c7',
                      color: '#ffffff',
                      padding: '3px 10px',
                      borderRadius: 12,
                      fontSize: 13,
                      fontWeight: 800
                    }}
                  >
                    {palavrasPorCapitulo.toLocaleString('pt-BR')} palavras
                  </span>
                </div>

                {/* CONTROLE DESLIZANTE INTERATIVO */}
                <input
                  type="range"
                  min={500}
                  max={4000}
                  step={50}
                  value={palavrasPorCapitulo}
                  onChange={e => setPalavrasPorCapitulo(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: 8,
                    borderRadius: 5,
                    background: 'linear-gradient(to right, #0284c7, #38bdf8)',
                    cursor: 'pointer',
                    outline: 'none',
                    margin: '12px 0 6px'
                  }}
                />

                {/* RÉGUA VISUAL DO SLIDER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
                  <span>500 (Rápido)</span>
                  <span>1.200 (Bestseller KDP)</span>
                  <span>2.200 (Aprofundado)</span>
                  <span>4.000 (Extenso)</span>
                </div>
              </div>

              {/* DICA EDITORIAL DINÂMICA */}
              <div
                style={{
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 12,
                  color: '#0369a1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <Compass size={16} color="#0284c7" />
                <span>
                  Com <strong>{totalCapitulos} capítulos</strong> a <strong>{palavrasPorCapitulo} palavras</strong> cada, o livro terá um ritmo ideal para retenção e leitura no Kindle e impresso KDP.
                </span>
              </div>
            </div>

            {/* COLUNA DIREITA: CARD DE PROJEÇÃO DINÂMICA EM TEMPO REAL */}
            <div
              style={{
                background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
                color: '#ffffff',
                borderRadius: 12,
                padding: 22,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.25)',
                border: '1px solid #334155'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#38bdf8', letterSpacing: 0.6 }}>
                    PROJEÇÃO EM TEMPO REAL KDP
                  </span>
                  <span
                    style={{
                      background: projection.porteCor,
                      color: '#ffffff',
                      padding: '2px 8px',
                      borderRadius: 10,
                      fontSize: 10.5,
                      fontWeight: 800
                    }}
                  >
                    {projection.porteBadge}
                  </span>
                </div>

                {/* DESTAQUE PRINCIPAL: NÚMERO DE PÁGINAS APROXIMADAS */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 44, fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>
                    ~{projection.paginasEstimadas}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#94a3b8' }}>
                    páginas de livro impresso KDP
                  </span>
                </div>

                {/* MÉTRICAS PROJETADAS */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Total de Palavras:</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#38bdf8' }}>
                      {projection.totalPalavras.toLocaleString('pt-BR')}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Espessura da Lombada:</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#fbbf24' }}>
                      {projection.lombadaMm} mm
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Tempo de Leitura:</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#4ade80' }}>
                      ~{projection.horasLeitura}h ({projection.minutosLeitura} min)
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Formato Padrão:</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#f8fafc' }}>
                      6" × 9" (15×23 cm)
                    </div>
                  </div>
                </div>
              </div>

              {/* MOCKUP VISUAL MINI DO VOLUME FÍSICO */}
              <div
                style={{
                  marginTop: 18,
                  paddingTop: 14,
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1' }}>
                  <ShieldCheck size={16} color="#38bdf8" />
                  <span>Compatível com as regras de impressão sob demanda Amazon KDP</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* BLOCO 4: CAPA & SOBRECAPA (DUST JACKET) EM PLENA SINTONIA */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section
          style={{
            background: '#ffffff',
            borderRadius: 14,
            border: '1px solid #e2e8f0',
            padding: 24,
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Palette size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                  4. Capa & Sobrecapa em Sintonia Visual (Com Gancho Instigante)
                </h3>
                <span style={{ fontSize: 12.5, color: '#64748b' }}>
                  A sobrecapa (contracapa) deve harmonizar com a capa e contar um pedaço da história para prender a curiosidade do leitor.
                </span>
              </div>
            </div>

            {/* SELETOR DE MODO DE VISUALIZAÇÃO */}
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 3, gap: 4 }}>
              {[
                { id: 'jaqueta', label: '📖 Jaqueta Completa (Verso + Lombada + Frente)' },
                { id: 'sobrecapa', label: '📝 Editor da Sobrecapa' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPreviewTab(tab.id as any)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: 'none',
                    background: previewTab === tab.id ? '#ffffff' : 'transparent',
                    color: previewTab === tab.id ? '#0f172a' : '#64748b',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: previewTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* PALETAS DE SINTONIA CROMÁTICA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#475569' }}>
              Paleta de Sintonia da Sobrecapa:
            </span>
            {Object.entries(paletas).map(([key, item]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSobrecapaPaleta(key)}
                style={{
                  padding: '5px 11px',
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: sobrecapaPaleta === key ? '2px solid #0284c7' : '1px solid #cbd5e1',
                  background: item.bgSobrecapa,
                  color: item.textoCor,
                  transition: 'all 0.15s ease'
                }}
              >
                {item.nome}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: previewTab === 'jaqueta' ? '1fr' : '1fr 1fr', gap: 20 }}>
            {/* ─── VISUALIZAÇÃO DA JAQUETA COMPLETA (VERSO + LOMBADA + CAPA) ─── */}
            <div
              style={{
                background: '#e2e8f0',
                borderRadius: 12,
                padding: 20,
                display: 'flex',
                justifyContent: 'center',
                overflowX: 'auto'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  borderRadius: 8,
                  overflow: 'hidden',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.2)',
                  maxWidth: 960,
                  width: '100%',
                  minHeight: 400
                }}
              >
                {/* 1. PARTE ESQUERDA: SOBRECAPA (CONTRACAPA COM GANCHO) */}
                <div
                  style={{
                    flex: 1,
                    background: paletaAtiva.bgSobrecapa,
                    color: paletaAtiva.textoCor,
                    padding: '24px 22px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderRight: '1px solid rgba(0,0,0,0.2)'
                  }}
                >
                  <div>
                    {/* FRASE DE DESTAQUE / CITAÇÃO */}
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: paletaAtiva.destaqueCor,
                        textTransform: 'uppercase',
                        letterSpacing: 0.8,
                        marginBottom: 12,
                        borderBottom: `1px solid ${paletaAtiva.bordaCor}`,
                        paddingBottom: 8
                      }}
                    >
                      {fraseDestaque || '“Uma história que desafia tudo o que você achava saber.”'}
                    </div>

                    {/* CORPO DA SOBRECAPA: RESUMO + GANCHO */}
                    <div
                      style={{
                        fontSize: 12.5,
                        lineHeight: 1.6,
                        color: paletaAtiva.textoCor,
                        whiteSpace: 'pre-line',
                        opacity: 0.95
                      }}
                    >
                      {sobrecapaTexto || (
                        <span>
                          Aqui estará o pedaço da história que instiga o leitor. Use o botão <strong>"✨ Gerar Sinopse Instigante com IA"</strong> abaixo para criar um resumo arrebatador com gancho misterioso que faz qualquer leitor querer devorar o livro!
                        </span>
                      )}
                    </div>
                  </div>

                  {/* RODAPÉ DA SOBRECAPA: CRÉDITOS + CÓDIGO KDP SIMULADO */}
                  <div
                    style={{
                      marginTop: 20,
                      paddingTop: 12,
                      borderTop: `1px solid ${paletaAtiva.bordaCor}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: paletaAtiva.destaqueCor }}>
                        {autor}
                      </div>
                      <div style={{ fontSize: 10, opacity: 0.7 }}>BookEngin Bestseller KDP</div>
                    </div>

                    {/* Rodapé limpo de contracapa sem caixa branca de código de barras */}
                    <div style={{ fontSize: 9, opacity: 0.65, fontStyle: 'italic' }}>
                      Design editorial contínuo
                    </div>
                  </div>
                </div>

                {/* 2. PARTE CENTRAL: LOMBADA (SPINE) */}
                <div
                  style={{
                    width: Math.max(34, Math.min(60, Number(projection.lombadaMm) * 3.5 || 38)),
                    background: paletaAtiva.bgSobrecapa,
                    color: paletaAtiva.textoCor,
                    borderLeft: '1px solid rgba(255,255,255,0.1)',
                    borderRight: '1px solid rgba(0,0,0,0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 2px',
                    filter: 'brightness(0.92)'
                  }}
                >
                  <span style={{ fontSize: 9, fontWeight: 800, color: paletaAtiva.destaqueCor, opacity: 0.8 }}>
                    ★
                  </span>

                  {/* TÍTULO NA VERTICAL NA LOMBADA */}
                  <div
                    style={{
                      writingMode: 'vertical-rl',
                      textOrientation: 'mixed',
                      transform: 'rotate(180deg)',
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: 1,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxHeight: 280,
                      color: paletaAtiva.textoCor
                    }}
                  >
                    {titulo} — {autor}
                  </div>

                  <span style={{ fontSize: 8, color: paletaAtiva.destaqueCor, fontWeight: 700 }}>
                    {projection.lombadaMm}mm
                  </span>
                </div>

                {/* 3. PARTE DIREITA: CAPA FRONTAL */}
                <div
                  style={{
                    flex: 1,
                    position: 'relative',
                    background: coverDataUrl ? 'transparent' : paletaAtiva.bgSobrecapa,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: coverDataUrl ? 0 : 24,
                    overflow: 'hidden'
                  }}
                >
                  {coverDataUrl ? (
                    <img
                      src={coverDataUrl}
                      alt="Capa Frontal"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <>
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: paletaAtiva.destaqueCor,
                            textTransform: 'uppercase',
                            letterSpacing: 1.5,
                            marginBottom: 8
                          }}
                        >
                          {tipoLivro.toUpperCase()} • EDIÇÃO KDP
                        </div>
                        <h4
                          style={{
                            margin: '0 0 8px',
                            fontSize: 22,
                            fontWeight: 900,
                            lineHeight: 1.2,
                            color: paletaAtiva.textoCor
                          }}
                        >
                          {titulo}
                        </h4>
                        {subtitulo && (
                          <div style={{ fontSize: 13, color: paletaAtiva.destaqueCor, lineHeight: 1.4 }}>
                            {subtitulo}
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          paddingTop: 14,
                          borderTop: `1px solid ${paletaAtiva.bordaCor}`,
                          fontSize: 13,
                          fontWeight: 800,
                          color: paletaAtiva.textoCor
                        }}
                      >
                        {autor}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ─── PAINEL DE EDIÇÃO DIRETA DO TEXTO DA SOBRECAPA ─── */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 12,
                padding: 18
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>
                  Texto da Sobrecapa (Resumo & Gancho Instigante):
                </label>
                <button
                  type="button"
                  onClick={handleGerarSobrecapaIA}
                  disabled={isGeneratingSobrecapa}
                  style={{
                    background: '#fef3c7',
                    border: '1px solid #fde68a',
                    color: '#b45309',
                    padding: '6px 12px',
                    borderRadius: 7,
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: isGeneratingSobrecapa ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {isGeneratingSobrecapa ? <BookEnginAnimatedBook size="micro" /> : <Sparkles size={13} />}
                  <span>{isGeneratingSobrecapa ? 'Criando Sinopse...' : '✨ Gerar Sinopse Instigante (IA)'}</span>
                </button>
              </div>

              {/* FRASE DE IMPACTO */}
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  Frase de Impacto da Sobrecapa (Topo da Contracapa):
                </label>
                <input
                  type="text"
                  value={fraseDestaque}
                  onChange={e => setFraseDestaque(e.target.value)}
                  placeholder="Ex: “Um assassinato sem rastros. Uma IA que prevê cada movimento.”"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 7,
                    border: '1px solid #cbd5e1',
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: '#0f172a',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* ÁREA DE TEXTO DA SOBRECAPA */}
              <textarea
                value={sobrecapaTexto}
                onChange={e => setSobrecapaTexto(e.target.value)}
                placeholder="Escreva ou gere com a IA o texto que conta um pedaço da história para instigar o leitor..."
                rows={7}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: '1.5px solid #cbd5e1',
                  fontSize: 13,
                  lineHeight: 1.5,
                  fontFamily: 'inherit',
                  color: '#334155',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />

              <div style={{ fontSize: 11.5, color: '#64748b' }}>
                💡 <strong>Dica Editorial:</strong> A sobrecapa nunca deve dar spoiler de resoluções. Ela deve contextualizar a dor ou a intriga e deixar o leitor com uma pergunta urgente na mente.
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* BOTÃO DE CONFIRMAÇÃO & TRANSIÇÃO FINAL */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: '18px 24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
              Pronto para iniciar a produção com o CoAuthor?
            </div>
            <div style={{ fontSize: 12.5, color: '#64748b' }}>
              Ao confirmar, os parâmetros de {totalCapitulos} capítulos (~{projection.paginasEstimadas} páginas) e sobrecapa serão gravados na obra.
            </div>
          </div>

          <button
            type="button"
            onClick={handleConfirmar}
            disabled={isSaving}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '12px 28px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 800,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
            }}
          >
            {isSaving ? <BookEnginAnimatedBook size="micro" /> : <PenTool size={16} />}
            <span>🚀 Confirmar Arquitetura & Iniciar Redação do Livro</span>
          </button>
        </div>
      </div>
    </div>
  );
};
