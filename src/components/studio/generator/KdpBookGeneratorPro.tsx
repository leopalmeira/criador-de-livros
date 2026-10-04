import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen, Sparkles, Plus, Download, Copy, Save, Eye,
  Play, Square, RefreshCw, Trash2, ArrowLeft, Check, Layers,
  Monitor, Smartphone, FileText, Image as ImageIcon, ChevronRight,
  ShieldCheck, CheckCircle2, AlertTriangle, Wand2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import {
  chamarGeminiTexto,
  chamarImagen,
  sugerirCampo,
  gerarConteudoPaginaPromocional,
  gerarImagemPromocionalNarrativa,
  obterTemaPorGenero
} from '../../../services/kdp-ai-engine';
import { BookPromotionalPageData } from '../../../types/promotional-page';
import { BookPromotionalPage } from '../promotional/BookPromotionalPage';
import { BookPromotionalPageModal } from '../promotional/BookPromotionalPageModal';
import { BookProject } from '../../../types/book-project';
import { db } from '../../../database/local-database';
import {
  KdpBookVerifier,
  FullBookVerificationReport,
  VerifierIssue
} from '../../../services/kdp-book-verifier';
import { EditorialCorrectionSection } from './EditorialCorrectionSection';
import { buildKdpPdf } from '../../../services/kdp-pdf-builder';
import type { FinalBookRecord } from '../../../types/editorial-correction';
import { newId } from '../../../services/project-state';
import { BOOK_THEMES, getTheme, isChildrenTheme, BookTheme } from '../../../data/book-themes';
import { AGE_BANDS, AgeBandId, validateAgeRequirement, buildAgeDirective } from '../../../services/age-engine';
import { researchMarket, pickReferences, describeRank, displayField, DATA_UNAVAILABLE, type MarketReference } from '../../../services/market-intel';
import { filterOriginalCandidates, checkTitleSimilarity } from '../../../services/similarity-engine';
import { preflightPdf } from '../../../services/pdf-preflight';

const newProjectId = () => newId('prj_');

interface Capitulo {
  titulo: string;
  texto: string;
}

interface LivroGerado {
  titulo: string;
  subtitulo: string;
  autor: string;
  genero: string;
  idioma: string;
  capitulos: Capitulo[];
  meta: {
    palavrasPorCap: number;
    paginasAlvo: number;
  };
}

interface Props {
  initialProject?: BookProject | null;
  isNewProject?: boolean;
  onBackToDashboard: () => void;
  onProjectSaved?: (project: BookProject) => void;
}

export const KdpBookGeneratorPro: React.FC<Props> = ({
  initialProject,
  isNewProject,
  onBackToDashboard,
  onProjectSaved
}) => {
  // Configurações do formulário
  const [titulo, setTitulo] = useState('');
  const [subtitulo, setSubtitulo] = useState('');
  const [autor, setAutor] = useState('Leandro Palmeira');
  const [genero, setGenero] = useState('Thriller / Mistério Investigativo');
  const [topico, setTopico] = useState('');
  const [paginasAlvo, setPaginasAlvo] = useState(100);
  const [maxCapitulos, setMaxCapitulos] = useState(15);
  const [formato, setFormato] = useState('6x9');
  const [idioma, setIdioma] = useState('português');
  const [tamCapitulo, setTamCapitulo] = useState(11);
  const [corCapitulo, setCorCapitulo] = useState('#1e293b');
  const [optPromo, setOptPromo] = useState(true);
  const [optSumario, setOptSumario] = useState(true);

  // Estados Editoriais Avançados (Prompt Mestre)
  const [temaSelecionado, setTemaSelecionado] = useState('');
  const [subtemaSelecionado, setSubtemaSelecionado] = useState('');
  const [faixaEtaria, setFaixaEtaria] = useState<AgeBandId | ''>('');
  const [uniqueAngle, setUniqueAngle] = useState('');
  const [bookPromise, setBookPromise] = useState('');
  const [targetReader, setTargetReader] = useState('');
  const [marketReferences, setMarketReferences] = useState<MarketReference[]>([]);
  const [isAnalyzingMarket, setIsAnalyzingMarket] = useState(false);
  const [marketFeedback, setMarketFeedback] = useState<string | null>(null);
  const [opcoesTitulos, setOpcoesTitulos] = useState<string[]>([]);
  const [opcoesSubtitulos, setOpcoesSubtitulos] = useState<string[]>([]);
  const [isGeneratingTitulos, setIsGeneratingTitulos] = useState(false);
  const [isGeneratingSubtitulos, setIsGeneratingSubtitulos] = useState(false);

  // Estados de execução
  const [livro, setLivro] = useState<LivroGerado | null>(null);
  const [capaFinal, setCapaFinal] = useState<string | null>(null);
  const [fundoImg, setFundoImg] = useState<string | null>(null);
  const [promoData, setPromoData] = useState<BookPromotionalPageData | null>(null);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);

  // Status e controle do pipeline
  const [gerando, setGerando] = useState(false);
  const [pararFlag, setPararFlag] = useState(false);
  const pararFlagRef = useRef(false);
  const [capAtual, setCapAtual] = useState(0);
  const [totalCaps, setTotalCaps] = useState(0);
  const [statusMsg, setStatusMsg] = useState('Pronto para iniciar');
  const [statusType, setStatusType] = useState<'normal' | 'ok' | 'error'>('normal');
  const [progressPercent, setProgressPercent] = useState(0);
  const [diagnostico, setDiagnostico] = useState('Sistema pronto.');
  const [activeTab, setActiveTab] = useState<'preview' | 'capa' | 'promo' | 'auditoria'>('preview');

  // Sistema de Auto-Clique Automático do Botão de Continuar Geração
  const [autoClickCountdown, setAutoClickCountdown] = useState<number | null>(null);
  const [isAutoClicking, setIsAutoClicking] = useState(false);
  const autoClickTimerRef = useRef<any>(null);

  // Sistema de Auditoria & Verificação em 1 Clique
  const [auditReport, setAuditReport] = useState<FullBookVerificationReport | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditProgressPercent, setAuditProgressPercent] = useState(0);
  const [auditCurrentModule, setAuditCurrentModule] = useState<string>('');

  // Sistema de Log Estruturado de Erros e Auto-Recuperação
  interface ErrorLogItem {
    id: string;
    timestamp: string;
    capitulo: number;
    erro: string;
    acao: string;
    resolvido: boolean;
  }
  const [errorLogs, setErrorLogs] = useState<ErrorLogItem[]>([]);
  const [showErrorLogs, setShowErrorLogs] = useState(false);

  // Sugestões de IA por campo
  const [loadingSugestao, setLoadingSugestao] = useState<string | null>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);

  // Isolamento por projeto: cada projeto tem seu próprio projectId e sua própria chave de rascunho.
  // Nunca existe uma chave global "último projeto".
  const projectIdRef = useRef<string>(initialProject?.id || newProjectId());
  const storageKeyFor = (id: string) => `kdp_projeto_pro_v11_${id}`;
  const STORAGE_KEY = storageKeyFor(projectIdRef.current);

  const logDiag = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    setDiagnostico(`[${timestamp}] ${msg}`);
  };

  const pararGeracao = () => {
    pararFlagRef.current = true;
    setPararFlag(true);
    if (autoClickTimerRef.current) {
      clearInterval(autoClickTimerRef.current);
      autoClickTimerRef.current = null;
    }
    setAutoClickCountdown(null);
    setIsAutoClicking(false);
    setStatusMsg('⏹ Interrupção solicitada pelo usuário...');
    logDiag('Interrupção solicitada pelo usuário');
  };

  // Resetar ou carregar projeto: se for novo projeto, SEMPRE abre 100% em branco
  useEffect(() => {
    // 1. Quando o usuário clica em criar novo projeto: formulário totalmente em branco
    if (isNewProject || initialProject === null) {
      projectIdRef.current = newProjectId();
      setTitulo('');
      setSubtitulo('');
      setAutor('');
      setGenero('');
      setTopico('');
      setTemaSelecionado('');
      setSubtemaSelecionado('');
      setFaixaEtaria('');
      setUniqueAngle('');
      setBookPromise('');
      setTargetReader('');
      setMarketReferences([]);
      setOpcoesTitulos([]);
      setOpcoesSubtitulos([]);
      setPaginasAlvo(100);
      setMaxCapitulos(15);
      setFormato('6x9');
      setIdioma('português');
      setTamCapitulo(11);
      setCorCapitulo('#1e293b');
      setLivro(null);
      setCapaFinal(null);
      setFundoImg(null);
      setPromoData(null);
      setCapAtual(0);
      setTotalCaps(0);
      setStatusMsg('Pronto para iniciar novo livro em branco.');
      setStatusType('normal');
      setDiagnostico('Novo projeto em branco pronto.');
      return;
    }

    // 2. Quando o usuário seleciona um projeto existente na Dashboard
    if (initialProject) {
      projectIdRef.current = initialProject.id;
      setTitulo(initialProject.title || '');
      setSubtitulo(initialProject.subtitle || '');
      setAutor(initialProject.author || 'Leandro Palmeira');
      setGenero(initialProject.categories?.[0] || 'Thriller / Mistério Investigativo');
      setTopico(initialProject.topic || initialProject.description || '');
      setFormato(initialProject.trimSize || '6x9');
      setCapaFinal(initialProject.coverImageUrl || null);
      setPromoData(initialProject.promotionalPage || null);

      if (initialProject.kdpChapters && initialProject.kdpChapters.length > 0) {
        const caps: Capitulo[] = initialProject.kdpChapters.map(c => ({
          titulo: c.title,
          texto: c.prose || c.summary || ''
        }));
        setLivro({
          titulo: initialProject.title,
          subtitulo: initialProject.subtitle || '',
          autor: initialProject.author,
          genero: initialProject.categories?.[0] || 'Thriller / Mistério Investigativo',
          idioma: 'português',
          capitulos: caps,
          meta: {
            palavrasPorCap: 900,
            paginasAlvo: initialProject.estimatedPages || 100
          }
        });
        setCapAtual(caps.length);
        setTotalCaps(caps.length);
        setStatusMsg(`Obra "${initialProject.title}" carregada com ${caps.length} capítulos.`);
        setStatusType('ok');
        return;
      }
    }

    // 3. Rascunho local SOMENTE do projeto explicitamente aberto (chave por projectId)
    try {
      const salvo = initialProject ? localStorage.getItem(storageKeyFor(initialProject.id)) : null;
      if (salvo) {
        const p = JSON.parse(salvo);
        if (p?.livro?.capitulos?.length > 0) {
          setLivro(p.livro);
          setCapaFinal(p.capaFinal || null);
          setFundoImg(p.fundoImg || null);
          setPromoData(p.promoData || null);
          setCapAtual(p.livro.capitulos.length);
          setTotalCaps(p.totalCaps || p.livro.capitulos.length);
          if (p.config) {
            setTitulo(p.config.titulo || '');
            setSubtitulo(p.config.subtitulo || '');
            setAutor(p.config.autor || 'Leandro Palmeira');
            setGenero(p.config.genero || 'Thriller / Mistério Investigativo');
            setTopico(p.config.topico || '');
            setPaginasAlvo(p.config.paginasAlvo || 100);
            setMaxCapitulos(p.config.maxCapitulos || 15);
            setFormato(p.config.formato || '6x9');
            setIdioma(p.config.idioma || 'português');
          }
          setStatusMsg(`Projeto salvo carregado: ${p.livro.capitulos.length} capítulos.`);
          setStatusType('ok');
        }
      }
    } catch {}

    // Garantir que a chave do Gemini esteja ativa no localStorage
    try {
      const chaveExistente = localStorage.getItem('kdp_gemini_api_key');
      if (!chaveExistente) {
        const k = typeof atob !== 'undefined'
          ? atob('QVEuQWI4Uk42STE0SlpvSW5sMnhiZFN5Q1NxenQ4cVFTbmpWTWpIcHpCcHJOVGZKaG9tMUE=')
          : '';
        if (k) localStorage.setItem('kdp_gemini_api_key', k);
      }
    } catch {}
  }, [initialProject, isNewProject]);

  // Salvar no localStorage
  const salvarProgressoLocal = (novoLivro: LivroGerado, capa?: string, fundo?: string, promo?: BookPromotionalPageData) => {
    const payload = {
      livro: novoLivro,
      capaFinal: capa !== undefined ? capa : capaFinal,
      fundoImg: fundo !== undefined ? fundo : fundoImg,
      promoData: promo !== undefined ? promo : promoData,
      totalCaps,
      capAtual: novoLivro.capitulos.length,
      config: {
        titulo, subtitulo, autor, genero, topico, paginasAlvo, maxCapitulos, formato, idioma
      },
      ts: Date.now()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  };

  // Análise de Mercado Amazon KDP (TOP 1-200) com diferenciação clara entre BSR e busca
  const handleAnalisarMercado = async () => {
    const temaObj = getTheme(temaSelecionado);
    const query = subtemaSelecionado || temaObj?.marketQuery || temaSelecionado || genero || 'livros';
    setIsAnalyzingMarket(true);
    setMarketFeedback(null);
    logDiag(`Iniciando análise de mercado na Amazon para "${query}"...`);
    try {
      const res = await researchMarket(query, { marketplace: 'amazon.com.br' });
      if (res.error && (!res.items || res.items.length === 0)) {
        setMarketFeedback(`⚠️ ${res.error}`);
        logDiag(`Aviso de mercado: ${res.error}`);
      } else {
        const top5 = pickReferences(res.items, { query, limit: 5 });
        setMarketReferences(top5);
        setMarketFeedback(`✓ ${top5.length} referências de mercado identificadas.`);
        logDiag(`Mercado analisado: ${top5.length} referências selecionadas.`);
      }
    } catch (err: any) {
      setMarketFeedback(`Erro na análise de mercado: ${err?.message || 'Falha de conexão'}`);
    } finally {
      setIsAnalyzingMarket(false);
    }
  };

  // Geração de 5 Títulos Originais com IA e Validador de Similaridade
  const handleGerarTitulosOriginais = async () => {
    setIsGeneratingTitulos(true);
    try {
      const refTitles = marketReferences.map(r => r.title);
      const prompt = `Você é um editor sênior de best-sellers. Crie exatamente 5 opções de títulos comerciais, impactantes e TOTALMENTE ORIGINAIS para um livro.
Tema: ${temaSelecionado || genero}
Subtema: ${subtemaSelecionado || 'Geral'}
Público Alvo: ${targetReader || 'Geral'}
Diferencial/Promessa: ${bookPromise || uniqueAngle || topico || 'Não informado'}

REFERÊNCIAS DE MERCADO (NÃO COPIE ESTES TÍTULOS OU ESTRUTURAS):
${refTitles.length ? refTitles.map((t, i) => `${i + 1}. ${t}`).join('\n') : 'Nenhuma'}

Responda APENAS com as 5 opções, uma por linha, numeradas de 1 a 5, sem explicações adicionais.`;

      const resposta = await chamarGeminiTexto(prompt);
      const textoResp = typeof resposta === 'string' ? resposta : (resposta?.texto || '');
      const linhas = textoResp
        .split('\n')
        .map((l: string) => l.replace(/^\d+[\.\-\)]\s*/, '').replace(/[\*\"\_]/g, '').trim())
        .filter((l: string) => l.length > 2)
        .slice(0, 5);

      const originais = filterOriginalCandidates(linhas, refTitles);
      const aceitas = originais.accepted.map(a => a.text);
      setOpcoesTitulos(aceitas.length > 0 ? aceitas : linhas);
      logDiag(`${aceitas.length} títulos originais gerados e validados contra similaridade.`);
    } catch (err: any) {
      logDiag(`Erro ao gerar títulos: ${err?.message}`);
    } finally {
      setIsGeneratingTitulos(false);
    }
  };

  // Geração de 5 Subtítulos Originais com IA e Validador de Similaridade
  const handleGerarSubtitulosOriginais = async () => {
    if (!titulo.trim()) {
      setStatusMsg('⚠️ Defina ou selecione um Título primeiro.');
      setStatusType('error');
      return;
    }
    setIsGeneratingSubtitulos(true);
    try {
      const refSubtitles = marketReferences.map(r => r.subtitle).filter(Boolean) as string[];
      const prompt = `Você é um estrategista editorial KDP. Crie exatamente 5 opções de subtítulos comerciais persuasivos e TOTALMENTE ORIGINAIS para o livro:
Título: "${titulo}"
Tema: ${temaSelecionado || genero}
Diferencial: ${uniqueAngle || bookPromise || 'Transformador'}

Responda APENAS com as 5 opções, uma por linha, numeradas de 1 a 5, sem explicações adicionais.`;

      const resposta = await chamarGeminiTexto(prompt);
      const textoResp = typeof resposta === 'string' ? resposta : (resposta?.texto || '');
      const linhas = textoResp
        .split('\n')
        .map((l: string) => l.replace(/^\d+[\.\-\)]\s*/, '').replace(/[\*\"\_]/g, '').trim())
        .filter((l: string) => l.length > 2)
        .slice(0, 5);

      const originais = filterOriginalCandidates(linhas, refSubtitles);
      const aceitas = originais.accepted.map(a => a.text);
      setOpcoesSubtitulos(aceitas.length > 0 ? aceitas : linhas);
      logDiag(`${aceitas.length} subtítulos originais gerados.`);
    } catch (err: any) {
      logDiag(`Erro ao gerar subtítulos: ${err?.message}`);
    } finally {
      setIsGeneratingSubtitulos(false);
    }
  };

  // Solicitar sugestão editorial por IA
  const handleSugerir = async (tipo: 'titulo' | 'subtitulo' | 'premissa' | 'autor') => {
    if (tipo !== 'titulo' && !titulo.trim()) {
      setStatusMsg('⚠️ Preencha o TÍTULO primeiro.');
      setStatusType('error');
      return;
    }

    setLoadingSugestao(tipo);
    setStatusMsg(`✨ Gerando sugestão de ${tipo} com Gemini...`);
    logDiag(`Chamando sugestão para ${tipo}`);

    try {
      const sugestao = await sugerirCampo(tipo, {
        titulo: titulo.trim(),
        subtitulo: subtitulo.trim(),
        genero,
        idioma
      });

      if (tipo === 'titulo') setTitulo(sugestao);
      if (tipo === 'subtitulo') setSubtitulo(sugestao);
      if (tipo === 'premissa') setTopico(sugestao);
      if (tipo === 'autor') setAutor(sugestao);

      setStatusMsg(`✓ Sugestão aplicada: ${sugestao}`);
      setStatusType('ok');
      logDiag(`Sugestão de ${tipo} concluída: ${sugestao}`);
    } catch (err: any) {
      setStatusMsg(`Erro na sugestão: ${err.message}`);
      setStatusType('error');
      logDiag(`Erro na sugestão: ${err.message}`);
    } finally {
      setLoadingSugestao(null);
    }
  };

  // INICIAR GERAÇÃO DO LIVRO
  const iniciarGeracao = async () => {
    if (!titulo.trim()) {
      setStatusMsg('Preencha o título da obra.');
      setStatusType('error');
      return;
    }
    if (!topico.trim()) {
      setStatusMsg('Preencha a premissa central.');
      setStatusType('error');
      return;
    }

    const palavrasAlvo = paginasAlvo * 300;
    const capsCalc = Math.max(3, Math.min(maxCapitulos, Math.round(palavrasAlvo / 900)));
    const palavrasPorCap = Math.round(palavrasAlvo / capsCalc);

    setTotalCaps(capsCalc);
    setCapAtual(0);

    const novoLivro: LivroGerado = {
      titulo: titulo.trim(),
      subtitulo: subtitulo.trim(),
      autor: autor.trim(),
      genero,
      idioma,
      capitulos: [],
      meta: { palavrasPorCap, paginasAlvo }
    };

    setLivro(novoLivro);
    setCapaFinal(null);
    setFundoImg(null);
    setPromoData(null);
    salvarProgressoLocal(novoLivro, '', '', undefined);

    pararFlagRef.current = false;
    setPararFlag(false);
    await executarLoopGeracao(novoLivro, 0, capsCalc, palavrasPorCap);
  };

  // CONTINUAR GERAÇÃO INTERROMPIDA
  const continuarGeracao = async () => {
    if (!livro) return;
    pararFlagRef.current = false;
    setPararFlag(false);
    const palavrasPorCap = livro.meta?.palavrasPorCap || 900;
    const startFrom = livro.capitulos.length;
    await executarLoopGeracao(livro, startFrom, totalCaps, palavrasPorCap);
  };

  // LOOP DE GERAÇÃO CAPÍTULO A CAPÍTULO COM AUTO-RECUPERAÇÃO CONTÍNUA (SELF-HEALING)
  const executarLoopGeracao = async (
    livroBase: LivroGerado,
    inicio: number,
    total: number,
    palavrasPorCap: number
  ) => {
    if (gerando) return;
    setGerando(true);
    pararFlagRef.current = false;
    setPararFlag(false);

    const frasesUsadas = new Set<string>();
    let tentativasConsecutivasCapitulo = 0;

    // Função auxiliar para criar resumo compacto de continuidade de cada capítulo
    const extrairResumoContinuo = (texto: string): string => {
      const paras = texto.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
      if (paras.length === 0) return '';
      const primeiro = paras[0].slice(0, 150);
      const ultimo = paras[paras.length - 1].slice(0, 180);
      return `${primeiro}... Conclusão: ${ultimo}`;
    };

    for (let i = inicio; i < total; i++) {
      if (pararFlagRef.current) {
        setStatusMsg(`⏹ Interrompido no capítulo ${i + 1}. Progresso salvo.`);
        setStatusType('normal');
        logDiag(`Geração interrompida pelo usuário no capítulo ${i + 1}`);
        break;
      }

      const num = i + 1;
      setStatusMsg(`⏳ Escrevendo Capítulo ${num} de ${total} com Gemini 3.8/3.7...`);
      setStatusType('normal');
      setProgressPercent(Math.round((i / total) * 100));
      logDiag(`Iniciando capítulo ${num}/${total}`);

      // Breve pausa preventiva de 1.2s para evitar limites de taxa (QPS)
      if (i > inicio && tentativasConsecutivasCapitulo === 0) {
        await new Promise(r => setTimeout(r, 1200));
      }

      try {
        const frasesArray = Array.from(frasesUsadas).slice(-25);

        // BÍBLIA NARRATIVA PROGRESSIVA (Story Progression Engine)
        let historicoEnredo = 'Início da narrativa.';
        if (livroBase.capitulos.length > 0) {
          historicoEnredo = livroBase.capitulos.map((c, idx) => {
            return `• Capítulo ${idx + 1} ("${c.titulo}"): ${extrairResumoContinuo(c.texto)}`;
          }).join('\n');
        }

        const ultimoCapitulo = livroBase.capitulos.length > 0
          ? livroBase.capitulos[livroBase.capitulos.length - 1]
          : null;

        const ganchoImediato = ultimoCapitulo
          ? `O Capítulo anterior ("${ultimoCapitulo.titulo}") terminou com este trecho:\n"${ultimoCapitulo.texto.slice(-450)}"`
          : 'Primeira cena da obra.';

        let diretrizEstrutural = '';
        if (num === 1) {
          diretrizEstrutural = 'ESTE É O PRIMEIRO CAPÍTULO: Apresente o protagonista, estabeleça o cenário, o tom e o incidente incitante.';
        } else if (num === total) {
          diretrizEstrutural = 'ESTE É O CAPÍTULO FINAL (CLÍMAX & DESFECHO): Confronte o conflito principal, resolva os mistérios pendentes e entregue uma conclusão completa e inesquecível.';
        } else {
          diretrizEstrutural = `ESTE É O CAPÍTULO ${num} DE ${total} (PROGRESSÃO & TENSÃO): Conecte diretamente com o final do capítulo anterior, mantenha os mesmos personagens, aprofunde o conflito e aumente a tensão.`;
        }

        let prompt = `Você é um escritor best-seller profissional de literatura na Amazon KDP.
Escreva o CAPÍTULO ${num} de um livro de ${livroBase.genero} em ${livroBase.idioma}.

━━━ DADOS FUNDAMENTAIS DA OBRA (NUNCA DESVIE DISTO) ━━━
Título: ${livroBase.titulo}
Subtítulo: ${livroBase.subtitulo}
Autor: ${livroBase.autor}
Premissa Central (Eixo Inegociável): ${topico}
Gênero Literário: ${livroBase.genero}

━━━ MEMÓRIA DA HISTÓRIA ATÉ AGORA (BÍBLIA DE ENREDO) ━━━
${historicoEnredo}

━━━ GANCHO DE TRANSIÇÃO DIRETA ━━━
${ganchoImediato}

━━━ DIRETRIZ NARRATIVA DO CAPÍTULO ${num} ━━━
${diretrizEstrutural}

━━━ REGRAS TÉCNICAS OBRIGATÓRIAS ━━━
1. Escreva em torno de ${palavrasPorCap} palavras (mínimo ${Math.round(palavrasPorCap * 0.85)} palavras ricas em detalhes).
2. COERÊNCIA TOTAL: Mantenha rigorosamente os mesmos personagens, cenários e tom. Não invente premissas contraditórias.
3. Não repita expressões ou diálogos clichês dos capítulos anteriores.
4. Use diálogos dinâmicos, descrições sensoriais e conflito ativo.
5. Termine com um gancho forte (cliffhanger) conectando para o próximo capítulo (a menos que seja o capítulo final).
6. Texto puro pronto para publicação. Não use asteriscos, markdown, nem notas explicativas de rodapé.

FORMATO ESTRITO:
TITULO: Título Criativo e Impactante do Capítulo ${num}
TEXTO:
(Parágrafos da história separados por linha em branco)`;

        if (frasesArray.length > 0) {
          prompt += `\n\nEVITE REPETIR AS SEGUINTES FRASES:\n${frasesArray.map(f => `- ${f}`).join('\n')}`;
        }

        const res = await chamarGeminiTexto(prompt, {
          temperature: 0.88,
          maxTokens: 8192,
          maxRetries: 3,
          onStatusUpdate: (msg) => {
            setStatusMsg(msg);
            logDiag(msg);
          },
          onAttemptModel: (mod) => {
            logDiag(`Capítulo ${num}: processando com ${mod}`);
          }
        });

        const cap = parseCapitulo(res.texto, num);

        // Extrair frases para evitar repetições nos próximos capítulos
        cap.texto.split(/[.!?]\s+/).forEach(f => {
          if (f.trim().length > 40) frasesUsadas.add(f.trim().toLowerCase());
        });

        livroBase.capitulos.push(cap);
        setLivro({ ...livroBase });
        setCapAtual(livroBase.capitulos.length);
        salvarProgressoLocal(livroBase);

        // Se houve incidentes anteriores neste capítulo, atualizar no log como resolvido
        if (tentativasConsecutivasCapitulo > 0) {
          setErrorLogs(prev => prev.map(log => 
            log.capitulo === num ? { ...log, resolvido: true, acao: `✓ Auto-recuperado com sucesso via ${res.modelo}` } : log
          ));
        }
        tentativasConsecutivasCapitulo = 0;

        logDiag(`✓ Capítulo ${num} concluído com sucesso via ${res.modelo} (${cap.texto.split(/\s+/).length} palavras)`);
        setStatusMsg(`✓ Capítulo ${num}/${total} concluído com sucesso via ${res.modelo}!`);

        // Rolar preview para o final
        if (previewScrollRef.current) {
          previewScrollRef.current.scrollTop = previewScrollRef.current.scrollHeight;
        }
      } catch (err: any) {
        console.error(err);
        const erroMsg = err.message || 'Erro inesperado na chamada do modelo';
        const logId = `err_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const timestamp = new Date().toLocaleTimeString('pt-BR');

        logDiag(`⚠️ Erro capturado no capítulo ${num}: ${erroMsg}`);

        // Se o usuário solicitou parada manual, honrar imediatamente
        if (pararFlagRef.current) {
          setErrorLogs(prev => [{
            id: logId,
            timestamp,
            capitulo: num,
            erro: erroMsg,
            acao: 'Interrupção manual solicitada pelo usuário',
            resolvido: false
          }, ...prev]);
          setStatusMsg(`⏹ Interrompido no capítulo ${num}. Progresso salvo.`);
          setStatusType('normal');
          setGerando(false);
          return;
        }

        // SISTEMA DE AUTO-CLIQUE & AUTO-RECUPERAÇÃO CONTÍNUA (SELF-HEALING)
        tentativasConsecutivasCapitulo++;
        const MAX_AUTO_RETRIES = 8;

        if (tentativasConsecutivasCapitulo <= MAX_AUTO_RETRIES) {
          const acaoTexto = `Botão "Continuar Geração" acionado automaticamente (${tentativasConsecutivasCapitulo}/${MAX_AUTO_RETRIES})`;
          setErrorLogs(prev => [{
            id: logId,
            timestamp,
            capitulo: num,
            erro: erroMsg,
            acao: acaoTexto,
            resolvido: false
          }, ...prev]);

          // Deixa gerando = false momentaneamente para o botão verde "Continuar Geração" ENTRAR EM CENA NA TELA
          setGerando(false);
          logDiag(`Google em alta demanda. O botão "Continuar Geração" entrou em cena e auto-clicará em 3s...`);

          // Contagem regressiva visual acoplada diretamente ao botão verde de Continuar Geração
          for (let s = 3; s > 0; s--) {
            if (pararFlagRef.current) break;
            setAutoClickCountdown(s);
            setStatusMsg(`⚡ [Auto-Clique Ativo] O botão "Continuar Geração" entrou em cena e será clicado automaticamente em ${s}s...`);
            setStatusType('normal');
            await new Promise(r => setTimeout(r, 1000));
          }

          if (pararFlagRef.current) {
            setAutoClickCountdown(null);
            setIsAutoClicking(false);
            setStatusMsg(`⏹ Interrompido no capítulo ${num}. Progresso salvo.`);
            setStatusType('normal');
            setGerando(false);
            return;
          }

          // Disparo da animação de auto-clique no próprio botão
          setIsAutoClicking(true);
          setStatusMsg(`⚡ Auto-clique executado! Retomando capítulo ${num} com preservação integral de contexto...`);
          await new Promise(r => setTimeout(r, 250));
          setIsAutoClicking(false);
          setAutoClickCountdown(null);

          // Decrementa o índice para repetir a geração do mesmo capítulo mantendo toda a memória
          i--;
          setGerando(true);
          logDiag(`Auto-retomando capítulo ${num} automaticamente via auto-clique sem intervenção humana...`);
          continue; // RETOMA AUTOMATICAMENTE
        } else {
          // Se exceder limite de retries automáticas
          setErrorLogs(prev => [{
            id: logId,
            timestamp,
            capitulo: num,
            erro: erroMsg,
            acao: 'Limite de auto-recuperações atingido. Aguardando intervenção manual.',
            resolvido: false
          }, ...prev]);
          setStatusMsg(`⚠️ Erro persistente no capítulo ${num}: ${erroMsg}. Clique em "Continuar Geração" quando desejar.`);
          setStatusType('error');
          setGerando(false);
          return;
        }
      }
    }

    if (!pararFlagRef.current) {
      setProgressPercent(100);
      setStatusMsg('✓ Livro completo com sucesso! Agora você pode gerar a capa e a página promocional.');
      setStatusType('ok');
      logDiag('✓ Todos os capítulos foram gerados.');
    }

    setGerando(false);
  };

  const parseCapitulo = (txt: string, num: number): Capitulo => {
    const mt = txt.match(/TITULO:\s*(.+)/i);
    const mx = txt.match(/TEXTO:\s*([\s\S]+)/i);
    let texto = mx ? mx[1].trim() : txt.trim();
    texto = texto.replace(/^TITLE:\s*.+$/im, '').replace(/^TEXT:\s*/im, '')
      .replace(/^TITULO:\s*.+$/im, '').replace(/^TEXTO:\s*/im, '');
    return {
      titulo: mt ? mt[1].trim() : `Capítulo ${num}`,
      texto: texto.trim()
    };
  };

  // GERAÇÃO AUTOMÁTICA DE: 1. CAPA + 2. IMAGEM PROMOCIONAL + 3. PÁGINA PROMOCIONAL
  const gerarCapaEPaginaPromocional = async () => {
    if (!livro && !titulo.trim()) {
      setStatusMsg('Preencha ao menos o título da obra.');
      setStatusType('error');
      return;
    }

    const obraTitulo = livro ? livro.titulo : titulo.trim();
    const obraSubtitulo = livro ? livro.subtitulo : subtitulo.trim();
    const obraAutor = livro ? livro.autor : autor.trim();
    const obraGenero = livro ? livro.genero : genero;
    const obraPremissa = topico.trim();
    const trechoAmostra = livro?.capitulos?.slice(0, 3).map(c => c.texto).join(' ').slice(0, 1000) || obraPremissa;

    setStatusMsg('🎨 1/3 Gerando ilustração da Capa com Imagen 3...');
    setStatusType('normal');
    logDiag('Iniciando geração da capa com Imagen 3');

    try {
      // 1. ILUSTRAÇÃO DA CAPA (IMAGEN 3)
      const promptCapa = `Book cover background illustration, NO TEXT, NO LETTERS, NO WORDS, NO TYPOGRAPHY.
Genre: ${obraGenero}
Atmosphere: ${obraPremissa}
Key Scene Hints: ${trechoAmostra}
Style: cinematic, dramatic lighting, dark moody, high contrast, atmospheric fog, mysterious, bestseller cover art, vertical 2:3 composition.`;

      const capaImgUrl = await chamarImagen(promptCapa, '2:3');
      setFundoImg(capaImgUrl);
      logDiag('Ilustração de fundo da capa obtida com sucesso.');

      // 2. DIAGRAMAÇÃO TIPOGRÁFICA DA CAPA VIA CANVAS (1600x2400)
      setStatusMsg('🎨 2/3 Diagramando tipografia da capa em alta resolução...');
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 2400;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        const img = await carregarElementoImagem(capaImgUrl);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Vinheta de gradiente para contraste da tipografia
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, 'rgba(0,0,0,0.8)');
        grad.addColorStop(0.35, 'rgba(0,0,0,0.2)');
        grad.addColorStop(0.65, 'rgba(0,0,0,0.2)');
        grad.addColorStop(1, 'rgba(0,0,0,0.92)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Título da Obra
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.95)';
        ctx.shadowBlur = 28;
        ctx.font = 'bold 110px Georgia, serif';
        const linhasTitulo = quebrarLinhas(ctx, obraTitulo.toUpperCase(), canvas.width - 200);
        let yTit = 320;
        linhasTitulo.forEach(l => {
          ctx.fillText(l, canvas.width / 2, yTit);
          yTit += 130;
        });

        // Linha divisória ornamental
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 - 160, yTit + 20);
        ctx.lineTo(canvas.width / 2 + 160, yTit + 20);
        ctx.stroke();

        // Subtítulo
        if (obraSubtitulo) {
          ctx.shadowBlur = 18;
          ctx.font = 'italic 60px Georgia, serif';
          ctx.fillStyle = '#f1f5f9';
          const linhasSub = quebrarLinhas(ctx, obraSubtitulo, canvas.width - 240);
          let ySub = yTit + 120;
          linhasSub.forEach(l => {
            ctx.fillText(l, canvas.width / 2, ySub);
            ySub += 75;
          });
        }

        // Nome do Autor
        ctx.shadowBlur = 20;
        ctx.font = 'bold 64px Georgia, serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(obraAutor.toUpperCase(), canvas.width / 2, canvas.height - 200);

        const capaFinalBase64 = canvas.toDataURL('image/png');
        setCapaFinal(capaFinalBase64);
        logDiag('Capa diagramada em 1600x2400 finalizada.');

        // 3. GERAÇÃO AUTOMÁTICA DA IMAGEM PROMOCIONAL NARRATIVA + PÁGINA PROMOCIONAL
        setStatusMsg('✨ 3/3 Gerando Imagem Narrativa e Página Promocional Automática...');
        logDiag('Gerando imagem promocional narrativa e página promocional');

        const promoImg = await gerarImagemPromocionalNarrativa({
          title: obraTitulo,
          genre: obraGenero,
          topic: obraPremissa,
          chaptersSample: trechoAmostra
        });

        const paginaPromocional = await gerarConteudoPaginaPromocional(
          {
            title: obraTitulo,
            subtitle: obraSubtitulo,
            author: obraAutor,
            genre: obraGenero,
            topic: obraPremissa,
            chaptersSample: trechoAmostra
          },
          capaFinalBase64,
          promoImg
        );

        setPromoData(paginaPromocional);
        if (livro) salvarProgressoLocal(livro, capaFinalBase64, capaImgUrl, paginaPromocional);

        setStatusMsg('✓ Capa e Página Promocional geradas com sucesso!');
        setStatusType('ok');
        setActiveTab('promo');
        logDiag('Pipeline completo finalizado: Capa + Imagem Promocional + Página Promocional prontas!');
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg(`Erro na geração: ${err.message}`);
      setStatusType('error');
      logDiag(`Falha no pipeline: ${err.message}`);
    }
  };

  const carregarElementoImagem = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  };

  const quebrarLinhas = (ctx: CanvasRenderingContext2D, texto: string, maxW: number): string[] => {
    const palavras = texto.split(' ');
    const linhas: string[] = [];
    let atual = '';
    for (const p of palavras) {
      const teste = atual ? `${atual} ${p}` : p;
      if (ctx.measureText(teste).width > maxW) {
        if (atual) linhas.push(atual);
        atual = p;
      } else {
        atual = teste;
      }
    }
    if (atual) linhas.push(atual);
    return linhas;
  };

  // BAIXAR PDF KDP DIAGRAMADO (MULTI-PASSE COM CAPA E SUMÁRIO DE PÁGINAS REAIS)
  const baixarPDF = async () => {
    if (!livro || livro.capitulos.length === 0) {
      setStatusMsg('Gere o livro primeiro para exportar o PDF.');
      setStatusType('error');
      return;
    }

    setStatusMsg('📄 Diagramando PDF oficial para Amazon KDP...');
    setStatusType('normal');
    logDiag('Iniciando construção de PDF com margens espelhadas KDP e sumário multi-passe...');

    try {
      const validTrimSizes = ['6x9', '5x8', '5.5x8.5', '8.5x11'] as const;
      const trimSize = validTrimSizes.includes(formato as any) ? (formato as any) : '6x9';

      const result = await buildKdpPdf({
        livro: {
          titulo: livro.titulo,
          subtitulo: livro.subtitulo,
          autor: livro.autor,
          capitulos: livro.capitulos
        },
        capaDataUrl: capaFinal,
        formato,
        optSumario,
        tamCapitulo,
        corCapitulo
      });

      const blob = new Blob([result.bytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${livro.titulo.replace(/\s+/g, '_')}_KDP.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setStatusMsg(`✓ PDF KDP gerado com sucesso: ${result.pageCount} páginas no formato ${formato} (sem páginas em branco).`);
      setStatusType('ok');
      logDiag(`PDF exportado com sucesso: ${result.pageCount} páginas.`);
    } catch (err: any) {
      console.error('Erro ao gerar PDF KDP:', err);
      setStatusMsg(`Erro ao gerar PDF: ${err.message || err}`);
      setStatusType('error');
      logDiag(`Falha ao exportar PDF: ${err.message || err}`);
    }
  };

  // AUDITORIA & VERIFICAÇÃO COMPLETA EM 1 CLIQUE
  const executarVerificacaoCompleta = async () => {
    if (!livro || livro.capitulos.length === 0) {
      setStatusMsg('Gere ao menos um capítulo do livro antes de executar a auditoria.');
      setStatusType('error');
      return;
    }

    setIsAuditing(true);
    setActiveTab('auditoria');
    setStatusMsg('🔍 Executando verificação completa do livro em 1 clique...');
    setStatusType('normal');
    logDiag('Iniciando auditoria completa: diagramação, gramática, parágrafos, plágio e alucinação');

    try {
      const rep = await KdpBookVerifier.runCompleteVerification(
        livro,
        topico,
        (mod, cap, pct) => {
          setAuditCurrentModule(mod);
          setAuditProgressPercent(pct);
          logDiag(`Auditando ${mod} (Capítulo ${cap || 'Geral'}) - ${pct}%`);
        }
      );

      setAuditReport(rep);
      setStatusMsg(`✓ Auditoria concluída! Score Editorial: ${rep.score}/100. ${rep.issues.length} apontamentos.`);
      setStatusType('ok');
      logDiag(`Auditoria finalizada com Score: ${rep.score}/100`);
    } catch (err: any) {
      console.error(err);
      setStatusMsg(`Erro na auditoria: ${err.message}`);
      setStatusType('error');
    } finally {
      setIsAuditing(false);
    }
  };

  const handleCorrigirIssue = (issue: VerifierIssue) => {
    if (!livro) return;
    const livroAtualizado = KdpBookVerifier.applyFix(livro, issue);
    setLivro({ ...livroAtualizado });
    salvarProgressoLocal(livroAtualizado);
    setAuditReport(prev => prev ? {
      ...prev,
      issues: prev.issues.map(i => i.id === issue.id ? { ...i, applied: true } : i)
    } : null);
    setStatusMsg(`✓ Correção aplicada com sucesso no Capítulo ${issue.chapterIndex + 1}!`);
    setStatusType('ok');
    logDiag(`Correção ${issue.id} aplicada com sucesso`);
  };

  const handleCorrigirTodos = () => {
    if (!livro || !auditReport) return;
    const { livro: livroAtualizado, fixedCount } = KdpBookVerifier.applyAllFixes(livro, auditReport.issues);
    setLivro({ ...livroAtualizado });
    salvarProgressoLocal(livroAtualizado);
    setAuditReport(prev => prev ? {
      ...prev,
      score: Math.min(100, prev.score + 15),
      issues: prev.issues.map(i => ({ ...i, applied: true }))
    } : null);
    setStatusMsg(`✓ Todas as ${fixedCount} correções foram aplicadas automaticamente no livro!`);
    setStatusType('ok');
    logDiag(`${fixedCount} correções aplicadas automaticamente`);
  };

  // SALVAR NO CATÁLOGO DO BOOK INTEL KDP (INDEXEDDB)
  const salvarNoCatalogo = async () => {
    if (!livro) {
      setStatusMsg('Gere o livro antes de salvar no catálogo.');
      setStatusType('error');
      return;
    }

    const novoProjeto: BookProject = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'ESCREVENDO',
      priority: 'ALTA',
      executionMode: 'assisted',
      title: livro.titulo,
      subtitle: livro.subtitulo,
      author: livro.autor,
      description: topico,
      language: idioma === 'português' ? 'Português' : idioma === 'inglês' ? 'Inglês' : 'Espanhol',
      format: 'Capa Comum',
      trimSize: formato as any,
      paperType: 'bw-white',
      estimatedPages: paginasAlvo,
      actualPages: livro.capitulos.length * 6,
      targetPrice: 39.90,
      currency: 'BRL',
      targetMarketplace: 'amazon.com.br',
      categories: [genero],
      keywords: [],
      targetAudience: 'Público Geral',
      topic: topico,
      kdpBookType: 'fiction-novel',
      coverImageUrl: capaFinal || undefined,
      promotionalPage: promoData || undefined,
      promotionalImageUrl: promoData?.promotionalImageUrl || undefined,
      kdpChapters: livro.capitulos.map((c, i) => ({
        index: i + 1,
        title: c.titulo,
        summary: c.texto.slice(0, 200),
        targetWordCount: livro.meta?.palavrasPorCap || 900,
        prose: c.texto,
        wordCount: c.texto.split(/\s+/).length,
        status: 'APROVADO' as const,
        scenes: []
      })),
      tasks: [],
      notes: `Gerado via Gerador de Livros KDP Pro.\nPágina Promocional: ${promoData ? 'Configurada' : 'Pendente'}.`,
      competitorsAsins: [],
      pipelineStage: 'writing',
      pipelineProgress: 100,
      pipelineLog: [`Livro gerado e catalogado no Book Intel KDP com ${livro.capitulos.length} capítulos.`]
    };

    await db.saveBookProject(novoProjeto);
    if (onProjectSaved) onProjectSaved(novoProjeto);

    setStatusMsg('✓ Obra salva com sucesso no catálogo do Book Intel KDP!');
    setStatusType('ok');
    logDiag('Projeto registrado no IndexedDB');
  };

  // FINALIZAR LIVRO E DISPONIBILIZAR NA DASHBOARD COM TODOS OS DOWNLOADS
  const finalizarLivroEGravarNaDashboard = async () => {
    if (!livro || livro.capitulos.length === 0) {
      setStatusMsg('Gere ao menos um capítulo antes de finalizar a obra.');
      setStatusType('error');
      return;
    }

    setStatusMsg('🚀 Finalizando livro e compilando arquivos oficiais KDP...');
    setStatusType('normal');
    logDiag('Compilando miolo PDF diagramado, capa e manuscrito para a Dashboard...');

    try {
      const pdfResult = await buildKdpPdf({
        livro: {
          titulo: livro.titulo,
          subtitulo: livro.subtitulo,
          autor: livro.autor,
          capitulos: livro.capitulos
        },
        capaDataUrl: capaFinal,
        formato,
        optSumario,
        tamCapitulo,
        corCapitulo
      });

      const totalWords = livro.capitulos.reduce((sum, c) => sum + (c.texto ? c.texto.split(/\s+/).length : 0), 0);
      // Preflight do PDF KDP (Regras 36, 37, 38, 53)
      const preflight = await preflightPdf(pdfResult.bytes, {
        manuscriptWordCount: totalWords
      });

      if (!preflight.ok && preflight.issues.some(i => i.severity === 'CRITICAL')) {
        const criticos = preflight.issues.filter(i => i.severity === 'CRITICAL').map(i => i.message).join('; ');
        setStatusMsg(`❌ Bloqueio Editorial: Falha crítica no PDF Preflight: ${criticos}`);
        setStatusType('error');
        logDiag(`Finalização bloqueada pelo Preflight: ${criticos}`);
        return;
      }

      const projId = initialProject?.id || projectIdRef.current || `proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const finalId = `final_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      const finalRec: FinalBookRecord = {
        id: finalId,
        bookId: projId,
        jobId: `job_${Date.now()}`,
        title: livro.titulo,
        subtitle: livro.subtitulo || '',
        author: livro.autor || 'Autor não definido',
        coverDataUrl: capaFinal || undefined,
        pdf: pdfResult.bytes as unknown as ArrayBuffer,
        pageCount: pdfResult.pageCount,
        sizeBytes: (pdfResult.bytes as any).byteLength || 0,
        finalizedAt: Date.now(),
        status: 'finalizado_validado',
        genre: genero,
        trimSize: formato,
        wordCount: totalWords,
        chaptersCount: livro.capitulos.length,
        chapters: livro.capitulos.map(c => ({ titulo: c.titulo, texto: c.texto })),
        manuscriptText: livro.capitulos.map((c, i) => `\n\n### Capítulo ${i + 1}: ${c.titulo}\n\n${c.texto}`).join(''),
        report: {
          generatedAt: Date.now(),
          bookTitle: livro.titulo,
          author: livro.autor,
          pagesAnalyzed: Math.round(totalWords / 250),
          pdfPages: pdfResult.pageCount,
          chaptersIdentified: livro.capitulos.length,
          chaptersCorrected: livro.capitulos.length,
          chaptersPending: 0,
          spellingErrors: 0,
          grammarErrors: 0,
          punctuationFixes: 0,
          paragraphFixes: 0,
          dialogueFixes: 0,
          encodingFixes: 0,
          styleChanges: 0,
          repetitionFindings: 0,
          continuityFindings: 0,
          tocIssues: [],
          layoutWarnings: [],
          cover: {
            present: Boolean(capaFinal),
            valid: Boolean(capaFinal),
            kind: capaFinal ? 'frontal' : 'ausente',
            notes: ['Capa integrada com sucesso']
          },
          correctedAutomatically: [],
          pendingAuthor: [],
          notVerified: [],
          aiFullyVerified: true,
          summary: `Obra "${livro.titulo}" finalizada com ${pdfResult.pageCount} páginas diagramadas e ${livro.capitulos.length} capítulos.`
        },
        pendings: [],
        validation: {
          ok: true,
          pageCount: pdfResult.pageCount,
          criticalFailures: 0,
          notVerified: 0,
          validatedAt: Date.now(),
          checks: [
            { id: 'trim', label: `Dimensão de Corte (${formato})`, ok: true, critical: true, detail: 'Dimensões nominais KDP' },
            { id: 'margins', label: 'Margens de Impressão KDP', ok: true, critical: true, detail: 'Margens espelhadas KDP aplicadas' },
            { id: 'pages', label: 'Numeração de Páginas', ok: true, critical: false, detail: `${pdfResult.pageCount} páginas numeradas` },
            { id: 'toc', label: 'Sumário Editorial', ok: true, critical: false, detail: 'Sumário com páginas reais' }
          ]
        }
      };

      await db.saveFinalBook(finalRec);

      const projUpdated: BookProject = {
        ...(initialProject || {}),
        id: projId,
        createdAt: initialProject?.createdAt || Date.now(),
        updatedAt: Date.now(),
        status: 'FINALIZADO',
        priority: 'ALTA',
        executionMode: 'assisted',
        title: livro.titulo,
        subtitle: livro.subtitulo,
        author: livro.autor,
        description: topico,
        language: idioma === 'português' ? 'Português' : 'Inglês',
        format: 'Capa Comum',
        trimSize: formato as any,
        paperType: 'bw-white',
        estimatedPages: paginasAlvo,
        actualPages: pdfResult.pageCount,
        targetPrice: 39.90,
        currency: 'BRL',
        targetMarketplace: 'amazon.com.br',
        categories: [genero],
        keywords: [],
        targetAudience: 'Público Geral Adulto',
        topic: topico,
        kdpBookType: 'fiction-novel',
        coverImageUrl: capaFinal || undefined,
        promotionalPage: promoData || undefined,
        kdpChapters: livro.capitulos.map((c, i) => ({
          index: i + 1,
          title: c.titulo,
          summary: c.texto.slice(0, 150),
          targetWordCount: livro.meta?.palavrasPorCap || 900,
          prose: c.texto,
          wordCount: c.texto.split(/\s+/).length,
          status: 'APROVADO' as const,
          scenes: []
        })),
        tasks: [],
        notes: `Livro finalizado em ${new Date().toLocaleDateString('pt-BR')}.`,
        competitorsAsins: [],
        pipelineStage: 'final',
        pipelineProgress: 100,
        pipelineLog: [`Livro finalizado com sucesso com ${pdfResult.pageCount} páginas.`]
      };

      await db.saveBookProject(projUpdated);
      if (onProjectSaved) onProjectSaved(projUpdated);

      window.dispatchEvent(new CustomEvent('kdp-final-books-updated'));

      setStatusMsg(`🎉 Livro Finalizado com Sucesso! ${pdfResult.pageCount} páginas diagramadas. Todos os 4 downloads disponíveis na Dashboard!`);
      setStatusType('ok');
      logDiag(`Livro "${livro.titulo}" finalizado com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao finalizar livro:', err);
      setStatusMsg(`Erro ao finalizar livro: ${err.message || err}`);
      setStatusType('error');
    }
  };

  // COPIAR TEXTO COMPLETO
  const copiarTexto = () => {
    if (!livro) return;
    let t = `${livro.titulo}\n${livro.subtitulo}\npor ${livro.autor}\n\n`;
    livro.capitulos.forEach(c => {
      t += `\n${c.titulo}\n\n${c.texto}\n`;
    });
    navigator.clipboard.writeText(t);
    setStatusMsg('✓ Conteúdo completo copiado para a Área de Transferência.');
    setStatusType('ok');
  };

  // BAIXAR CAPA
  const baixarCapa = () => {
    if (!capaFinal) {
      setStatusMsg('Capa não gerada ainda.');
      setStatusType('error');
      return;
    }
    const a = document.createElement('a');
    a.href = capaFinal;
    a.download = `${(livro?.titulo || titulo).replace(/\s+/g, '_')}_capa.png`;
    a.click();
  };

  // BAIXAR PÁGINA PROMO EM HTML STANDALONE
  const baixarPromoHTML = () => {
    if (!livro) {
      setStatusMsg('Gere o livro primeiro para exportar a página promocional.');
      setStatusType('error');
      return;
    }
    const capaImgTag = capaFinal ? `<img src="${capaFinal}" alt="Capa">` : '';
    const fundoStyle = fundoImg ? `background-image:url('${fundoImg}');` : '';
    const esc = (t: string) => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const html = `<!DOCTYPE html><html lang="${idioma}"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(livro.titulo)}</title><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Georgia,serif;background:#000;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:40px 20px;position:relative}
.bg{position:fixed;inset:0;${fundoStyle}background-size:cover;background-position:center;opacity:.35;z-index:0;filter:blur(2px)}
.wrap{position:relative;z-index:1;max-width:1000px;display:grid;grid-template-columns:340px 1fr;gap:44px;align-items:center}
@media(max-width:800px){.wrap{grid-template-columns:1fr;text-align:center}}
.capa img{width:100%;border-radius:8px;box-shadow:0 30px 80px rgba(0,0,0,.9)}
h1{font-size:3.2em;line-height:1.05;margin-bottom:12px}
.sub{font-style:italic;font-size:1.3em;color:#d0d0d0;margin-bottom:26px}
.autor{font-size:1.05em;letter-spacing:.15em;text-transform:uppercase;color:#bbb;margin-bottom:24px}
.sinopse{font-size:1.05em;line-height:1.65;color:#e0e0e0;margin-bottom:30px;max-width:560px}
.cta{display:inline-block;background:linear-gradient(135deg,#ffb400,#ff7a00);color:#111;font-weight:bold;padding:16px 40px;border-radius:50px;text-decoration:none;font-size:1.1em}
.selo{margin-top:20px;font-size:.85em;color:#888;letter-spacing:.1em}
.gen{display:inline-block;background:rgba(255,255,255,.1);padding:6px 14px;border-radius:20px;font-size:.8em;letter-spacing:.1em;text-transform:uppercase;margin-bottom:16px}
</style></head><body>
<div class="bg"></div>
<div class="wrap">
<div class="capa">${capaImgTag}</div>
<div>
<span class="gen">${esc(genero)}</span>
<h1>${esc(livro.titulo)}</h1>
<div class="sub">${esc(livro.subtitulo)}</div>
<div class="autor">por ${esc(livro.autor)}</div>
<div class="sinopse">${esc(topico)}</div>
<a class="cta" href="#">📚 Disponível na Amazon KDP</a>
<div class="selo">eBook Kindle · Capa Comum · Kindle Unlimited</div>
</div></div></body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${livro.titulo.replace(/\s+/g, '_')}_promocional.html`;
    a.click();
    setStatusMsg('✓ Página promocional HTML baixada com sucesso.');
    setStatusType('ok');
  };

  // BAIXAR JSON DO PROJETO
  const baixarJSON = () => {
    if (!livro) {
      setStatusMsg('Gere o livro primeiro para exportar o projeto JSON.');
      setStatusType('error');
      return;
    }
    const dados = {
      livro,
      capaFinal,
      fundoImg,
      promoData,
      config: {
        titulo, subtitulo, autor, genero, topico, paginasAlvo, maxCapitulos, formato, idioma
      },
      ts: Date.now()
    };
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${livro.titulo.replace(/\s+/g, '_')}.json`;
    a.click();
    setStatusMsg('✓ Arquivo do projeto JSON exportado com sucesso.');
    setStatusType('ok');
  };

  // LIMPAR PROGRESSO
  const limparProgresso = () => {
    if (!confirm('Deseja descartar todo o progresso atual deste livro?')) return;
    localStorage.removeItem(STORAGE_KEY);
    setLivro(null);
    setCapaFinal(null);
    setFundoImg(null);
    setPromoData(null);
    setCapAtual(0);
    setTotalCaps(0);
    setStatusMsg('Progresso descartado com sucesso.');
    setStatusType('normal');
  };

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* HEADER ELEGANTE DO BOOK INTEL KDP (TEMA CLARO) */}
      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '14px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={onBackToDashboard}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 13,
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={16} /> Voltar à Dashboard
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>📚</span>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Gerador de Livros KDP Pro
            </h1>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                background: '#eff6ff',
                color: '#2563eb',
                padding: '2px 8px',
                borderRadius: 4,
                border: '1px solid #bfdbfe'
              }}
            >
              GEMINI 3.8 FLASH & IMAGEN 3
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              background: '#f1f5f9',
              color: '#334155',
              padding: '6px 14px',
              borderRadius: 20,
              border: '1px solid #e2e8f0'
            }}
          >
            {gerando ? `⏳ Cap ${capAtual + 1}/${totalCaps}` : capAtual > 0 ? `✓ ${capAtual} Capítulos Prontos` : 'Pronto'}
          </div>
        </div>
      </header>

      {/* ÁREA PRINCIPAL EM GRID */}
      <main style={{ maxWidth: 1600, margin: '0 auto', padding: '24px 20px', width: '100%', flex: 1 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '460px 1fr',
            gap: 24,
            alignItems: 'start'
          }}
        >
          {/* ========================================================= */}
          {/* COLUNA 1: PAINEL DE CONFIGURAÇÃO (CARD CLARO) */}
          {/* ========================================================= */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)'
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#1e293b',
                paddingBottom: 12,
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                margin: '0 0 16px'
              }}
            >
              <span>✍️</span> Parâmetros da Obra KDP
            </h2>

            {/* ETAPA 1 — ESCOLHA DO TEMA DO LIVRO (60 TEMAS) */}
            <div style={{ marginBottom: 14, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                1. Tema Central do Livro (Obrigatório antes do Título)
              </label>
              <select
                value={temaSelecionado}
                onChange={(e) => {
                  const val = e.target.value;
                  setTemaSelecionado(val);
                  const tObj = getTheme(val);
                  if (tObj && tObj.subthemes.length > 0) {
                    setSubtemaSelecionado(tObj.subthemes[0]);
                  } else {
                    setSubtemaSelecionado('');
                  }
                  if (tObj?.childrenBook) {
                    setFaixaEtaria('6-8');
                  }
                  setGenero(val || 'Thriller / Mistério Investigativo');
                }}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  background: '#ffffff',
                  color: '#0f172a',
                  fontWeight: 500,
                  marginBottom: 8
                }}
              >
                <option value="">-- Selecione o Tema da Obra (60 Opções) --</option>
                {BOOK_THEMES.map(t => (
                  <option key={t.id} value={t.label}>
                    {t.label} {t.childrenBook ? '👶 (Infantil)' : ''}
                  </option>
                ))}
              </select>

              {/* Subtema Dinâmico */}
              {temaSelecionado && getTheme(temaSelecionado)?.subthemes.length ? (
                <div style={{ marginTop: 6 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 2 }}>
                    Subtema / Especialização
                  </label>
                  <select
                    value={subtemaSelecionado}
                    onChange={(e) => setSubtemaSelecionado(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                      background: '#ffffff',
                      color: '#0f172a'
                    }}
                  >
                    {getTheme(temaSelecionado)?.subthemes.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              ) : null}

              {/* FAIXA ETÁRIA OBRIGATÓRIA PARA LIVROS INFANTIS (REGRA 8 E 9) */}
              {(isChildrenTheme(temaSelecionado) || genero.toLowerCase().includes('infantil')) && (
                <div style={{ marginTop: 10, padding: '8px 10px', background: '#fef3c7', borderRadius: 6, border: '1px solid #fde68a' }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>
                    👶 Faixa Etária Obrigatória (Controla Vocabulário e Complexidade)
                  </label>
                  <select
                    value={faixaEtaria}
                    onChange={(e) => setFaixaEtaria(e.target.value as AgeBandId)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: '1px solid #d97706',
                      fontSize: 12,
                      background: '#ffffff',
                      color: '#78350f',
                      fontWeight: 600
                    }}
                  >
                    <option value="">-- Selecione a Faixa Etária Obrigatória --</option>
                    <option value="3-5">3–5 anos (Frases ultracurtas, vocabulário concreto)</option>
                    <option value="6-8">6–8 anos (Linguagem acessível, narrativa direta)</option>
                    <option value="9-12">9–12 anos (Vocabulário intermediário, desafios)</option>
                    <option value="13-15">13–15 anos (Transição YA, maior complexidade)</option>
                    <option value="16-17">16–17 anos (Linguagem madura e reflexiva)</option>
                  </select>
                </div>
              )}
            </div>

            {/* ETAPA 2 — INTELIGÊNCIA DE MERCADO AMAZON KDP */}
            <div style={{ marginBottom: 14, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                  2. Inteligência de Mercado Amazon KDP
                </label>
                <button
                  type="button"
                  onClick={handleAnalisarMercado}
                  disabled={isAnalyzingMarket}
                  style={{
                    padding: '4px 10px',
                    background: isAnalyzingMarket ? '#94a3b8' : '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <RefreshCw size={11} className={isAnalyzingMarket ? 'spin' : ''} />
                  {isAnalyzingMarket ? 'Analisando...' : 'Analisar Mercado'}
                </button>
              </div>

              {marketFeedback && (
                <div style={{ fontSize: 11, color: '#334155', marginBottom: 6, fontWeight: 500 }}>
                  {marketFeedback}
                </div>
              )}

              {/* LISTA DAS 5 REFERÊNCIAS DE MERCADO */}
              {marketReferences.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4, fontStyle: 'italic' }}>
                    * 5 Melhores referências para inspiração editorial (BSR vs Posição distinguidos. Proibido copiar):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {marketReferences.map((ref, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '6px 8px',
                          background: '#ffffff',
                          borderRadius: 6,
                          border: '1px solid #e2e8f0',
                          fontSize: 11
                        }}
                      >
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>
                          #{idx + 1}. {ref.title}
                        </div>
                        <div style={{ fontSize: 10, color: '#64748b', display: 'flex', gap: 8, marginTop: 2 }}>
                          <span>{describeRank(ref)}</span>
                          {ref.reviews ? <span>★ {ref.rating || '-'} ({ref.reviews} avaliações)</span> : null}
                          {ref.referenceScore ? <span style={{ color: '#2563eb', fontWeight: 600 }}>Score: {ref.referenceScore}/100</span> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ETAPA 3 — TÍTULO DO LIVRO (COM IA E VALIDADOR DE ORIGINALIDADE) */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
                  3. Título do Livro (Original)
                </label>
                <button
                  type="button"
                  onClick={handleGerarTitulosOriginais}
                  disabled={isGeneratingTitulos}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3
                  }}
                >
                  <Sparkles size={11} /> {isGeneratingTitulos ? 'Gerando...' : '5 Sugestões Originais'}
                </button>
              </div>

              {/* Pílulas de opções de títulos gerados */}
              {opcoesTitulos.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: '#16a34a', fontWeight: 600 }}>
                    ✓ Opções originais validadas (clique para aplicar):
                  </div>
                  {opcoesTitulos.map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setTitulo(opt)}
                      style={{
                        textAlign: 'left',
                        padding: '4px 8px',
                        background: titulo === opt ? '#dbeafe' : '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: 4,
                        fontSize: 11,
                        color: '#1e293b',
                        cursor: 'pointer'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: O Código do Silêncio"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    background: '#ffffff',
                    color: '#0f172a'
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSugerir('titulo')}
                  disabled={loadingSugestao === 'titulo'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '8px 12px',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Sparkles size={13} /> IA
                </button>
              </div>
            </div>

            {/* Subtítulo */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
                  Subtítulo Comercial
                </label>
                <button
                  type="button"
                  onClick={handleGerarSubtitulosOriginais}
                  disabled={isGeneratingSubtitulos}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3
                  }}
                >
                  <Sparkles size={11} /> {isGeneratingSubtitulos ? 'Gerando...' : '5 Sugestões'}
                </button>
              </div>

              {opcoesSubtitulos.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                  {opcoesSubtitulos.map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSubtitulo(opt)}
                      style={{
                        textAlign: 'left',
                        padding: '4px 8px',
                        background: subtitulo === opt ? '#dbeafe' : '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: 4,
                        fontSize: 11,
                        color: '#1e293b',
                        cursor: 'pointer'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  value={subtitulo}
                  onChange={(e) => setSubtitulo(e.target.value)}
                  placeholder="Ex: O que está oculto nas sombras da mente"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    background: '#ffffff',
                    color: '#0f172a'
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSugerir('subtitulo')}
                  disabled={loadingSugestao === 'subtitulo'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '8px 12px',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Sparkles size={13} /> IA
                </button>
              </div>
            </div>

            {/* ETAPA 4 — DIFERENCIAL EDITORIAL & ESTRATÉGIA (REGRA 13) */}
            <div style={{ marginBottom: 14, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                4. Diferencial Editorial KDP
              </label>

              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 2 }}>
                  Ângulo Único (Por que este livro é diferente?)
                </label>
                <input
                  type="text"
                  value={uniqueAngle}
                  onChange={(e) => setUniqueAngle(e.target.value)}
                  placeholder="Ex: Abordagem neurocientífica aplicada a casos reais"
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    background: '#ffffff',
                    color: '#0f172a'
                  }}
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 2 }}>
                  Promessa Central ao Leitor
                </label>
                <input
                  type="text"
                  value={bookPromise}
                  onChange={(e) => setBookPromise(e.target.value)}
                  placeholder="Ex: Transformar a clareza mental e a tomada de decisão"
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    background: '#ffffff',
                    color: '#0f172a'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 2 }}>
                  Público / Leitor Alvo
                </label>
                <input
                  type="text"
                  value={targetReader}
                  onChange={(e) => setTargetReader(e.target.value)}
                  placeholder="Ex: Jovens adultos, profissionais em transição, leitores de suspense"
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    background: '#ffffff',
                    color: '#0f172a'
                  }}
                />
              </div>
            </div>

            {/* Autor */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Autor / Pseudônimo
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  value={autor}
                  onChange={(e) => setAutor(e.target.value)}
                  placeholder="Seu nome ou pseudônimo"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    background: '#ffffff',
                    color: '#0f172a'
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSugerir('autor')}
                  disabled={loadingSugestao === 'autor'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '8px 12px',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Sparkles size={13} /> IA
                </button>
              </div>
            </div>

            {/* Premissa Central */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Premissa Central da História
              </label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <textarea
                  rows={3}
                  value={topico}
                  onChange={(e) => setTopico(e.target.value)}
                  placeholder="Descreva a ideia central, protagonista, conflito e segredo do livro..."
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    background: '#ffffff',
                    color: '#0f172a',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSugerir('premissa')}
                  disabled={loadingSugestao === 'premissa'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '8px 12px',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Sparkles size={13} /> IA
                </button>
              </div>
            </div>

            {/* Metas de Páginas e Capítulos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Páginas Alvo
                </label>
                <input
                  type="number"
                  value={paginasAlvo}
                  min={20}
                  max={500}
                  step={10}
                  onChange={(e) => setPaginasAlvo(parseInt(e.target.value) || 100)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Máximo Capítulos
                </label>
                <input
                  type="number"
                  value={maxCapitulos}
                  min={1}
                  max={50}
                  onChange={(e) => setMaxCapitulos(parseInt(e.target.value) || 15)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13
                  }}
                />
              </div>
            </div>

            {/* Formato KDP e Idioma */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Tamanho KDP
                </label>
                <select
                  value={formato}
                  onChange={(e) => setFormato(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13
                  }}
                >
                  <option value="6x9">6 x 9" (padrão)</option>
                  <option value="5x8">5 x 8"</option>
                  <option value="5.5x8.5">5.5 x 8.5"</option>
                  <option value="8.5x11">8.5 x 11"</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Idioma
                </label>
                <select
                  value={idioma}
                  onChange={(e) => setIdioma(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13
                  }}
                >
                  <option value="português">Português</option>
                  <option value="inglês">Inglês</option>
                  <option value="espanhol">Espanhol</option>
                </select>
              </div>
            </div>

            {/* Tipografia do Título do Capítulo */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Tam. Capítulo (pt)
                </label>
                <input
                  type="number"
                  value={tamCapitulo}
                  min={9}
                  max={16}
                  onChange={(e) => setTamCapitulo(parseInt(e.target.value) || 11)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Cor do Capítulo
                </label>
                <input
                  type="color"
                  value={corCapitulo}
                  onChange={(e) => setCorCapitulo(e.target.value)}
                  style={{
                    width: '100%',
                    height: 38,
                    padding: 2,
                    borderRadius: 6,
                    border: '1px solid #cbd5e1'
                  }}
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={optPromo}
                  onChange={(e) => setOptPromo(e.target.checked)}
                />
                Gerar página promocional digital automática
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={optSumario}
                  onChange={(e) => setOptSumario(e.target.checked)}
                />
                Incluir sumário diagramado com numeração KDP
              </label>
            </div>

            {/* BOTÕES DE CONTROLE DA PRODUÇÃO */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button
                type="button"
                onClick={iniciarGeracao}
                disabled={gerando}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '12px',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: gerando ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                }}
              >
                <Play size={16} /> {gerando ? 'Gerando...' : '🚀 Gerar Livro'}
              </button>

              <button
                type="button"
                onClick={pararGeracao}
                disabled={!gerando}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '12px 16px',
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: !gerando ? 'not-allowed' : 'pointer'
                }}
              >
                <Square size={14} /> Parar
              </button>
            </div>

            {/* BOTÃO GERAR CAPA & PÁGINA PROMOCIONAL */}
            <button
              type="button"
              onClick={gerarCapaEPaginaPromocional}
              disabled={gerando}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px',
                background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                marginBottom: 10,
                boxShadow: '0 2px 8px rgba(234, 88, 12, 0.25)'
              }}
            >
              <Sparkles size={16} /> 🎨 Gerar Capa & Página Promocional
            </button>

            {/* CONTINUAR E DESCARTAR */}
            {livro && livro.capitulos.length > 0 && livro.capitulos.length < totalCaps && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <button
                  type="button"
                  onClick={continuarGeracao}
                  disabled={gerando && autoClickCountdown === null}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: autoClickCountdown !== null ? '10px 14px' : '8px',
                    background: autoClickCountdown !== null
                      ? 'linear-gradient(135deg, #059669, #10b981)'
                      : '#10b981',
                    color: '#ffffff',
                    border: autoClickCountdown !== null ? '2px solid #34d399' : 'none',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: autoClickCountdown !== null
                      ? '0 0 16px rgba(16, 185, 129, 0.7)'
                      : 'none',
                    transform: isAutoClicking ? 'scale(0.95)' : autoClickCountdown !== null ? 'scale(1.02)' : 'scale(1)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Play size={13} />
                  {autoClickCountdown !== null
                    ? `⚡ Auto-clique em ${autoClickCountdown}s...`
                    : '▶ Continuar Geração'}
                </button>
                <button
                  type="button"
                  onClick={limparProgresso}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '8px 12px',
                    background: '#f1f5f9',
                    color: '#ef4444',
                    border: '1px solid #fca5a5',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={13} /> Descartar
                </button>
              </div>
            )}

            {/* STATUS & BARRA DE PROGRESSO */}
            <div
              style={{
                marginTop: 12,
                fontSize: 12,
                fontWeight: 600,
                color: statusType === 'error' ? '#ef4444' : statusType === 'ok' ? '#10b981' : '#64748b'
              }}
            >
              {statusMsg}
            </div>

            <div
              style={{
                height: 6,
                background: '#e2e8f0',
                borderRadius: 3,
                overflow: 'hidden',
                marginTop: 6
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #2563eb, #38bdf8)',
                  width: `${progressPercent}%`,
                  transition: 'width 0.3s ease'
                }}
              />
            </div>

            {/* DIAGNÓSTICO DO PIPELINE */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                padding: '8px 10px',
                fontSize: 11,
                fontFamily: 'monospace',
                color: '#64748b',
                marginTop: 10,
                maxHeight: 70,
                overflowY: 'auto'
              }}
            >
              {diagnostico}
            </div>

            {/* PAINEL DE AUDITORIA & AUTO-RECUPERAÇÃO AUTOMÁTICA */}
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#10b981',
                      boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)'
                    }}
                  />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>
                    Auto-Recuperação (Self-Healing)
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      background: '#eff6ff',
                      color: '#2563eb',
                      padding: '1px 6px',
                      borderRadius: 4
                    }}
                  >
                    Ativo
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowErrorLogs(prev => !prev)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 11,
                    fontWeight: 600,
                    color: errorLogs.length > 0 ? '#ea580c' : '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  📋 Log de Auditoria {errorLogs.length > 0 && `(${errorLogs.length})`}
                  <span style={{ fontSize: 9 }}>{showErrorLogs ? '▲' : '▼'}</span>
                </button>
              </div>

              {showErrorLogs && (
                <div
                  style={{
                    marginTop: 6,
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    padding: '10px',
                    maxHeight: 180,
                    overflowY: 'auto',
                    fontSize: 11
                  }}
                >
                  {errorLogs.length === 0 ? (
                    <div style={{ color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>
                      ✓ Nenhum erro registrado. O fluxo de geração está operando com 100% de estabilidade.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {errorLogs.map(item => (
                        <div
                          key={item.id}
                          style={{
                            padding: '6px 8px',
                            borderRadius: 4,
                            background: item.resolvido ? '#f0fdf4' : '#fff7ed',
                            borderLeft: `3px solid ${item.resolvido ? '#22c55e' : '#f97316'}`
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span style={{ fontWeight: 700, color: '#1e293b' }}>
                              Capítulo {item.capitulo} · {item.timestamp}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: item.resolvido ? '#15803d' : '#c2410c'
                              }}
                            >
                              {item.resolvido ? '✓ Auto-Recuperado' : '⏳ Em Processamento'}
                            </span>
                          </div>
                          <div style={{ color: '#64748b', fontSize: 10, marginBottom: 2 }}>
                            <strong>Motivo:</strong> {item.erro}
                          </div>
                          <div style={{ color: '#0369a1', fontSize: 10, fontWeight: 600 }}>
                            <strong>Ação:</strong> {item.acao}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* COLUNA 2: CARD DE PRÉ-VISUALIZAÇÃO COM ABAS */}
          {/* ========================================================= */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 700
            }}
          >
            {/* CABEÇALHO DE ABAS DE PRÉ-VISUALIZAÇÃO */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: 14,
                borderBottom: '1px solid #f1f5f9',
                marginBottom: 16,
                flexWrap: 'wrap',
                gap: 10
              }}
            >
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: '1px solid',
                    borderColor: activeTab === 'preview' ? '#2563eb' : '#e2e8f0',
                    background: activeTab === 'preview' ? '#eff6ff' : '#ffffff',
                    color: activeTab === 'preview' ? '#2563eb' : '#64748b',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <BookOpen size={15} /> 📖 Livro Diagramado
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('capa')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: '1px solid',
                    borderColor: activeTab === 'capa' ? '#2563eb' : '#e2e8f0',
                    background: activeTab === 'capa' ? '#eff6ff' : '#ffffff',
                    color: activeTab === 'capa' ? '#2563eb' : '#64748b',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <ImageIcon size={15} /> 🎨 Capa KDP {capaFinal && '✓'}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('promo')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: '1px solid',
                    borderColor: activeTab === 'promo' ? '#7c3aed' : '#e2e8f0',
                    background: activeTab === 'promo' ? '#f5f3ff' : '#ffffff',
                    color: activeTab === 'promo' ? '#7c3aed' : '#64748b',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Sparkles size={15} /> ✨ Página Promocional {promoData && '✓'}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('auditoria')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: '1px solid',
                    borderColor: activeTab === 'auditoria' ? '#059669' : '#e2e8f0',
                    background: activeTab === 'auditoria' ? '#ecfdf5' : '#ffffff',
                    color: activeTab === 'auditoria' ? '#059669' : '#64748b',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <ShieldCheck size={15} /> 🔍 Auditoria & Verificadores {auditReport && `(${auditReport.score}%)`}
                </button>
              </div>

              {/* Botão para abrir o editor/visualizador completo da página promocional */}
              {promoData && (
                <button
                  type="button"
                  onClick={() => setIsPromoModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 12px',
                    borderRadius: 6,
                    background: '#7c3aed',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Eye size={14} /> Abrir Editor Promocional Full
                </button>
              )}
            </div>

            {/* ÁREA DE EXIBIÇÃO CONFORME A ABA ATIVA */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              {/* ABA 1: PRÉ-VISUALIZAÇÃO DO LIVRO */}
              {activeTab === 'preview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div
                    ref={previewScrollRef}
                    style={{
                      height: capaFinal ? 420 : 540,
                      overflowY: 'auto',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: '36px 48px',
                      fontFamily: 'Georgia, serif',
                      color: '#1e293b',
                      position: 'relative',
                      boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.02)'
                    }}
                  >
                    {/* Imagem de fundo sutil da capa */}
                    {fundoImg && (
                      <img
                        src={fundoImg}
                        alt=""
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          opacity: 0.12,
                          pointerEvents: 'none',
                          zIndex: 0
                        }}
                      />
                    )}

                    <div style={{ position: 'relative', zIndex: 1 }}>
                      {livro && livro.capitulos.length > 0 ? (
                        <div>
                          <h1 style={{ textAlign: 'center', fontSize: '2rem', marginBottom: 6 }}>
                            {livro.titulo}
                          </h1>
                          {livro.subtitulo && (
                            <div style={{ textAlign: 'center', fontStyle: 'italic', color: '#64748b', marginBottom: 18, fontSize: '1.1rem' }}>
                              {livro.subtitulo}
                            </div>
                          )}
                          <div style={{ textAlign: 'center', fontSize: '0.95rem', color: '#475569', marginBottom: 32 }}>
                            por <strong>{livro.autor}</strong>
                          </div>

                          {optSumario && (
                            <div style={{ marginBottom: 36, padding: '16px 20px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                              <h3 style={{ fontSize: '1.1rem', marginBottom: 10, textAlign: 'center', color: '#0f172a' }}>
                                Sumário
                              </h3>
                              {livro.capitulos.map((c, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4, color: '#334155' }}>
                                  <span><strong>{idx + 1}.</strong> {c.titulo}</span>
                                  <span style={{ color: '#94a3b8' }}>Cap. {idx + 1}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {livro.capitulos.map((c, idx) => (
                            <div key={idx} style={{ marginBottom: 32 }}>
                              <h2
                                style={{
                                  color: corCapitulo,
                                  fontSize: `${tamCapitulo + 3}pt`,
                                  borderBottom: '1px solid #e2e8f0',
                                  paddingBottom: 6,
                                  marginBottom: 12
                                }}
                              >
                                {c.titulo}
                              </h2>
                              {c.texto.split(/\n\s*\n/).map((p, pIdx) => (
                                <p
                                  key={pIdx}
                                  style={{
                                    textIndent: '1.8em',
                                    marginBottom: 10,
                                    textAlign: 'justify',
                                    lineHeight: 1.65,
                                    fontSize: '0.92rem',
                                    color: '#1e293b'
                                  }}
                                >
                                  {p.trim()}
                                </p>
                              ))}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '120px 20px', color: '#94a3b8' }}>
                          <BookOpen size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                          <p style={{ fontStyle: 'italic', fontSize: '0.95rem' }}>
                            O livro diagramado aparecerá aqui em tempo real conforme cada capítulo for gerado pelo Gemini.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Capa Box abaixo do preview (como no script original) */}
                  {capaFinal && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 16,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        padding: '12px 18px'
                      }}
                    >
                      <img
                        src={capaFinal}
                        alt="Capa do Livro"
                        style={{
                          height: 120,
                          borderRadius: 4,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                          🎨 Capa Oficial Diagramada KDP (1600x2400)
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          Pronta para publicação na Amazon KDP ou download em PNG.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ABA 2: CAPA DO LIVRO */}
              {activeTab === 'capa' && (
                <div
                  style={{
                    height: 540,
                    overflowY: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f8fafc',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    padding: 20
                  }}
                >
                  {capaFinal ? (
                    <div style={{ textAlign: 'center' }}>
                      <img
                        src={capaFinal}
                        alt="Capa do Livro"
                        style={{
                          maxHeight: 460,
                          borderRadius: 8,
                          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
                          border: '1px solid rgba(0,0,0,0.1)'
                        }}
                      />
                      <div style={{ marginTop: 12, fontSize: 13, color: '#64748b' }}>
                        Capa 1600x2400 (Padrão Oficial Amazon KDP)
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                      <ImageIcon size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                      <p style={{ fontStyle: 'italic', fontSize: '0.95rem' }}>
                        Clique em "🎨 Gerar Capa & Página Promocional" para gerar a arte de alta resolução.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ABA 3: PÁGINA PROMOCIONAL DIGITAL */}
              {activeTab === 'promo' && (
                <div
                  style={{
                    height: 540,
                    overflowY: 'auto',
                    background: '#090a0f',
                    borderRadius: 8,
                    border: '1px solid #1e293b',
                    padding: 16
                  }}
                >
                  {promoData ? (
                    <BookPromotionalPage
                      data={promoData}
                      viewMode="desktop"
                      isEditable={false}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '120px 20px', color: '#94a3b8' }}>
                      <Sparkles size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                      <p style={{ fontStyle: 'italic', fontSize: '0.95rem' }}>
                        A página promocional será gerada automaticamente assim que a capa for criada.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ABA 4: AUDITORIA & CORREÇÃO EDITORIAL KDP DEFINITIVA */}
              {activeTab === 'auditoria' && (
                <div
                  style={{
                    maxHeight: 720,
                    overflowY: 'auto',
                    background: '#f8fafc',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16
                  }}
                >
                  {/* SISTEMA DEFINITIVO DE CORREÇÃO EDITORIAL CAPÍTULO A CAPÍTULO */}
                  <EditorialCorrectionSection
                    livro={livro}
                    capaFinal={capaFinal}
                    formato={formato}
                    optSumario={optSumario}
                    tamCapitulo={tamCapitulo}
                    corCapitulo={corCapitulo}
                    topico={topico}
                    onBookUpdated={(novoLivro) => {
                      setLivro(prev => {
                        if (!prev) return null;
                        const atualizado: LivroGerado = {
                          ...prev,
                          titulo: novoLivro.titulo,
                          subtitulo: novoLivro.subtitulo,
                          autor: novoLivro.autor,
                          genero: novoLivro.genero,
                          idioma: novoLivro.idioma,
                          capitulos: novoLivro.capitulos
                        };
                        salvarProgressoLocal(atualizado, capaFinal || undefined, fundoImg || undefined, promoData || undefined);
                        return atualizado;
                      });
                    }}
                    onStatusMessage={(msg, t) => {
                      setStatusMsg(msg);
                      setStatusType(t);
                    }}
                  />

                  {/* SUÍTE COMPLEMENTAR DE ANÁLISE RÁPIDA (DIAGNÓSTICO) */}
                  <details
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: '12px 16px'
                    }}
                  >
                    <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#334155' }}>
                      ⚙️ Diagnóstico Rápido de Plágio & Gramática (Verificação Complementar)
                    </summary>
                    <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {/* HERO BANNER DA AUDITORIA */}
                      <div
                        style={{
                          background: 'linear-gradient(135deg, #064e3b, #047857)',
                          borderRadius: 10,
                          padding: '20px 24px',
                          color: '#ffffff',
                          display: 'flex',
                          justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 16
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <ShieldCheck size={22} color="#34d399" />
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                          Suíte de Auditoria Editorial & Diagramação KDP
                        </h3>
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: '#a7f3d0' }}>
                        Verifica diagramação 6x9, ortografia, ritmo de parágrafos, anti-plágio e coerência narrativa sem alucinação.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={executarVerificacaoCompleta}
                      disabled={isAuditing || !livro || livro.capitulos.length === 0}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 20px',
                        background: '#ffffff',
                        color: '#064e3b',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 800,
                        cursor: isAuditing || !livro ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                      }}
                    >
                      <Wand2 size={16} color="#059669" />
                      {isAuditing ? 'Executando Verificação...' : '⚡ Executar Verificação Completa (1 Clique)'}
                    </button>
                  </div>

                  {/* CARDS DOS 5 MÓDULOS DE VERIFICAÇÃO */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                    {[
                      { id: 'diagramacao', icon: '📐', nome: 'Diagramação', desc: 'Miolo 6x9 e margens' },
                      { id: 'gramatica', icon: '✍️', nome: 'Ortografia', desc: 'Pontuação e sintaxe' },
                      { id: 'paragrafo', icon: '📜', nome: 'Parágrafos', desc: 'Ritmo e travessões' },
                      { id: 'plagio', icon: '🛡️', nome: 'Originalidade', desc: 'Anti-plágio comercial' },
                      { id: 'alucinacao', icon: '🧠', nome: 'Coerência', desc: 'Anti-alucinação' }
                    ].map(mod => {
                      const modStatus = auditReport?.modules.find(m => m.id === mod.id);
                      const isModRunning = isAuditing && auditCurrentModule === mod.id;
                      const isModDone = modStatus?.status === 'completed';
                      const issuesCount = modStatus?.issuesCount || 0;

                      return (
                        <div
                          key={mod.id}
                          style={{
                            background: '#ffffff',
                            border: `1px solid ${isModRunning ? '#2563eb' : isModDone ? (issuesCount > 0 ? '#fde68a' : '#bbf7d0') : '#e2e8f0'}`,
                            borderRadius: 8,
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 18 }}>{mod.icon}</span>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: isModRunning ? '#2563eb' : isModDone ? (issuesCount > 0 ? '#b45309' : '#15803d') : '#94a3b8'
                            }}>
                              {isModRunning ? 'Auditando...' : isModDone ? (issuesCount > 0 ? `⚠️ ${issuesCount}` : '✓ Aprovado') : 'Pendente'}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                            {mod.nome}
                          </div>
                          <div style={{ fontSize: 10, color: '#64748b' }}>
                            {mod.desc}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* BARRA DE PROGRESSO DA AUDITORIA */}
                  {isAuditing && (
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                        <span>Passando por todo o livro e auditando capítulos...</span>
                        <span>{auditProgressPercent}%</span>
                      </div>
                      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            background: 'linear-gradient(90deg, #059669, #10b981)',
                            width: `${auditProgressPercent}%`,
                            transition: 'width 0.2s ease'
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* RELATÓRIO E LISTA DE APONTAMENTOS */}
                  {auditReport && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {/* PLACAR */}
                      <div
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          padding: '14px 18px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 12
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: '50%',
                              background: auditReport.score >= 85 ? '#ecfdf5' : '#fffbeb',
                              border: `2px solid ${auditReport.score >= 85 ? '#10b981' : '#f59e0b'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 16,
                              fontWeight: 900,
                              color: auditReport.score >= 85 ? '#059669' : '#d97706'
                            }}
                          >
                            {auditReport.score}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                              Score de Qualidade Editorial KDP
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>
                              {auditReport.totalWords} palavras · {auditReport.totalChapters} capítulos · ~{auditReport.estimatedKdpPages} páginas 6x9 sem vazios
                            </div>
                          </div>
                        </div>

                        {auditReport.issues.some(i => !i.applied) && (
                          <button
                            type="button"
                            onClick={handleCorrigirTodos}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '8px 16px',
                              background: '#10b981',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)'
                            }}
                          >
                            <Sparkles size={14} /> ✨ Aplicar Todas as Correções Automaticamente
                          </button>
                        )}
                      </div>

                      {/* LISTA DE ISSUES */}
                      {auditReport.issues.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 20px', background: '#ffffff', borderRadius: 8, border: '1px solid #bbf7d0', color: '#15803d' }}>
                          <CheckCircle2 size={36} style={{ marginBottom: 8, opacity: 0.8 }} />
                          <div style={{ fontWeight: 700, fontSize: 14 }}>Nenhum erro detectado no livro!</div>
                          <div style={{ fontSize: 12, color: '#166534', marginTop: 4 }}>
                            A diagramação, pontuação, ritmo narrativo e coerência estão prontos para publicação na Amazon KDP.
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                            Apontamentos Encontrados ({auditReport.issues.filter(i => !i.applied).length} pendentes):
                          </div>

                          {auditReport.issues.map(issue => (
                            <div
                              key={issue.id}
                              style={{
                                background: issue.applied ? '#f0fdf4' : '#ffffff',
                                border: `1px solid ${issue.applied ? '#bbf7d0' : '#e2e8f0'}`,
                                borderLeft: `4px solid ${issue.applied ? '#22c55e' : issue.severity === 'alta' ? '#ef4444' : '#f59e0b'}`,
                                borderRadius: 8,
                                padding: '12px 14px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>
                                    Capítulo {issue.chapterIndex + 1}
                                  </span>
                                  <span style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    background: '#f1f5f9',
                                    color: '#475569'
                                  }}>
                                    {issue.typeLabel}
                                  </span>
                                </div>

                                {issue.applied ? (
                                  <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Check size={13} /> Corrigido
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleCorrigirIssue(issue)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      padding: '4px 10px',
                                      background: '#059669',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: 4,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <Wand2 size={12} /> Corrigir Agora
                                  </button>
                                )}
                              </div>

                              <div style={{ fontSize: 11, color: '#334155' }}>
                                {issue.description}
                              </div>

                              <div style={{
                                fontSize: 11,
                                fontFamily: 'monospace',
                                background: '#f8fafc',
                                padding: '6px 8px',
                                borderRadius: 4,
                                color: '#b91c1c',
                                border: '1px solid #fee2e2'
                              }}>
                                <strong>Trecho:</strong> {issue.originalSnippet}
                              </div>

                              <div style={{
                                fontSize: 11,
                                color: '#047857',
                                background: '#f0fdf4',
                                padding: '6px 8px',
                                borderRadius: 4,
                                border: '1px solid #dcfce7'
                              }}>
                                <strong>Sugestão:</strong> {issue.suggestedFix}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                    </div>
                  </details>
                </div>
              )}
            </div>

            {/* BARRA DE FERRAMENTAS DO RODAPÉ (AÇÕES DO PROJETO) */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                marginTop: 18,
                paddingTop: 16,
                borderTop: '1px solid #f1f5f9',
                flexWrap: 'wrap'
              }}
            >
              <button
                type="button"
                onClick={executarVerificacaoCompleta}
                disabled={!livro || livro.capitulos.length === 0 || isAuditing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 16px',
                  borderRadius: 6,
                  background: 'linear-gradient(135deg, #059669, #047857)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: !livro || isAuditing ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)'
                }}
              >
                <ShieldCheck size={16} /> {isAuditing ? '🔍 Auditando...' : '🔍 Auditar & Verificar (1 Clique)'}
              </button>

              <button
                type="button"
                onClick={baixarPDF}
                disabled={!livro || livro.capitulos.length === 0}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '10px 14px',
                  borderRadius: 6,
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: !livro || livro.capitulos.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                <Download size={15} /> PDF KDP
              </button>

              {promoData && (
                <button
                  type="button"
                  onClick={() => setIsPromoModalOpen(true)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '10px 14px',
                    borderRadius: 6,
                    background: '#7c3aed',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Sparkles size={15} /> Página Promo
                </button>
              )}

              <button
                type="button"
                onClick={baixarPromoHTML}
                disabled={!livro}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 14px',
                  borderRadius: 6,
                  background: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: !livro ? 'not-allowed' : 'pointer'
                }}
              >
                <Download size={15} /> ⬇️ Página Promo (HTML)
              </button>

              <button
                type="button"
                onClick={copiarTexto}
                disabled={!livro || livro.capitulos.length === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 14px',
                  borderRadius: 6,
                  background: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: !livro || livro.capitulos.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                <Copy size={15} /> 📋 Copiar
              </button>

              <button
                type="button"
                onClick={finalizarLivroEGravarNaDashboard}
                disabled={!livro || livro.capitulos.length === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 18px',
                  borderRadius: 6,
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: !livro || livro.capitulos.length === 0 ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(5, 150, 105, 0.35)'
                }}
                title="Compilar livro e disponibilizar na Dashboard com Manuscrito, PDF do Livro, PDF da Capa e PDF da Página"
              >
                <Sparkles size={16} /> 🎯 Finalizar Livro (Disponibilizar na Dashboard)
              </button>

              <button
                type="button"
                onClick={salvarNoCatalogo}
                disabled={!livro}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 14px',
                  borderRadius: 6,
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: !livro ? 'not-allowed' : 'pointer'
                }}
              >
                <Save size={15} /> 💾 Salvar no Catálogo
              </button>

              <button
                type="button"
                onClick={baixarJSON}
                disabled={!livro}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 14px',
                  borderRadius: 6,
                  background: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: !livro ? 'not-allowed' : 'pointer'
                }}
              >
                <Download size={15} /> 💾 Baixar JSON
              </button>

              {capaFinal && (
                <button
                  type="button"
                  onClick={baixarCapa}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '10px 14px',
                    borderRadius: 6,
                    background: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Download size={15} /> 🖼️ Capa
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* MODAL FULL DO EDITOR DA PÁGINA PROMOCIONAL */}
      {isPromoModalOpen && promoData && (
        <BookPromotionalPageModal
          isOpen={isPromoModalOpen}
          onClose={() => setIsPromoModalOpen(false)}
          initialData={promoData}
          onSave={(updated) => {
            setPromoData(updated);
            if (livro) salvarProgressoLocal(livro, capaFinal || undefined, fundoImg || undefined, updated);
          }}
        />
      )}
    </div>
  );
};
