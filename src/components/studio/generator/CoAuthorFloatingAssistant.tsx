import React, { useState, useRef, useEffect } from 'react';
import {
  Bot, Sparkles, Send, X, Minimize2, Check, RefreshCw,
  BookOpen, ChevronRight, CheckCircle2, MessageSquare, Lightbulb,
  CornerDownLeft, ShieldCheck, Layers, Award, ArrowUpRight, Palette,
  Image as ImageIcon, Download, CheckSquare, Search, Volume2, VolumeX
} from 'lucide-react';
import { chamarGeminiTexto, chamarImagen } from '../../../services/kdp-ai-engine';
import { executarPipelineCompletoCapaReplicate } from '../../../services/replicate-book-cover-pipeline';
import { cleanChapterTitle } from '../../../services/kdp-editorial-review';
import {
  fetchAllReadyBooks,
  saveUpdatedBookToDb,
  inferCoAuthorBookType,
  reviewFullBookWithCoAuthor,
  type ReadyBookRecord
} from '../../../services/ready-books-service';
import { BookEnginAnimatedBook } from '../../common/BookEnginAnimatedBook';
import { coAuthorVoiceService } from '../../../services/coauthor-voice-service';
import { coAuthorSpeechService } from '../../../services/coauthor-speech-recognition-service';
import { CoAuthorVoiceToggle } from './CoAuthorVoiceToggle';
import { CoAuthorVoiceModalBar } from './CoAuthorVoiceModalBar';
import { AmazonLiveService } from '../../../services/amazon-live-service';
import { BOOK_THEMES } from '../../../data/book-themes';

export interface BookConceptionConfig {
  titulo?: string;
  subtitulo?: string;
  tema?: string;
  subtema?: string;
  genero?: string;
  paginasAlvo?: number;
  maxCapitulos?: number;
  premissa?: string;
}

export interface CoAuthorFloatingAssistantProps {
  bookState: any | null;
  currentConfig?: BookConceptionConfig;
  onUpdateBookConfig?: (config: BookConceptionConfig) => void;
  onSaveChapter?: (chapter: { numero: number; titulo: string; texto: string }) => void;
  onApplyEnrichment: (chapterNumber: number, additionText: string) => void;
  onApplyFullBookEnrichment?: (enrichments: Array<{ chapterNumber: number; additionText: string }>) => void;
  onSetBookCover?: (coverDataUrl: string) => void;
  onOpenFullStudio?: () => void;
  onSelectBook?: (book: ReadyBookRecord) => void;
}

export interface ChapterProposal {
  numero: number;
  titulo: string;
  texto: string;
  palavras: number;
  resumo?: string;
  applied?: boolean;
}

interface ChapterEnrichmentItem {
  chapterNumber: number;
  chapterTitle?: string;
  additionText: string;
  rationale: string;
}

interface Message {
  id: string;
  sender: 'agent' | 'user' | 'system';
  timestamp: string;
  text: string;
  configCard?: BookConceptionConfig;
  chapterProposalCard?: ChapterProposal;
  coverImage?: {
    dataUrl: string;
    backCoverUrl?: string;
    wrapUrl?: string;
    rawImageUrl?: string;
    promptUsed: string;
    applied?: boolean;
    activeTab?: 'frente' | 'contracapa' | 'wrap';
  };
  suggestionCard?: {
    chapterNumber: number;
    additionText: string;
    rationale: string;
    applied?: boolean;
  };
  fullBookReviewCard?: {
    summary: string;
    chaptersEnrichment: ChapterEnrichmentItem[];
    applied?: boolean;
  };
}

export const CoAuthorFloatingAssistant: React.FC<CoAuthorFloatingAssistantProps> = ({
  bookState,
  currentConfig,
  onUpdateBookConfig,
  onSaveChapter,
  onApplyEnrichment,
  onApplyFullBookEnrichment,
  onSetBookCover,
  onOpenFullStudio,
  onSelectBook
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('CoAuthor analisando...');
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [readyBooks, setReadyBooks] = useState<ReadyBookRecord[]>([]);
  const [activeBookRecord, setActiveBookRecord] = useState<ReadyBookRecord | null>(null);
  const [showBookSelector, setShowBookSelector] = useState(false);
  const [bookSearchQuery, setBookSearchQuery] = useState('');

  // Carrega livros prontos do banco local
  useEffect(() => {
    let isMounted = true;
    fetchAllReadyBooks().then(books => {
      if (isMounted) setReadyBooks(books);
    }).catch(err => console.warn('Erro ao carregar livros na base:', err));
    return () => { isMounted = false; };
  }, [isOpen]);

  // Se bookState mudar no componente pai e nenhum livro tiver sido selecionado manualmente
  const currentBookTitle = activeBookRecord?.title || bookState?.titulo || currentConfig?.titulo || 'Livro em Produção';
  const currentBookGenre = activeBookRecord?.genre || bookState?.genero || currentConfig?.tema || currentConfig?.genero || 'Geral';
  const currentBookAuthor = activeBookRecord?.author || bookState?.autor || 'Autor';
  const currentBookSubtitle = activeBookRecord?.subtitle || bookState?.subtitulo || currentConfig?.subtitulo || '';
  const currentBookCaps = activeBookRecord?.capitulos || bookState?.capitulos || [];
  const chaptersCount = currentBookCaps.length;
  const isTechnicalBook = inferCoAuthorBookType(currentBookGenre, currentBookTitle) !== 'ficcao';

  // Estado permanente do Enredo / Bíblia da Obra (Âncora Suprema anti-alucinação)
  const [storyArc, setStoryArc] = useState<string>(() => {
    return currentConfig?.premissa?.trim() || bookState?.meta?.sinopse?.trim() || '';
  });

  useEffect(() => {
    if (currentConfig?.premissa && currentConfig.premissa.trim() !== storyArc.trim()) {
      setStoryArc(currentConfig.premissa.trim());
    }
  }, [currentConfig?.premissa]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg_welcome',
      sender: 'agent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: (bookState?.titulo && bookState?.capitulos?.length > 0)
        ? `E aí! Estou com o manuscrito de **"${bookState.titulo}"** aberto aqui na bancada com **todos os ${bookState.capitulos.length} capítulos**. Podemos fazer uma revisão crítica completa de ponta a ponta na obra inteira de uma só vez ou elaborar o fechamento definitivo do livro todo. O que você prefere atacar agora?`
        : `E aí! Bancada editorial pronta. Você pode falar comigo por voz para conversarmos e criarmos seu livro juntos: me conte a ideia da história ou enredo, vamos definir título, subtítulo na Amazon, páginas e capítulos. A cada capítulo que você for autorizando, eu vou salvando no seu livro até o desfecho final e a criação da capa. O que vamos criar hoje?`
    }
  ]);

  const hasWelcomedRef = useRef<string | null>(null);

  // Quando o CoAuthor for aberto e o livro tiver capítulos, apresenta a capacidade de revisar a obra toda
  useEffect(() => {
    if (!isOpen) return;
    const caps = activeBookRecord?.capitulos || bookState?.capitulos || [];
    const bookTitle = activeBookRecord?.title || bookState?.titulo || currentConfig?.titulo || 'Livro em Produção';
    const key = `${bookTitle}_${caps.length}`;

    if (caps.length > 0 && hasWelcomedRef.current !== key) {
      hasWelcomedRef.current = key;
      const totalWords = caps.reduce((acc: number, c: any) => acc + ((c.texto || c.conteudo || '').split(/\s+/).filter(Boolean).length || 0), 0);
      const text = `E aí! Estou com o manuscrito de **"${bookTitle}"** aberto aqui na nossa bancada com **todos os ${caps.length} capítulos** (${totalWords.toLocaleString()} palavras escritas)!\n\nPosso fazer a **Revisão Editorial Global de ponta a ponta na obra inteira de uma só vez**, auditar o ritmo e consistência de todos os capítulos ou elaborar o **Fechamento Definitivo do livro todo** amarrando todas as pontas soltas da trama. O que você prefere atacar agora?`;

      setMessages(prev => {
        // Se a primeira mensagem ainda for a padrão ou vazia, substitui
        if (prev.length <= 1) {
          return [{
            id: `msg_welcome_${Date.now()}`,
            sender: 'agent',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text
          }];
        }
        return prev;
      });
    }
  }, [isOpen, bookState?.titulo, bookState?.capitulos?.length, activeBookRecord?.id]);

  const handleSelectReadyBook = (book: ReadyBookRecord) => {
    setActiveBookRecord(book);
    setSelectedChapter(1);
    setShowBookSelector(false);
    if (onSelectBook) onSelectBook(book);

    const msgLoaded: Message = {
      id: `msg_loaded_${Date.now()}`,
      sender: 'agent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Carreguei a obra **"${book.title}"** aqui na nossa bancada com todos os seus ${book.capitulos.length} capítulos (${book.totalWords.toLocaleString()} palavras no perfil **${book.tipoLivro.toUpperCase()}**).\n\nPosso fazer uma **revisão de ponta a ponta na obra toda de uma vez** ou trabalhar no fechamento global do livro. Me diga como prefere começar!`
    };
    setMessages(prev => [...prev, msgLoaded]);
    coAuthorVoiceService.speak(msgLoaded.text, msgLoaded.id);
  };

  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = coAuthorVoiceService.subscribe((state) => {
      setCurrentlySpeakingId(state.isSpeaking ? state.currentMessageId : null);
    });

    return () => {
      unsubscribe();
      coAuthorVoiceService.stop();
      coAuthorSpeechService.stopListening(false);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      coAuthorVoiceService.stop();
      coAuthorSpeechService.stopListening(false);
    }
  }, [isOpen]);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Mantém scroll estrito dentro do container do chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Extrai resumo de capítulos para dar   // Contexto completo e inabalável da Bíblia da Obra para JAMAIS perder o enredo
  const buildEnredoFullContext = () => {
    const enredoBase = storyArc.trim() || currentConfig?.premissa?.trim() || bookState?.meta?.sinopse?.trim() || '(Enredo sendo delineado pelo autor na conversa)';

    let capsResumo = '';
    if (currentBookCaps.length > 0) {
      capsResumo = currentBookCaps.map((c: any, i: number) => {
        const txt = c.texto || c.conteudo || '';
        const palavras = txt.split(/\s+/).filter(Boolean).length;
        const cleanTitle = cleanChapterTitle(c.titulo || `Capítulo ${i + 1}`);
        const trechoFinal = txt.length > 800 ? txt.slice(-600).replace(/\n+/g, ' ') : txt.replace(/\n+/g, ' ');
        return `• CAPÍTULO ${i + 1}: "${cleanTitle}" (${palavras} palavras)\n  Final/Gancho: "${trechoFinal}"`;
      }).join('\n\n');
    } else {
      capsResumo = 'Nenhum capítulo gravado ainda na obra. Estamos na fase de concepção e escrita inicial.';
    }

    return `━━━ BÍBLIA EDITORIAL E ENREDO INEGOCIÁVEL DA HISTÓRIA ━━━
TÍTULO DA OBRA: "${currentBookTitle}"
SUBTÍTULO: "${currentBookSubtitle || '(Ainda não definido)'}"
GÊNERO: "${currentBookGenre}" (${isTechnicalBook ? 'TÉCNICO / NÃO-FICÇÃO' : 'FICÇÃO / NARRATIVA'})
AUTOR: "${currentBookAuthor}"
META DE CAPÍTULOS: ${currentConfig?.maxCapitulos || 15} capítulos | META DE PÁGINAS: ${currentConfig?.paginasAlvo || 100} páginas

ENREDO PRINCIPAL / ARCO DA HISTÓRIA / TRAMA (ÂNCORA ABSOLUTA - NUNCA ESQUEÇA OU DESVIE):
"${enredoBase}"

ESTADO ATUAL DOS CAPÍTULOS JÁ SALVOS NO LIVRO:
${capsResumo}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  };

  const buildBookFullContext = buildEnredoFullContext;

  // Alternar abas de visualização da capa no chat (Frente / Contracapa / Wrap Aberto KDP)
  const handleToggleCoverTab = (msgId: string, tab: 'frente' | 'contracapa' | 'wrap') => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId && m.coverImage) {
        return {
          ...m,
          coverImage: { ...m.coverImage, activeTab: tab }
        };
      }
      return m;
    }));
  };

  // Download direto do asset da capa gerada
  const handleDownloadCoverAsset = (dataUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Gerador de Capa Autoral com IA via Replicate FLUX.1 + Diagramação Estruturada KDP
  const handleGenerateAuthorCover = async (userPrompt?: string) => {
    setIsLoading(true);
    setLoadingStatus('🎨 CoAuthor estruturando prompt e acionando API do Replicate...');

    const promptUsuario = userPrompt || 'Crie a capa com o Replicate, contracapa e wrap completo KDP.';
    const userMsg: Message = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: promptUsuario
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      // Feedback imediato falado para confirmação instantânea
      coAuthorVoiceService.speak(
        `Gerando a capa frontal, a contracapa e o wrap completo com a API do Replicate para o seu livro.`,
        `status_cover_${Date.now()}`
      );

      const numPags = currentBookCaps.length ? Math.max(24, currentBookCaps.length * 6) : (currentConfig?.paginasAlvo || 100);

      const resultado = await executarPipelineCompletoCapaReplicate({
        titulo: currentBookTitle,
        subtitulo: currentBookSubtitle,
        autor: currentBookAuthor,
        genero: currentBookGenre,
        premissa: storyArc || currentBookTitle,
        customPrompt: userPrompt,
        numeroPaginas: numPags
      });

      // Sincroniza imediatamente com a bancada do estúdio
      if (onSetBookCover && resultado.capaFrontalDataUrl) {
        onSetBookCover(resultado.capaFrontalDataUrl);
      }

      const agentMsg: Message = {
        id: `msg_agent_${Date.now()}`,
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `🎨 **Capa Oficial, Contracapa e Wrap KDP Gerados com Sucesso via Replicate!**\n\nEnviei um prompt artístico em inglês altamente estruturado para a API do Replicate. A diagramação seguiu com rigor a hierarquia editorial:\n• **Título imponente no topo** com tipografia alinhada ao gênero;\n• **Subtítulo posicionado logo acima do nome do autor** na base;\n• **Nome do autor no rodapé** com espaçamento editorial;\n• **Contracapa 6x9** com sinopse, benefícios e código KDP;\n• **Capa Aberta Completa (Wrap)** com lombada proporcional calculada para ${numPags} páginas.\n\nVocê pode alternar entre as 3 visões, baixar os arquivos em alta resolução ou solicitar variações.`,
        coverImage: {
          dataUrl: resultado.capaFrontalDataUrl,
          backCoverUrl: resultado.contracapaDataUrl,
          wrapUrl: resultado.wrapDataUrl,
          rawImageUrl: resultado.fundoImgUrl,
          promptUsed: resultado.promptEstruturado,
          applied: true,
          activeTab: 'frente'
        }
      };

      setMessages(prev => [...prev, agentMsg]);
      coAuthorVoiceService.speak(
        `Sua capa frontal, contracapa e a visão aberta do livro foram geradas com a API do Replicate! O título está em destaque no topo, o subtítulo logo acima do seu nome de autor e o fundo em total harmonia com o livro.`,
        agentMsg.id
      );
    } catch (err: any) {
      console.error('Erro na pipeline Replicate de capas:', err);
      const errM: Message = {
        id: `msg_err_${Date.now()}`,
        sender: 'system',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Erro ao gerar capa com Replicate: ${err.message || 'Verifique a conexão com a API'}.`
      };
      setMessages(prev => [...prev, errM]);
      coAuthorVoiceService.speak(
        `Ocorreu uma instabilidade ao gerar a capa com o Replicate. Por favor, tente novamente em instantes.`,
        errM.id
      );
    } finally {
      setIsLoading(false);
      setLoadingStatus('CoAuthor analisando...');
    }
  };

  // Busca a última proposta de capítulo pendente de aprovação
  const getPendingChapterProposal = (): { card: ChapterProposal; msgId: string } | null => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.chapterProposalCard && !m.chapterProposalCard.applied) {
        return { card: m.chapterProposalCard, msgId: m.id };
      }
    }
    return null;
  };

  // Redige proposta de capítulo garantindo 100% de coerência e fidelidade ao enredo
  const generateChapterProposal = async (
    chapterNum: number,
    orientacaoAutor?: string
  ) => {
    setIsLoading(true);
    setLoadingStatus(`✍️ CoAuthor redigindo proposta do Capítulo ${chapterNum}...`);

    try {
      const maxCaps = currentConfig?.maxCapitulos || 15;
      const isUltimo = chapterNum >= maxCaps;
      const bibliaContext = buildEnredoFullContext();

      // Pega o trecho final do capítulo anterior para continuidade milimétrica
      let ganchoAnterior = '';
      if (chapterNum > 1 && currentBookCaps[chapterNum - 2]) {
        const capAnt = currentBookCaps[chapterNum - 2];
        const txtAnt = capAnt.texto || capAnt.conteudo || '';
        ganchoAnterior = `O Capítulo ${chapterNum - 1} terminou exatamente com o seguinte desfecho:\n"${txtAnt.slice(-1000)}"\nO Capítulo ${chapterNum} DEVE continuar a partir deste exato momento e desenvolver as consequências narrativas.`;
      }

      const systemInstruction = `Você é o parceiro e coautor sênior de escrita do autor para esta obra do Amazon KDP.
${bibliaContext}

REGRA SUPREMA: NUNCA PERCA O ENREDO DA HISTÓRIA. Cada parágrafo deve honrar o enredo acordado e os personagens.
NUNCA mude de tema, nunca invente personagens aleatórios fora do universo da história, nunca resete acontecimentos passados.

DIRETRIZES PARA O CAPÍTULO ${chapterNum} DE ${maxCaps}${isUltimo ? ' (ÚLTIMO CAPÍTULO - DESFECHO DA OBRA)' : ''}:
1. Escreva um capítulo COMPLETO, rico e fluido, com divisão de cenas e ritmo editorial envolvente.
2. TÍTULO DO CAPÍTULO: Crie um título poético, forte ou misterioso (SEM colocar "Capítulo ${chapterNum}:" no título, apenas o nome da cena, ex: "O Sussurro no Nevoeiro").
3. CONTINUIDADE NARRATIVA:
   ${chapterNum === 1 ? '- Primeiro capítulo: Apresente o protagonista, o cenário e o gancho desencadeador sem rodeios.' : '- Continue exatamente onde o capítulo anterior parou.'}
   ${isUltimo ? '- COMO É O ÚLTIMO CAPÍTULO: Amarre todas as pontas soltas, entregue um clímax decisivo e o fechamento memorável da história!' : '- Termine com um gancho forte (cliffhanger) que instigue a leitura do próximo capítulo.'}
4. ESTILO:
   ${isTechnicalBook ? 'LIVRO TÉCNICO: Explicações claras, exemplos de cases reais, passos práticos acionáveis.' : 'FICÇÃO: Descrições sensoriais vivas, tensão psicológica, diálogos naturais e atmosfera cinematográfica.'}
5. NUNCA use frases robóticas ou clichês de IA. Fale de autor para autor.

FORMATO ESTRUTURADO OBRIGATÓRIO:
<<<PROPOSTA_CAPITULO>>>
NUMERO: ${chapterNum}
TITULO: [Título do capítulo]
RESUMO: [Resumo natural e vibrante em 2 frases para ser lido em voz alta]
TEXTO:
[Texto completo e robusto do capítulo com diálogos e parágrafos desenvolvidos]
<<<FIM_PROPOSTA_CAPITULO>>>`;

      const promptText = `━━━ DIRETRIZES DE ESCRITA ━━━
${ganchoAnterior}

ORIENTAÇÃO ATUAL DO AUTOR:
"${orientacaoAutor || `Escreva o Capítulo ${chapterNum} com alta fidelidade ao enredo da história e ritmo envolvente.`}"

Redija o Capítulo ${chapterNum} completo entre as tags:`;

      const res = await chamarGeminiTexto(promptText, {
        systemInstruction,
        temperature: 0.85,
        maxTokens: 4200
      });

      const respostaIA = res?.texto || '';
      const capMatch = respostaIA.match(/<<<PROPOSTA_CAPITULO>>>([\s\S]*?)<<<FIM_PROPOSTA_CAPITULO>>>/);

      if (capMatch) {
        const bloco = capMatch[1];
        const numMatch = bloco.match(/NUMERO:\s*(\d+)/i);
        const titMatch = bloco.match(/TITULO:\s*([^\n]+)/i);
        const resMatch = bloco.match(/RESUMO:\s*([^\n]+)/i);
        const txtMatch = bloco.match(/TEXTO:\s*([\s\S]*)/i);

        const num = numMatch ? parseInt(numMatch[1], 10) : chapterNum;
        const tit = titMatch ? cleanChapterTitle(titMatch[1].trim()) : `Capítulo ${chapterNum}`;
        const resumo = resMatch ? resMatch[1].trim() : `Capítulo ${num} desenvolvido com foco total no enredo.`;
        const textoCap = txtMatch ? txtMatch[1].trim() : bloco.trim();
        const words = textoCap.split(/\s+/).filter(Boolean).length;

        const proposalCard: ChapterProposal = {
          numero: num,
          titulo: tit,
          texto: textoCap,
          palavras: words,
          resumo,
          applied: false
        };

        const falaVoz = isUltimo
          ? `Finalizei a proposta do Capítulo ${num}, "${tit}"! ${resumo} Como este é o último capítulo, se você autorizar, eu gravo o capítulo, encerramos a história do livro e seguimos direto para a criação da Capa Autoral com IA!`
          : `Pronto! Redigi a proposta do Capítulo ${num}, "${tit}"! ${resumo} O que achou? Se você autorizar, eu já salvo no livro e redijo o Capítulo ${num + 1}!`;

        const agentMsg: Message = {
          id: `msg_prop_cap_${num}_${Date.now()}`,
          sender: 'agent',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `Redigi a proposta do **Capítulo ${num}: "${tit}"** (${words.toLocaleString()} palavras).\n\n${resumo}\n\n${isUltimo ? '🏆 **Este é o capítulo final da obra!** Ao autorizar, fechamos a história com chave de ouro e avançamos imediatamente para a criação da Capa Autoral Oficial.' : 'Diga *"pode salvar"* ou clique no botão abaixo para gravarmos no livro e avançarmos para o próximo capítulo!'}`,
          chapterProposalCard: proposalCard
        };

        setMessages(prev => [...prev, agentMsg]);
        coAuthorVoiceService.speak(falaVoz, agentMsg.id);
      } else {
        const agentMsg: Message = {
          id: `msg_agent_${Date.now()}`,
          sender: 'agent',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: respostaIA
        };
        setMessages(prev => [...prev, agentMsg]);
        coAuthorVoiceService.speak(agentMsg.text, agentMsg.id);
      }
    } catch (err: any) {
      const errM: Message = {
        id: `msg_err_${Date.now()}`,
        sender: 'system',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Erro ao formular capítulo: ${err.message || 'Verifique a conexão com a API'}.`
      };
      setMessages(prev => [...prev, errM]);
    } finally {
      setIsLoading(false);
      setLoadingStatus('CoAuthor analisando...');
    }
  };

  // Autorização e gravação de capítulo no livro com transição para próximo capítulo ou capa
  const handleApproveChapterProposal = async (proposal: ChapterProposal, msgId: string) => {
    // 1. Salva no livro oficial
    if (onSaveChapter) {
      onSaveChapter({
        numero: proposal.numero,
        titulo: proposal.titulo,
        texto: proposal.texto
      });
    }

    // 2. Marca proposta como aplicada
    setMessages(prev => prev.map(m => {
      if (m.id === msgId && m.chapterProposalCard) {
        return {
          ...m,
          chapterProposalCard: { ...m.chapterProposalCard, applied: true }
        };
      }
      return m;
    }));

    const maxCaps = currentConfig?.maxCapitulos || 15;
    const isUltimo = proposal.numero >= maxCaps;

    if (isUltimo) {
      // FECHAMENTO DA HISTÓRIA E GERAÇÃO DA CAPA!
      const finishMsg: Message = {
        id: `msg_finish_${Date.now()}`,
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `🎉 **Capítulo ${proposal.numero} ("${proposal.titulo}") autorizado e gravado com sucesso!**\n\nConcluímos oficialmente todos os **${maxCaps} capítulos** do livro **"${currentBookTitle}"**! A história está redonda e completa.\n\nAgora vamos coroar a obra com a **Capa Autoral Oficial** no padrão KDP. Já estou concebendo e pintando a arte da capa com inteligência artificial...`
      };
      setMessages(prev => [...prev, finishMsg]);
      coAuthorVoiceService.speak(
        `Capítulo ${proposal.numero} autorizado e salvo no livro! Parabéns, concluímos oficialmente todos os capítulos da nossa história! O fechamento ficou emocionante. Agora, vou criar a Capa Autoral com inteligência artificial para o nosso livro. Veja a arte sendo gerada na tela!`,
        finishMsg.id
      );

      // Dispara geração da capa com base no enredo
      await handleGenerateAuthorCover(`Capa autoral impressionante e cinematográfica para o livro ${currentBookTitle}, gênero ${currentBookGenre}, inspirada no enredo: ${storyArc.slice(0, 300)}`);
    } else {
      // AVANÇA PARA O PRÓXIMO CAPÍTULO
      const nextNum = proposal.numero + 1;
      const nextMsg: Message = {
        id: `msg_saved_${Date.now()}`,
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `✓ **Capítulo ${proposal.numero} gravado com sucesso no livro!**\n\nSeguindo a linha do enredo, já estou redigindo a proposta do **Capítulo ${nextNum}**...`
      };
      setMessages(prev => [...prev, nextMsg]);
      coAuthorVoiceService.speak(
        `Capítulo ${proposal.numero} gravado com sucesso! Mantendo a linha do nosso enredo, já estou redigindo a proposta do Capítulo ${nextNum}...`,
        nextMsg.id
      );

      await generateChapterProposal(nextNum, `Continuação imediata após o Capítulo ${proposal.numero} ("${proposal.titulo}"). Mantenha a evolução da história e dos personagens.`);
    }
  };

  // 1. REVISÃO DA OBRA INTEIRA DE UMA VEZ PARA TODOS OS CAPÍTULOS
  const handleExecuteFullBookReview = async () => {
    if (currentBookCaps.length === 0) {
      const msgVazio: Message = {
        id: `msg_empty_${Date.now()}`,
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Ainda não temos capítulos gravados no livro para revisar. Vamos começar redigindo o Capítulo 1!`
      };
      setMessages(prev => [...prev, msgVazio]);
      coAuthorVoiceService.speak(msgVazio.text, msgVazio.id);
      return;
    }

    setIsLoading(true);
    setLoadingStatus(`📖 CoAuthor lendo e auditando todos os ${currentBookCaps.length} capítulos de "${currentBookTitle}"...`);

    const userPromptMsg: Message = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Por favor, faça uma revisão editorial global de toda a obra "${currentBookTitle}", analisando todos os ${currentBookCaps.length} capítulos de uma só vez.`
    };
    setMessages(prev => [...prev, userPromptMsg]);

    try {
      const totalWords = currentBookCaps.reduce((acc: number, c: any) => acc + ((c.texto || c.conteudo || '').split(/\s+/).filter(Boolean).length || 0), 0);

      const readyBook: ReadyBookRecord = {
        id: activeBookRecord?.id || `book_${Date.now()}`,
        source: 'project',
        title: currentBookTitle,
        subtitle: currentBookSubtitle,
        author: currentBookAuthor,
        genre: currentBookGenre,
        tipoLivro: inferCoAuthorBookType(currentBookGenre, currentBookTitle),
        chaptersCount: currentBookCaps.length,
        totalWords,
        capitulos: currentBookCaps.map((c: any, i: number) => ({
          numero: i + 1,
          titulo: cleanChapterTitle(c.titulo || `Capítulo ${i + 1}`),
          texto: c.texto || c.conteudo || ''
        })),
        meta: {
          palavrasPorCap: Math.round(totalWords / currentBookCaps.length) || 1200,
          paginasAlvo: currentConfig?.paginasAlvo || Math.max(24, Math.round(totalWords / 250))
        },
        updatedAt: Date.now()
      };

      const reviewResult = await reviewFullBookWithCoAuthor(readyBook, (st: string) => setLoadingStatus(st));

      const agentReply: Message = {
        id: `msg_agent_${Date.now()}`,
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Fiz a auditoria e revisão crítica completa de ponta a ponta em todos os **${currentBookCaps.length} capítulos** de **"${currentBookTitle}"**!\n\n${reviewResult.summary}\n\nIdentifiquei oportunidades para aprofundar a narrativa e fortalecer os capítulos. Abaixo estão os acréscimos editoriais prontos. Você pode aprovar tudo de uma só vez ou verificar capítulo por capítulo:`,
        fullBookReviewCard: {
          summary: reviewResult.summary,
          chaptersEnrichment: reviewResult.chaptersReview.map(cr => ({
            chapterNumber: cr.chapterNumber,
            chapterTitle: cr.chapterTitle,
            rationale: cr.rationale,
            additionText: cr.additionText
          })),
          applied: false
        }
      };

      setMessages(prev => [...prev, agentReply]);
      coAuthorVoiceService.speak(
        `Concluí a revisão editorial completa de todos os ${currentBookCaps.length} capítulos do seu livro! A estrutura está sólida. Formulei propostas de enriquecimento prontas para elevar a qualidade de cada capítulo. Você pode aplicar tudo na obra toda com um único clique ou comando de voz.`,
        agentReply.id
      );
    } catch (err: any) {
      const errorMsg: Message = {
        id: `msg_err_${Date.now()}`,
        sender: 'system',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Erro ao executar a revisão da obra toda: ${err.message || 'Verifique a conexão'}.`
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setLoadingStatus('CoAuthor analisando...');
    }
  };

  // 2. FECHAMENTO DO LIVRO TODO (CLÍMAX, RESOLUÇÃO DE TODAS AS PONTAS E EPÍLOGO)
  const handleExecuteFullBookClosure = async () => {
    if (currentBookCaps.length === 0) {
      const msgVazio: Message = {
        id: `msg_empty_${Date.now()}`,
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Ainda não temos capítulos escritos para realizar o fechamento da obra. Vamos começar com o Capítulo 1!`
      };
      setMessages(prev => [...prev, msgVazio]);
      coAuthorVoiceService.speak(msgVazio.text, msgVazio.id);
      return;
    }

    setIsLoading(true);
    setLoadingStatus(`🏁 CoAuthor analisando todos os ${currentBookCaps.length} capítulos para criar o Fechamento Definitivo do Livro Todo...`);

    const userPromptMsg: Message = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Elabore o fechamento completo e definitivo do livro todo, amarrando os arcos e mistérios de todos os ${currentBookCaps.length} capítulos.`
    };
    setMessages(prev => [...prev, userPromptMsg]);

    try {
      const bibliaEnredo = buildEnredoFullContext();
      const capFinalNum = currentBookCaps.length + 1;

      const systemInstruction = `Você é um editor sênior e mestre de narrativa para o Amazon KDP.
Obra: "${currentBookTitle}" | Gênero: "${currentBookGenre}" | Tipo: ${isTechnicalBook ? 'TÉCNICO / NÃO-FICÇÃO' : 'FICÇÃO / NARRATIVA'}
${bibliaEnredo}

SUA MISSÃO EXCLUSIVA:
Criar o FECHAMENTO DEFINITIVO DO LIVRO TODO!
1. Analise o arco geral desenvolvido desde o Capítulo 1 até o Capítulo ${currentBookCaps.length}.
2. Amarre todas as pontas soltas da trama, mistérios, motivações e conflitos.
3. ${isTechnicalBook
  ? 'Crie o fechamento com um Framework Integrado Definitivo, plano de ação mestre do leitor, próximos passos na carreira e mensagem inspiradora de encerramento.'
  : 'Crie o clímax decisivo e o epílogo arrebatador que conclui com maestria os destinos dos personagens e deixa uma marca inesquecível no leitor.'}

FORMATO ESTRUTURADO OBRIGATÓRIO:
<<<PROPOSTA_CAPITULO>>>
NUMERO: ${capFinalNum}
TITULO: [Título impactante para o Fechamento / Epílogo Final da Obra]
RESUMO: [Resumo de como este fechamento amarra todos os arcos do livro todo]
TEXTO:
[Texto completo, emocionante e definitivo do fechamento da obra]
<<<FIM_PROPOSTA_CAPITULO>>>`;

      const promptText = `Crie agora o FECHAMENTO DEFINITIVO DA HISTÓRIA DE PONTA A PONTA, conectando todos os ${currentBookCaps.length} capítulos da obra:`;

      const res = await chamarGeminiTexto(promptText, {
        systemInstruction,
        temperature: 0.8,
        maxTokens: 4800
      });

      const respostaIA = res?.texto || '';
      const capMatch = respostaIA.match(/<<<PROPOSTA_CAPITULO>>>([\s\S]*?)<<<FIM_PROPOSTA_CAPITULO>>>/);

      if (capMatch) {
        const bloco = capMatch[1];
        const numMatch = bloco.match(/NUMERO:\s*(\d+)/i);
        const titMatch = bloco.match(/TITULO:\s*([^\n]+)/i);
        const resMatch = bloco.match(/RESUMO:\s*([\s\S]*?)(?=TEXTO:)/i);
        const txtMatch = bloco.match(/TEXTO:\s*([\s\S]*)/i);

        const num = numMatch ? parseInt(numMatch[1], 10) : capFinalNum;
        const tit = titMatch ? cleanChapterTitle(titMatch[1].trim()) : 'Fechamento Definitivo & Epílogo';
        const resumo = resMatch ? resMatch[1].trim() : 'Fechamento definitivo da obra inteira, amarrando todos os arcos da história.';
        const textoCap = txtMatch ? txtMatch[1].trim() : bloco.trim();
        const words = textoCap.split(/\s+/).filter(Boolean).length;

        const proposalCard: ChapterProposal = {
          numero: num,
          titulo: tit,
          texto: textoCap,
          palavras: words,
          resumo,
          applied: false
        };

        const agentMsg: Message = {
          id: `msg_closure_${Date.now()}`,
          sender: 'agent',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `🏁 **Fechamento Global da Obra Completa Pronto!**\n\nAnalisei os **${currentBookCaps.length} capítulos** anteriores e compus o desfecho definitivo: **"${tit}"** (${words.toLocaleString()} palavras).\n\n${resumo}\n\nVocê pode autorizar e salvar como o capítulo de conclusão definitiva da obra abaixo:`,
          chapterProposalCard: proposalCard
        };

        setMessages(prev => [...prev, agentMsg]);
        coAuthorVoiceService.speak(
          `Criei o Fechamento Definitivo do livro todo! Analisei todos os ${currentBookCaps.length} capítulos e amarrei as pontas soltas da história no clímax final "${tit}". Se você aprovar, já gravamos no livro e finalizamos a história com chave de ouro!`,
          agentMsg.id
        );
      } else {
        const agentMsg: Message = {
          id: `msg_agent_${Date.now()}`,
          sender: 'agent',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: respostaIA
        };
        setMessages(prev => [...prev, agentMsg]);
        coAuthorVoiceService.speak(agentMsg.text, agentMsg.id);
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: `msg_err_${Date.now()}`,
        sender: 'system',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Erro ao criar o fechamento do livro: ${err.message || 'Verifique a conexão'}.`
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setLoadingStatus('CoAuthor analisando...');
    }
  };

  const handleSendMessage = async (
    userPrompt?: string,
    actionType?: 'enredo-global' | 'fechamento' | 'profundidade' | 'capa' | 'acrescimo-capitulo'
  ) => {
    const textToSend = userPrompt || inputText.trim();
    if (!textToSend && !actionType) return;

    // Desvio prioritário para Revisão da Obra Inteira de Uma Vez
    if (actionType === 'enredo-global' || /revisar obra|revisar tudo|revisar todos|revisar o livro|revisar obra inteira|revisar a obra|revisar todos os cap|auditar obra|auditoria/i.test(textToSend)) {
      if (!userPrompt) setInputText('');
      await handleExecuteFullBookReview();
      return;
    }

    // Desvio prioritário para Fechamento do Livro Todo
    if (actionType === 'fechamento' || /fechamento|fechar o livro|fechar a hist[oó]ria|desfecho da obra|concluir o livro|cl[ií]max final|ep[ií]logo/i.test(textToSend)) {
      if (!userPrompt) setInputText('');
      await handleExecuteFullBookClosure();
      return;
    }

    // Desvio prioritário para Geração de Capa via Replicate FLUX.1 (Capa Frontal, Contracapa e Wrap KDP)
    if (
      actionType === 'capa' ||
      /replicate|gerar capa|criar capa|fazer capa|fa[çc]a a capa|crie a capa|gerar a capa|capa oficial|capa e contracapa|duas capas|contracapa|wrap completo|wrap kdp|capa do livro|capa autoral|mudar capa|nova capa|desenhar capa/i.test(
        textToSend
      )
    ) {
      if (!userPrompt) setInputText('');
      await handleGenerateAuthorCover(textToSend);
      return;
    }

    if (!userPrompt) {
      setInputText('');
    }

    const userMsg: Message = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: textToSend
    };

    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    setIsLoading(true);

    try {
      // 1. VERIFICA SE HÁ PROPOSTA DE CAPÍTULO PENDENTE DE APROVAÇÃO
      const pendingProposal = getPendingChapterProposal();

      if (pendingProposal) {
        // Se o usuário falou palavras de aprovação / autorização
        const isApproval = /pode salvar|salva|salvar|autoriz|aprov|gostei|ficou [oó]timo|est[aá] [oó]timo|perfeito|excelente|vamos em frente|pr[oó]ximo|avan[çc]ar|continua|vamos pro pr[oó]ximo|manda o pr[oó]ximo|pode ir|manda bala|t[aá] aprovado|seguir|segue|bora/i.test(textToSend);
        if (isApproval) {
          setIsLoading(false);
          await handleApproveChapterProposal(pendingProposal.card, pendingProposal.msgId);
          return;
        }

        // Se o usuário pediu ajustes no capítulo
        const isAdjustment = /muda|ajust|refin|reescrev|alter|coloqu|adicione|retire|troqu|fa[çc]a mais|menos|diferente|queria que/i.test(textToSend);
        if (isAdjustment) {
          setIsLoading(false);
          await generateChapterProposal(pendingProposal.card.numero, `O autor solicitou os seguintes ajustes no Capítulo ${pendingProposal.card.numero}:\n"${textToSend}"\nReescreva mantendo a fidelidade absoluta ao enredo principal.`);
          return;
        }
      }

      // 2. INICIAR A HISTÓRIA / ESCREVER CAPÍTULO 1 OU PRÓXIMO
      const isStartStory = /come[çc]ar a hist[oó]ria|escrever a hist[oó]ria|iniciar a hist[oó]ria|cap[ií]tulo 1|primeiro cap|vamos come[çc]ar|bora come[çc]ar|escrever o livro|comece o livro|criar o cap|redigir o cap|escrever o cap|pr[oó]ximo cap|bora pro cap/i.test(textToSend);
      if (isStartStory) {
        setIsLoading(false);
        const targetCap = currentBookCaps.length + 1;
        await generateChapterProposal(targetCap, textToSend);
        return;
      }

      // 4. MODO CENTRAL: DIÁLOGO SOBRE O ENREDO DA HISTÓRIA, PERSONAGENS E CONCEPÇÃO
      setLoadingStatus('📖 CoAuthor alinhando o enredo da história com você...');

      let amazonLiveContext = '';
      const isAskingSubtitleOrAmazon = /subt[ií]tulo|amazon|busca|pesquisa|sugir|sugest/i.test(textToSend);
      if (isAskingSubtitleOrAmazon) {
        try {
          setLoadingStatus('🔎 CoAuthor consultando a barra de busca da Amazon KDP...');
          const seedQuery = currentConfig?.titulo || currentConfig?.tema || textToSend.replace(/subt[ií]tulo|amazon|busca|pesquisa|sugir|sugest|para|o|livro|de/gi, ' ').trim() || 'autoajuda';
          const cleanSeed = seedQuery.split(/[:\-\–]/)[0].trim().slice(0, 25);
          const suggestions = await AmazonLiveService.getLiveSuggestions(cleanSeed, 'br');
          if (suggestions && suggestions.length > 0) {
            amazonLiveContext = `\nTERMOS REAIS DA BUSCA DA AMAZON KDP (AUTOCOMPLETE AO VIVO):\n${suggestions.slice(0, 8).map(s => `- "${s}"`).join('\n')}\n`;
          }
        } catch (err) {
          console.warn('Erro ao consultar Amazon live suggestions:', err);
        }
      }

      const bibliaEnredo = buildEnredoFullContext();
      const historicoRecente = nextMsgs.slice(-6).map(m => {
        const tag = m.sender === 'user' ? 'AUTOR' : (m.sender === 'agent' ? 'COAUTHOR' : 'SISTEMA');
        return `${tag}: ${m.text}`;
      }).join('\n\n');

      const systemInstruction = `Você é o parceiro e coautor humano experiente de escrita para Amazon KDP.
${bibliaEnredo}
${amazonLiveContext}

REGRAS INEGOCIÁVEIS:
1. O ENREDO DA HISTÓRIA É A ÂNCORA SUPREMA: NUNCA perca o enredo, nunca mude de assunto, nunca alucine temas aleatórios fora da conversa do autor.
2. Fale de forma acolhedora, objetiva e madura, de autor para autor. NUNCA use clichês robóticos de IA.
3. Se o autor estiver contando ou ajustando a história/personagens/cenário:
   - Responda sobre a história dele com entusiasmo e perspicácia editorial.
   - Mostre como essa ideia fortalece a trama e amarre com o enredo já definido.
   - Ao final, convide-o a redigir o Capítulo 1!
4. Se o autor perguntar sobre subtítulo ou busca da Amazon:
   - Proponha um subtítulo comercial magnético alinhado com o enredo e os termos reais da Amazon.
5. SEMPRE QUE O ENREDO OU CONFIGURAÇÕES FOREM DEFINIDOS OU AJUSTADOS NA CONVERSA:
   Inclua no final da resposta o bloco para atualizar a Bíblia da Obra:
<<<ATUALIZACAO_ENREDO>>>
ENREDO: [Enredo / premissa consolidada da história]
TITULO: [Título da obra]
SUBTITULO: [Subtítulo comercial se houver]
TEMA: [Tema dentre as opções da plataforma]
CAPITULOS: [Número de capítulos, ex: 12]
PAGINAS: [Número de páginas alvo, ex: 100]
<<<FIM_ATUALIZACAO_ENREDO>>>`;

      const promptText = `━━━ HISTÓRICO RECENTE DO DIÁLOGO ━━━
${historicoRecente}

━━━ FALA ATUAL DO AUTOR ━━━
"${textToSend}"

Responda em tom conversacional para áudio mantendo foco 100% no enredo:`;

      const resultadoIA = await chamarGeminiTexto(promptText, {
        systemInstruction,
        temperature: 0.8,
        maxTokens: 2500
      });

      const respostaIA = resultadoIA?.texto || '';
      let cleanText = respostaIA;
      let configCardData: BookConceptionConfig | undefined = undefined;

      const enredoMatch = respostaIA.match(/<<<ATUALIZACAO_ENREDO>>>([\s\S]*?)<<<FIM_ATUALIZACAO_ENREDO>>>/);
      if (enredoMatch) {
        const bloco = enredoMatch[1];
        const enrM = bloco.match(/ENREDO:\s*([\s\S]*?)(?=\n[A-Z]+:|$)/i);
        const titM = bloco.match(/TITULO:\s*([^\n]+)/i);
        const subM = bloco.match(/SUBTITULO:\s*([^\n]+)/i);
        const temM = bloco.match(/TEMA:\s*([^\n]+)/i);
        const capM = bloco.match(/CAPITULOS:\s*(\d+)/i);
        const pagM = bloco.match(/PAGINAS:\s*(\d+)/i);

        const applied: BookConceptionConfig = {};
        if (enrM && enrM[1].trim() && !/não definido/i.test(enrM[1])) {
          const novoEnredo = enrM[1].trim();
          applied.premissa = novoEnredo;
          setStoryArc(novoEnredo);
        }
        if (titM && titM[1].trim() && !/mantido|não definido/i.test(titM[1])) applied.titulo = titM[1].trim();
        if (subM && subM[1].trim() && !/não definido/i.test(subM[1])) applied.subtitulo = subM[1].trim();
        if (temM && temM[1].trim() && !/não definido/i.test(temM[1])) applied.tema = temM[1].trim();
        if (capM && parseInt(capM[1], 10) > 0) applied.maxCapitulos = parseInt(capM[1], 10);
        if (pagM && parseInt(pagM[1], 10) > 0) applied.paginasAlvo = parseInt(pagM[1], 10);

        if (Object.keys(applied).length > 0) {
          configCardData = applied;
          if (onUpdateBookConfig) onUpdateBookConfig(applied);
        }

        cleanText = respostaIA.replace(/<<<ATUALIZACAO_ENREDO>>>[\s\S]*?<<<FIM_ATUALIZACAO_ENREDO>>>/, '').trim();
      }

      const agentMsg: Message = {
        id: `msg_agent_${Date.now()}`,
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: cleanText,
        configCard: configCardData
      };

      setMessages(prev => [...prev, agentMsg]);
      coAuthorVoiceService.speak(agentMsg.text, agentMsg.id);
    } catch (err: any) {
      const errorMsg: Message = {
        id: `msg_err_${Date.now()}`,
        sender: 'system',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Erro na resposta do CoAuthor: ${err.message || 'Verifique a conexão com a API'}.`
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setLoadingStatus('CoAuthor analisando...');
    }
  };

  // Aplicação de sugestão pontual
  const handleApplyCardEnrichment = async (card: NonNullable<Message['suggestionCard']>, msgId: string) => {
    onApplyEnrichment(card.chapterNumber, card.additionText);

    // Se estiver com livro da base ativo, atualiza o capítulo e salva no banco local
    if (activeBookRecord && activeBookRecord.capitulos[card.chapterNumber - 1]) {
      const cap = activeBookRecord.capitulos[card.chapterNumber - 1];
      cap.texto = `${cap.texto}\n\n${card.additionText}`.trim();
      try {
        await saveUpdatedBookToDb(activeBookRecord);
      } catch (err) {
        console.warn('Erro ao salvar livro da base:', err);
      }
    }

    setMessages(prev => prev.map(m => {
      if (m.id === msgId && m.suggestionCard) {
        return {
          ...m,
          suggestionCard: { ...m.suggestionCard, applied: true }
        };
      }
      return m;
    }));

    const feedbackMsg: Message = {
      id: `msg_applied_${Date.now()}`,
      sender: 'system',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `✓ Acréscimo aprovado com sucesso! O novo trecho foi incorporado ao Capítulo ${card.chapterNumber} e salvo na obra.`
    };
    setMessages(prev => [...prev, feedbackMsg]);
  };

  // Aplicação de enriquecimento em lote para a obra toda de uma só vez
  const handleApplyFullBookEnrichment = async (fullCard: NonNullable<Message['fullBookReviewCard']>, msgId: string) => {
    if (onApplyFullBookEnrichment) {
      onApplyFullBookEnrichment(fullCard.chaptersEnrichment.map(c => ({
        chapterNumber: c.chapterNumber,
        additionText: c.additionText
      })));
    } else {
      // Fallback: aplica capítulo a capítulo
      fullCard.chaptersEnrichment.forEach(c => {
        onApplyEnrichment(c.chapterNumber, c.additionText);
      });
    }

    // Se estiver com livro da base ativo, atualiza todos os capítulos e salva no banco local
    if (activeBookRecord) {
      fullCard.chaptersEnrichment.forEach(c => {
        if (activeBookRecord.capitulos[c.chapterNumber - 1]) {
          const cap = activeBookRecord.capitulos[c.chapterNumber - 1];
          cap.texto = `${cap.texto}\n\n${c.additionText}`.trim();
        }
      });
      try {
        await saveUpdatedBookToDb(activeBookRecord);
      } catch (err) {
        console.warn('Erro ao salvar livro atualizado no banco:', err);
      }
    }

    setMessages(prev => prev.map(m => {
      if (m.id === msgId && m.fullBookReviewCard) {
        return {
          ...m,
          fullBookReviewCard: { ...m.fullBookReviewCard, applied: true }
        };
      }
      return m;
    }));

    const feedbackMsg: Message = {
      id: `msg_applied_full_${Date.now()}`,
      sender: 'system',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `✓ Revisão Global aprovada! ${fullCard.chaptersEnrichment.length} capítulos foram enriquecidos e integrados à obra de uma vez só.`
    };
    setMessages(prev => [...prev, feedbackMsg]);
  };

  // Incorporar Capa gerada pelo CoAuthor no Livro
  const handleApplyCoverToBook = (coverImg: NonNullable<Message['coverImage']>, msgId: string) => {
    if (onSetBookCover) {
      onSetBookCover(coverImg.dataUrl);
    }

    setMessages(prev => prev.map(m => {
      if (m.id === msgId && m.coverImage) {
        return {
          ...m,
          coverImage: { ...m.coverImage, applied: true }
        };
      }
      return m;
    }));

    const feedbackMsg: Message = {
      id: `msg_cover_applied_${Date.now()}`,
      sender: 'system',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `🌟 Capa Autoral incorporada com sucesso ao seu livro! Você já pode visualizá-la no painel de capas e ajustar os títulos sobre ela.`
    };
    setMessages(prev => [...prev, feedbackMsg]);
  };

  return (
    <>
      {/* BOTÃO FLUTUANTE FIXO NO RODAPÉ DA TELA */}
      {!isOpen && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 20px',
              borderRadius: 30,
              background: 'linear-gradient(135deg, #0f172a, #1e293b)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            title="Abrir Agente CoAuthor Editorial para analisar a obra e criar capas autorais"
          >
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(56, 189, 248, 0.5)'
            }}>
              <Bot size={16} color="#ffffff" />
            </div>
            <span>Agente CoAuthor</span>
            {chaptersCount > 0 && (
              <span style={{
                background: '#059669',
                color: '#ffffff',
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 12,
                fontWeight: 800,
                letterSpacing: '0.3px'
              }}>
                {chaptersCount} Caps
              </span>
            )}
          </button>
        </div>
      )}

      {/* JANELA DE CHAT DO COAUTHOR (DOCK FLUTUANTE EXPANSÍVEL) */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          right: 24,
          width: 520,
          maxWidth: 'calc(100vw - 32px)',
          height: isMinimized ? 56 : 670,
          maxHeight: 'calc(100vh - 40px)',
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.08)',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'height 0.25s ease'
        }}>
          {/* CABEÇALHO DO COAUTHOR */}
          <div style={{
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            color: '#ffffff',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={16} color="#ffffff" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                  CoAuthor Editorial
                  <span style={{ fontSize: 9, background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '2px 6px', borderRadius: 10 }}>
                    IA KDP PRO
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentBookTitle} ({chaptersCount} caps)
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* BOTÃO PARA ACESSAR BASE DE LIVROS JÁ PRONTOS */}
              <button
                type="button"
                onClick={() => setShowBookSelector(!showBookSelector)}
                style={{
                  background: showBookSelector ? '#0284c7' : 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#ffffff',
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: '4px 9px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5
                }}
                title="Puxar qualquer livro já pronto da base para interagir e revisar"
              >
                <BookOpen size={12} />
                <span>Base ({readyBooks.length})</span>
              </button>

              {/* TOGGLE DE VOZ FEMININA DO COAUTHOR */}
              <CoAuthorVoiceToggle compact />

              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center'
                }}
                title={isMinimized ? 'Expandir' : 'Minimizar'}
              >
                <Minimize2 size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  coAuthorVoiceService.stop();
                  coAuthorSpeechService.stopListening(false);
                  setIsOpen(false);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Fechar Chat"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* GAVETA DE LIVROS PRONTOS DA BASE (SELECIONAR E INTERAGIR COM QUALQUER LIVRO) */}
              {showBookSelector && (
                <div style={{
                  background: '#0f172a',
                  borderBottom: '2px solid #0284c7',
                  padding: '12px 14px',
                  color: '#ffffff',
                  maxHeight: 280,
                  overflowY: 'auto'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <BookOpen size={13} /> Livros Prontos na Base ({readyBooks.length})
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowBookSelector(false)}
                      style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 11 }}
                    >
                      ✕ Fechar
                    </button>
                  </div>

                  <input
                    type="text"
                    value={bookSearchQuery}
                    onChange={(e) => setBookSearchQuery(e.target.value)}
                    placeholder="Buscar livro por título ou gênero..."
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: 6,
                      color: '#ffffff',
                      fontSize: 11,
                      marginBottom: 8
                    }}
                  />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {readyBooks
                      .filter(b => !bookSearchQuery.trim() || b.title.toLowerCase().includes(bookSearchQuery.toLowerCase()) || b.genre.toLowerCase().includes(bookSearchQuery.toLowerCase()))
                      .map(b => (
                        <div
                          key={b.id}
                          onClick={() => handleSelectReadyBook(b)}
                          style={{
                            background: activeBookRecord?.id === b.id ? '#1e3a8a' : '#1e293b',
                            border: activeBookRecord?.id === b.id ? '1px solid #38bdf8' : '1px solid #334155',
                            borderRadius: 6,
                            padding: '8px 10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                            {b.coverDataUrl ? (
                              <img src={b.coverDataUrl} alt={b.title} style={{ width: 24, height: 32, objectFit: 'cover', borderRadius: 3 }} />
                            ) : (
                              <div style={{ width: 24, height: 32, background: '#334155', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <BookOpen size={12} color="#94a3b8" />
                              </div>
                            )}
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {b.title}
                              </div>
                              <div style={{ fontSize: 9.5, color: '#94a3b8' }}>
                                {b.chaptersCount} caps • {b.totalWords.toLocaleString()} palavras • {b.genre}
                              </div>
                            </div>
                          </div>

                          <span style={{
                            fontSize: 9,
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: b.tipoLivro === 'tecnico' ? '#0284c7' : b.tipoLivro === 'autoajuda' ? '#059669' : '#d97706',
                            color: '#ffffff',
                            whiteSpace: 'nowrap'
                          }}>
                            {b.tipoLivro.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    {readyBooks.length === 0 && (
                      <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', padding: 12 }}>
                        Nenhum livro finalizado encontrado no banco local ainda.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* BARRA DE AÇÕES EDITORIAIS RÁPIDAS (OBRA TODA DE UMA VEZ E CAPA AUTORAL) */}
              <div style={{
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Layers size={13} color="#0284c7" /> Ações na Obra ({isTechnicalBook ? 'Técnico' : 'Ficção'}):
                  </span>
                  {chaptersCount > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 10, color: '#64748b' }}>Foco:</span>
                      <select
                        value={selectedChapter}
                        onChange={(e) => setSelectedChapter(Number(e.target.value))}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#0f172a'
                        }}
                      >
                        {Array.from({ length: chaptersCount }, (_, i) => i + 1).map((num) => (
                          <option key={num} value={num}>Cap. {num}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                  <button
                    type="button"
                    onClick={() => handleSendMessage(`Escreva a proposta do Capítulo ${chaptersCount + 1} para o nosso livro, desenvolvendo o enredo acordado com alta imersão.`)}
                    disabled={isLoading}
                    style={{
                      padding: '6px 11px',
                      borderRadius: 6,
                      background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                      border: 'none',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#ffffff',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      boxShadow: '0 1px 3px rgba(2, 132, 199, 0.3)'
                    }}
                  >
                    ✍️ {chaptersCount === 0 ? 'Escrever Capítulo 1' : `Escrever Capítulo ${chaptersCount + 1}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExecuteFullBookReview()}
                    disabled={isLoading || chaptersCount === 0}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      background: chaptersCount > 0 ? 'linear-gradient(135deg, #0284c7, #0369a1)' : '#ffffff',
                      border: chaptersCount > 0 ? 'none' : '1.5px solid #cbd5e1',
                      fontSize: 11,
                      fontWeight: 800,
                      color: chaptersCount > 0 ? '#ffffff' : '#94a3b8',
                      cursor: isLoading || chaptersCount === 0 ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      boxShadow: chaptersCount > 0 ? '0 1px 4px rgba(2, 132, 199, 0.35)' : 'none'
                    }}
                    title="Analisa todos os capítulos da obra de uma só vez com plano de enriquecimento editorial completo"
                  >
                    📖 Revisar Obra Inteira {chaptersCount > 0 ? `(${chaptersCount} Caps)` : 'de Uma Vez'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExecuteFullBookClosure()}
                    disabled={isLoading || chaptersCount === 0}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      background: chaptersCount > 0 ? 'linear-gradient(135deg, #059669, #047857)' : '#ffffff',
                      border: chaptersCount > 0 ? 'none' : '1px solid #cbd5e1',
                      fontSize: 11,
                      fontWeight: 800,
                      color: chaptersCount > 0 ? '#ffffff' : '#94a3b8',
                      cursor: isLoading || chaptersCount === 0 ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      boxShadow: chaptersCount > 0 ? '0 1px 4px rgba(5, 150, 105, 0.35)' : 'none'
                    }}
                    title="Analisa toda a obra para criar o fechamento épico definitivo, amarrando todos os arcos e mistérios"
                  >
                    🏁 Fechamento do Livro Todo
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendMessage(
                      isTechnicalBook
                        ? 'Enriqueça o conteúdo técnico desta obra: aprofunde a didática, adicione exemplos reais do mundo real, frameworks práticos de execução, resolução de problemas comuns e checklists práticos sem jargões vazios.'
                        : 'Aprofunde a história e os detalhes deste livro: aumente a imersão sensorial, aprofunde a psicologia e os dilemas dos personagens, enriqueça os diálogos tornando-os vivos e naturais e intensifique a carga dramática da narrativa.',
                      'profundidade'
                    )}
                    disabled={isLoading}
                    style={{
                      padding: '6px 11px',
                      borderRadius: 6,
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#334155',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    {isTechnicalBook ? '⚙️ Enriquecer Técnico' : '✨ Enriquecer História'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGenerateAuthorCover()}
                    disabled={isLoading}
                    style={{
                      padding: '6px 11px',
                      borderRadius: 6,
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      border: 'none',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#ffffff',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      boxShadow: '0 2px 4px rgba(217, 119, 6, 0.25)'
                    }}
                  >
                    🎨 Capa Autoral com IA
                  </button>
                </div>
              </div>

              {/* ÁREA DE MENSAGENS DO CHAT (ROLA APENAS DENTRO DO CHAT) */}
              <div
                ref={chatContainerRef}
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  background: '#f8fafc'
                }}
              >
                {messages.map((msg) => {
                  const isAgent = msg.sender === 'agent';
                  const isSystem = msg.sender === 'system';

                  if (isSystem) {
                    return (
                      <div
                        key={msg.id}
                        style={{
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          borderRadius: 8,
                          padding: '8px 12px',
                          fontSize: 11,
                          color: '#065f46',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <CheckCircle2 size={14} color="#059669" />
                        <span>{msg.text}</span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isAgent ? 'flex-start' : 'flex-end',
                        gap: 4
                      }}
                    >
                      <div style={{
                        maxWidth: '92%',
                        padding: '12px 14px',
                        borderRadius: isAgent ? '12px 12px 12px 2px' : '12px 12px 2px 12px',
                        background: isAgent ? '#ffffff' : '#0284c7',
                        color: isAgent ? '#1e293b' : '#ffffff',
                        fontSize: 12,
                        lineHeight: 1.55,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        border: isAgent ? '1px solid #e2e8f0' : 'none',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {msg.text}

                        {/* SUÍTE COMPLETA DE CAPAS KDP VIA REPLICATE (FRENTE, CONTRACAPA E WRAP ABERTO) */}
                        {msg.coverImage && (
                          <div style={{
                            marginTop: 12,
                            padding: 12,
                            borderRadius: 12,
                            background: '#0f172a',
                            border: '1.5px solid #1e293b',
                            color: '#ffffff',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                          }}>
                            {/* CABEÇALHO DO CARD DE CAPAS REPLICATE */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Palette size={14} color="#38bdf8" />
                                Suíte de Capas KDP • Replicate FLUX.1
                              </span>
                              {msg.coverImage.applied ? (
                                <span style={{ background: '#059669', color: '#ffffff', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                                  ✓ Incorporada ao Livro
                                </span>
                              ) : (
                                <span style={{ background: '#f59e0b', color: '#000000', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 800 }}>
                                  Pronta para Incorporar
                                </span>
                              )}
                            </div>

                            {/* SELETOR DE ABAS DAS CAPAS (FRENTE / CONTRACAPA / WRAP ABERTO) */}
                            <div style={{
                              display: 'flex',
                              gap: 6,
                              marginBottom: 10,
                              background: '#1e293b',
                              padding: 4,
                              borderRadius: 8
                            }}>
                              <button
                                type="button"
                                onClick={() => handleToggleCoverTab(msg.id, 'frente')}
                                style={{
                                  flex: 1,
                                  padding: '6px 8px',
                                  borderRadius: 6,
                                  border: 'none',
                                  background: (msg.coverImage.activeTab || 'frente') === 'frente' ? '#0284c7' : 'transparent',
                                  color: (msg.coverImage.activeTab || 'frente') === 'frente' ? '#ffffff' : '#94a3b8',
                                  fontSize: 10,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                📕 Capa Frontal
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleCoverTab(msg.id, 'contracapa')}
                                style={{
                                  flex: 1,
                                  padding: '6px 8px',
                                  borderRadius: 6,
                                  border: 'none',
                                  background: msg.coverImage.activeTab === 'contracapa' ? '#0284c7' : 'transparent',
                                  color: msg.coverImage.activeTab === 'contracapa' ? '#ffffff' : '#94a3b8',
                                  fontSize: 10,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                📄 Contracapa
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleCoverTab(msg.id, 'wrap')}
                                style={{
                                  flex: 1,
                                  padding: '6px 8px',
                                  borderRadius: 6,
                                  border: 'none',
                                  background: msg.coverImage.activeTab === 'wrap' ? '#0284c7' : 'transparent',
                                  color: msg.coverImage.activeTab === 'wrap' ? '#ffffff' : '#94a3b8',
                                  fontSize: 10,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                📖 Capa Aberta (Wrap)
                              </button>
                            </div>

                            {/* VISUALIZADOR DA CAPA SELECIONADA */}
                            {(() => {
                              const activeTab = msg.coverImage.activeTab || 'frente';
                              const currentDataUrl =
                                activeTab === 'contracapa'
                                  ? (msg.coverImage.backCoverUrl || msg.coverImage.dataUrl)
                                  : activeTab === 'wrap'
                                  ? (msg.coverImage.wrapUrl || msg.coverImage.dataUrl)
                                  : msg.coverImage.dataUrl;

                              const assetFilename =
                                activeTab === 'contracapa'
                                  ? `${currentBookTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_contracapa_kdp.png`
                                  : activeTab === 'wrap'
                                  ? `${currentBookTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_wrap_aberto_kdp.png`
                                  : `${currentBookTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_capa_frontal_kdp.png`;

                              return (
                                <>
                                  <div style={{
                                    position: 'relative',
                                    borderRadius: 8,
                                    overflow: 'hidden',
                                    background: '#020617',
                                    marginBottom: 10,
                                    border: '1px solid #334155',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    padding: activeTab === 'wrap' ? 8 : 4
                                  }}>
                                    <img
                                      src={currentDataUrl}
                                      alt={activeTab}
                                      style={{
                                        width: '100%',
                                        maxHeight: activeTab === 'wrap' ? 240 : 340,
                                        objectFit: 'contain',
                                        display: 'block'
                                      }}
                                    />
                                  </div>

                                  {/* PROMPT ESTRUTURADO ENVIADO AO REPLICATE */}
                                  {msg.coverImage.promptUsed && (
                                    <details style={{
                                      marginBottom: 10,
                                      background: '#090d16',
                                      borderRadius: 6,
                                      border: '1px solid #1e293b',
                                      fontSize: 10
                                    }}>
                                      <summary style={{
                                        padding: '6px 10px',
                                        cursor: 'pointer',
                                        color: '#38bdf8',
                                        fontWeight: 700,
                                        userSelect: 'none'
                                      }}>
                                        🔍 Ver Prompt Estruturado Replicate (Inglês)
                                      </summary>
                                      <div style={{
                                        padding: '8px 10px',
                                        borderTop: '1px solid #1e293b',
                                        color: '#cbd5e1',
                                        fontFamily: 'monospace',
                                        fontSize: 9.5,
                                        lineHeight: 1.45,
                                        whiteSpace: 'pre-wrap',
                                        maxHeight: 110,
                                        overflowY: 'auto'
                                      }}>
                                        {msg.coverImage.promptUsed}
                                      </div>
                                    </details>
                                  )}

                                  {/* BOTÕES DE AÇÃO (DOWNLOAD, INCORPORAR, NOVA VARIAÇÃO) */}
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadCoverAsset(currentDataUrl, assetFilename)}
                                      style={{
                                        flex: 1,
                                        minWidth: 120,
                                        padding: '7px 10px',
                                        borderRadius: 6,
                                        background: '#1e293b',
                                        border: '1px solid #475569',
                                        color: '#f8fafc',
                                        fontSize: 10.5,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 5
                                      }}
                                      title="Baixar imagem atual em alta resolução PNG"
                                    >
                                      <Download size={13} /> Baixar {activeTab === 'wrap' ? 'Wrap' : activeTab === 'contracapa' ? 'Contracapa' : 'Frente'}
                                    </button>

                                    {!msg.coverImage.applied ? (
                                      <button
                                        type="button"
                                        onClick={() => handleApplyCoverToBook(msg.coverImage!, msg.id)}
                                        style={{
                                          flex: 1,
                                          minWidth: 140,
                                          padding: '7px 10px',
                                          borderRadius: 6,
                                          background: 'linear-gradient(135deg, #059669, #047857)',
                                          color: '#ffffff',
                                          border: 'none',
                                          fontSize: 10.5,
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: 5,
                                          boxShadow: '0 2px 4px rgba(5, 150, 105, 0.3)'
                                        }}
                                      >
                                        <Sparkles size={13} /> Incorporar ao Livro
                                      </button>
                                    ) : (
                                      <div style={{
                                        fontSize: 10,
                                        color: '#34d399',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        padding: '0 6px'
                                      }}>
                                        <Check size={13} /> Capa Ativa
                                      </div>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleGenerateAuthorCover(`Gere outra proposta de capa no Replicate com iluminação dramática alternativa para "${currentBookTitle}".`)}
                                      style={{
                                        padding: '7px 10px',
                                        borderRadius: 6,
                                        background: '#334155',
                                        color: '#e2e8f0',
                                        border: 'none',
                                        fontSize: 10.5,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4
                                      }}
                                    >
                                      <RefreshCw size={12} /> Replicate
                                    </button>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        )}

                        {/* CARD DE REVISÃO DA OBRA COMPLETA (DE UMA VEZ SÓ) */}
                        {msg.fullBookReviewCard && (
                          <div style={{
                            marginTop: 12,
                            padding: 12,
                            borderRadius: 10,
                            background: '#eff6ff',
                            border: '1px solid #93c5fd',
                            color: '#0f172a'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                              <CheckSquare size={16} color="#1d4ed8" />
                              <span style={{ fontSize: 12, fontWeight: 800, color: '#1e40af' }}>
                                Revisão Editorial Global ({msg.fullBookReviewCard.chaptersEnrichment.length} Capítulos Enriquecidos)
                              </span>
                            </div>

                            <p style={{ fontSize: 11, color: '#1e3a8a', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                              {msg.fullBookReviewCard.summary}
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto', marginBottom: 12, paddingRight: 4 }}>
                              {msg.fullBookReviewCard.chaptersEnrichment.map((cap) => (
                                <div key={cap.chapterNumber} style={{
                                  background: '#ffffff',
                                  borderRadius: 6,
                                  padding: 10,
                                  border: '1px solid #bfdbfe'
                                }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', marginBottom: 4 }}>
                                    📖 Capítulo {cap.chapterNumber}: {cleanChapterTitle(cap.chapterTitle || '')}
                                  </div>
                                  <div style={{ fontSize: 10.5, color: '#475569', fontStyle: 'italic', marginBottom: 6 }}>
                                    {cap.rationale}
                                  </div>
                                  <div style={{
                                    fontSize: 10.5,
                                    color: '#0f172a',
                                    background: '#f8fafc',
                                    padding: '6px 8px',
                                    borderRadius: 4,
                                    border: '1px dashed #cbd5e1',
                                    maxHeight: 70,
                                    overflowY: 'auto',
                                    fontFamily: 'serif'
                                  }}>
                                    "{cap.additionText.slice(0, 300)}{cap.additionText.length > 300 ? '...' : ''}"
                                  </div>
                                </div>
                              ))}
                            </div>

                            {!msg.fullBookReviewCard.applied ? (
                              <button
                                type="button"
                                onClick={() => handleApplyFullBookEnrichment(msg.fullBookReviewCard!, msg.id)}
                                style={{
                                  width: '100%',
                                  padding: '10px 14px',
                                  borderRadius: 6,
                                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontSize: 12,
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 6,
                                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)'
                                }}
                              >
                                <Sparkles size={14} /> Aprovar e Aplicar Enriquecimento na Obra Toda
                              </button>
                            ) : (
                              <div style={{ fontSize: 11, color: '#15803d', fontWeight: 800, textAlign: 'center', padding: 6 }}>
                                ✓ Enriquecimento global aplicado a todos os capítulos do livro!
                              </div>
                            )}
                          </div>
                        )}

                        {/* CARD DE SUGESTÃO DE ACRÉSCIMO PONTUAL */}
                        {msg.suggestionCard && (
                          <div style={{
                            marginTop: 10,
                            padding: 12,
                            borderRadius: 8,
                            background: '#f0fdf4',
                            border: '1px solid #86efac',
                            color: '#0f172a'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                              <Lightbulb size={14} color="#16a34a" />
                              <span style={{ fontSize: 11, fontWeight: 800, color: '#166534' }}>
                                Sugestão para o Capítulo {msg.suggestionCard.chapterNumber}:
                              </span>
                            </div>

                            <p style={{ fontSize: 11, color: '#15803d', margin: '0 0 8px 0', fontStyle: 'italic' }}>
                              {msg.suggestionCard.rationale}
                            </p>

                            <div style={{
                              background: '#ffffff',
                              padding: 10,
                              borderRadius: 6,
                              border: '1px solid #bbf7d0',
                              fontSize: 11,
                              lineHeight: 1.5,
                              color: '#1e293b',
                              marginBottom: 10,
                              maxHeight: 140,
                              overflowY: 'auto',
                              fontFamily: 'serif'
                            }}>
                              "{msg.suggestionCard.additionText}"
                            </div>

                            {!msg.suggestionCard.applied ? (
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                  type="button"
                                  onClick={() => handleApplyCardEnrichment(msg.suggestionCard!, msg.id)}
                                  style={{
                                    flex: 1,
                                    padding: '7px 12px',
                                    borderRadius: 6,
                                    background: 'linear-gradient(135deg, #16a34a, #15803d)',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 5
                                  }}
                                >
                                  <Sparkles size={13} /> Aprovar e Inserir no Capítulo {msg.suggestionCard.chapterNumber}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSendMessage(`Por favor, refine ou crie uma variação diferente para o acréscimo do Capítulo ${msg.suggestionCard?.chapterNumber}.`)}
                                  style={{
                                    padding: '7px 10px',
                                    borderRadius: 6,
                                    background: '#ffffff',
                                    color: '#334155',
                                    border: '1px solid #cbd5e1',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  🔄 Outra Variação
                                </button>
                              </div>
                            ) : (
                              <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 800 }}>
                                ✓ Acréscimo incorporado com sucesso!
                              </div>
                            )}
                          </div>
                        )}

                        {/* CARD DE PROPOSTA DE CAPÍTULO (FLUXO CONVERSACIONAL GUIADO CAPÍTULO A CAPÍTULO) */}
                        {msg.chapterProposalCard && (
                          <div style={{
                            marginTop: 12,
                            padding: 14,
                            borderRadius: 10,
                            background: '#f8fafc',
                            border: '1.5px solid #38bdf8',
                            color: '#0f172a',
                            boxShadow: '0 4px 12px rgba(56, 189, 248, 0.15)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <BookOpen size={16} color="#0284c7" />
                                <span style={{ fontSize: 13, fontWeight: 800, color: '#0369a1' }}>
                                  Capítulo {msg.chapterProposalCard.numero}: {cleanChapterTitle(msg.chapterProposalCard.titulo)}
                                </span>
                              </div>
                              <span style={{
                                fontSize: 10,
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: 12,
                                background: '#e0f2fe',
                                color: '#0369a1'
                              }}>
                                {msg.chapterProposalCard.palavras.toLocaleString()} palavras
                              </span>
                            </div>

                            {msg.chapterProposalCard.resumo && (
                              <p style={{ fontSize: 11.5, color: '#475569', margin: '0 0 10px 0', fontStyle: 'italic', lineHeight: 1.4 }}>
                                💡 {msg.chapterProposalCard.resumo}
                              </p>
                            )}

                            {/* Prévia do texto do capítulo */}
                            <div style={{
                              background: '#ffffff',
                              padding: '12px 14px',
                              borderRadius: 8,
                              border: '1px solid #cbd5e1',
                              fontSize: 12,
                              lineHeight: 1.6,
                              color: '#1e293b',
                              marginBottom: 12,
                              maxHeight: 180,
                              overflowY: 'auto',
                              fontFamily: 'Georgia, serif',
                              whiteSpace: 'pre-line'
                            }}>
                              {msg.chapterProposalCard.texto}
                            </div>

                            {!msg.chapterProposalCard.applied ? (
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  onClick={() => handleApproveChapterProposal(msg.chapterProposalCard!, msg.id)}
                                  disabled={isLoading}
                                  style={{
                                    flex: 1,
                                    minWidth: 200,
                                    padding: '9px 16px',
                                    borderRadius: 8,
                                    background: 'linear-gradient(135deg, #059669, #047857)',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontSize: 12,
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)'
                                  }}
                                >
                                  <CheckCircle2 size={15} /> Autorizar e Gravar Capítulo {msg.chapterProposalCard.numero}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSendMessage(`Por favor, faça ajustes no Capítulo ${msg.chapterProposalCard?.numero}: aprofunde os detalhes e a tensão narrativa mantendo a fidelidade ao enredo.`)}
                                  disabled={isLoading}
                                  style={{
                                    padding: '9px 12px',
                                    borderRadius: 8,
                                    background: '#ffffff',
                                    color: '#334155',
                                    border: '1px solid #cbd5e1',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  🔄 Pedir Ajuste
                                </button>
                              </div>
                            ) : (
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 10px',
                                borderRadius: 6,
                                background: '#dcfce7',
                                color: '#15803d',
                                fontSize: 11.5,
                                fontWeight: 800
                              }}>
                                <CheckCircle2 size={14} color="#15803d" />
                                Capítulo {msg.chapterProposalCard.numero} gravado e integrado ao livro oficial ✓
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 4px' }}>
                        <span style={{ fontSize: 9.5, color: '#94a3b8' }}>
                          {msg.timestamp}
                        </span>
                        {isAgent && (
                          <button
                            type="button"
                            onClick={() => {
                              if (currentlySpeakingId === msg.id) {
                                coAuthorVoiceService.stop();
                              } else {
                                coAuthorVoiceService.speak(msg.text, msg.id, { forcePlay: true });
                              }
                            }}
                            style={{
                              background: currentlySpeakingId === msg.id ? '#fdf2f8' : 'transparent',
                              border: currentlySpeakingId === msg.id ? '1px solid #fbcfe8' : 'none',
                              color: currentlySpeakingId === msg.id ? '#db2777' : '#94a3b8',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 2,
                              fontSize: 10,
                              fontWeight: 600,
                              padding: '1px 5px',
                              borderRadius: 4
                            }}
                            title={currentlySpeakingId === msg.id ? 'Parar leitura de voz' : 'Ouvir resposta com voz feminina'}
                          >
                            {currentlySpeakingId === msg.id ? (
                              <>
                                <VolumeX size={11} color="#db2777" />
                                <span style={{ color: '#db2777' }}>Parar</span>
                              </>
                            ) : (
                              <>
                                <Volume2 size={11} />
                                <span>Ouvir</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isLoading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8 }}>
                    <BookEnginAnimatedBook size="micro" />
                    <span style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
                      {loadingStatus}
                    </span>
                  </div>
                )}
              </div>

              {/* INPUT DE MENSAGEM DO COAUTHOR COM SUPORTE A VOZ / MICROFONE */}
              <div style={{
                padding: '10px 12px',
                background: '#ffffff',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                gap: 8,
                alignItems: 'center'
              }}>
                <CoAuthorVoiceModalBar
                  onSendMessage={(speechText) => handleSendMessage(speechText)}
                  isLoading={isLoading}
                  disabled={isLoading}
                />
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Fale no microfone ou digite para revisar a obra, enriquecer ou criar capa..."
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || !inputText.trim()}
                  style={{
                    padding: '9px 14px',
                    borderRadius: 8,
                    background: !inputText.trim() || isLoading ? '#94a3b8' : '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    cursor: !inputText.trim() || isLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Enviar mensagem para o CoAuthor"
                >
                  <Send size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};
