import React, { useState, useRef, useEffect } from 'react';
import {
  Bot, Sparkles, Send, X, Minimize2, Check, RefreshCw,
  BookOpen, ChevronRight, CheckCircle2, MessageSquare, Lightbulb,
  CornerDownLeft, ShieldCheck, Layers, Award, ArrowUpRight, Palette,
  Image as ImageIcon, Download, CheckSquare, Search
} from 'lucide-react';
import { chamarGeminiTexto, chamarImagen } from '../../../services/kdp-ai-engine';
import { cleanChapterTitle } from '../../../services/kdp-editorial-review';
import {
  fetchAllReadyBooks,
  saveUpdatedBookToDb,
  inferCoAuthorBookType,
  type ReadyBookRecord
} from '../../../services/ready-books-service';
import { BookEnginAnimatedBook } from '../../common/BookEnginAnimatedBook';

export interface CoAuthorFloatingAssistantProps {
  bookState: any | null;
  onApplyEnrichment: (chapterNumber: number, additionText: string) => void;
  onApplyFullBookEnrichment?: (enrichments: Array<{ chapterNumber: number; additionText: string }>) => void;
  onSetBookCover?: (coverDataUrl: string) => void;
  onOpenFullStudio?: () => void;
  onSelectBook?: (book: ReadyBookRecord) => void;
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
  coverImage?: {
    dataUrl: string;
    promptUsed: string;
    applied?: boolean;
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
  const currentBookTitle = activeBookRecord?.title || bookState?.titulo || 'Livro em Produção';
  const currentBookGenre = activeBookRecord?.genre || bookState?.genero || 'Geral';
  const currentBookAuthor = activeBookRecord?.author || bookState?.autor || 'Autor';
  const currentBookSubtitle = activeBookRecord?.subtitle || bookState?.subtitulo || '';
  const currentBookCaps = activeBookRecord?.capitulos || bookState?.capitulos || [];
  const chaptersCount = currentBookCaps.length;
  const isTechnicalBook = inferCoAuthorBookType(currentBookGenre, currentBookTitle) !== 'ficcao';

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg_welcome',
      sender: 'agent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: (bookState?.titulo && bookState?.capitulos?.length > 0)
        ? `E aí! Estou com o manuscrito de **"${bookState.titulo}"** aberto aqui na bancada (${bookState.capitulos.length} capítulos). Podemos fazer uma revisão de ponta a ponta na obra toda, enriquecer com mais detalhes ou trabalhar na capa. O que você quer focar agora?`
        : `E aí! Bancada editorial pronta. Você pode puxar qualquer livro já pronto da sua base pelo botão "Base" acima para revisar e enriquecer, ou conversarmos sobre novas ideias. O que vamos trabalhar hoje?`
    }
  ]);

  const handleSelectReadyBook = (book: ReadyBookRecord) => {
    setActiveBookRecord(book);
    setSelectedChapter(1);
    setShowBookSelector(false);
    if (onSelectBook) onSelectBook(book);

    const msgLoaded: Message = {
      id: `msg_loaded_${Date.now()}`,
      sender: 'agent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Carreguei a obra **"${book.title}"** aqui na nossa bancada! Ela possui ${book.capitulos.length} capítulos e cerca de ${book.totalWords.toLocaleString()} palavras (Perfil: **${book.tipoLivro.toUpperCase()}**).\n\nPodemos fazer uma revisão de ponta a ponta na obra toda, aprofundar ${book.tipoLivro === 'ficcao' ? 'a história e os diálogos' : 'o conteúdo prático e exemplos'}, ou lapidar um capítulo específico. Me conta o que você prefere atacar!`
    };
    setMessages(prev => [...prev, msgLoaded]);
  };

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Mantém scroll estrito dentro do container do chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Extrai resumo de capítulos para dar contexto completo de toda a obra
  const buildBookFullContext = () => {
    if (currentBookCaps.length === 0) {
      return `Livro: "${currentBookTitle}" | Autor: "${currentBookAuthor}" | Gênero: "${currentBookGenre}" (Nenhum capítulo disponível ainda).`;
    }

    const capsText = currentBookCaps.map((c: any, i: number) => {
      const conteudoReal = c.texto || c.conteudo || '';
      const totalWords = conteudoReal.split(/\s+/).filter(Boolean).length;
      const cleanTitle = cleanChapterTitle(c.titulo || `Capítulo ${i + 1}`);
      const trechoInicio = conteudoReal.slice(0, 1500).replace(/\n+/g, ' ');
      const trechoFim = conteudoReal.length > 2000 ? ' ... [Final]: ' + conteudoReal.slice(-1000).replace(/\n+/g, ' ') : '';
      return `[CAPÍTULO ${i + 1}: "${cleanTitle}" | ${totalWords} palavras]\nConteúdo:\n"${trechoInicio}${trechoFim}"`;
    }).join('\n\n');

    return `Obra: "${currentBookTitle}"\nSubtítulo: "${currentBookSubtitle}"\nAutor: "${currentBookAuthor}"\nGênero: "${currentBookGenre}"\nTipo: ${isTechnicalBook ? 'TÉCNICO / NÃO-FICÇÃO' : 'FICÇÃO'}\nTotal de Capítulos: ${chaptersCount}\n\nVisão Geral e Conteúdo dos Capítulos:\n${capsText}`;
  };

  // Gerador de Capa Autoral com IA diretamente dentro do chat
  const handleGenerateAuthorCover = async (userPrompt?: string) => {
    setIsLoading(true);
    setLoadingStatus('🎨 CoAuthor pintando conceito de Capa Autoral com IA...');

    const promptUsuario = userPrompt || 'Crie uma capa autoral e impactante para este livro.';
    const userMsg: Message = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: promptUsuario
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      // 1. O Gemini elabora a direção de arte autoral cirúrgica
      const systemArt = `Você é um Diretor de Arte Editorial e Capista de Elite para bestsellers da Amazon KDP.
Crie um prompt em INGLÊS para geração de imagem artística no formato vertical 2:3.
O prompt deve focar em:
- Composição cinematográfica ou refinada adequada ao gênero "${currentBookGenre}" e livro "${currentBookTitle}".
- Iluminação dramática, texturas ricas, atmosfera imersiva.
- ESPAÇO NEGATIVO generoso no topo para tipografia.
- REGRA VITAL: SEM TEXTO, SEM LETRAS, SEM SELOS (no text, no letters, no watermark, no logos).`;

      const promptDirection = `Instrução do Autor: "${promptUsuario}".
Título do Livro: "${currentBookTitle}"
Gênero: "${currentBookGenre}"
Resumo da História: "${(currentBookCaps[0]?.texto || '').slice(0, 400)}"

Escreva APENAS o prompt em inglês detalhado para o gerador de imagem:`;

      const artRes = await chamarGeminiTexto(promptDirection, {
        systemInstruction: systemArt,
        temperature: 0.9,
        maxTokens: 300
      });

      const promptFinal = (artRes?.texto || '').trim() || `Cinematic book cover art, atmospheric lighting, ${currentBookGenre}, inspired by ${currentBookTitle}, masterpiece, clean negative space, no text, 8k`;

      // 2. Chama o motor de imagem
      const imagemUrl = await chamarImagen(promptFinal, '2:3');

      const agentMsg: Message = {
        id: `msg_agent_${Date.now()}`,
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Criei uma proposta de Capa Autoral exclusiva para **"${currentBookTitle}"**! Analisei o clima do livro e compus uma arte com iluminação dramática e espaço limpo para a tipografia.\n\nVocê pode incorporá-la imediatamente ao livro ou me pedir ajustes ("deixe mais sombria", "mude as cores para azul", etc.):`,
        coverImage: {
          dataUrl: imagemUrl,
          promptUsed: promptFinal,
          applied: false
        }
      };

      setMessages(prev => [...prev, agentMsg]);
    } catch (err: any) {
      const errM: Message = {
        id: `msg_err_${Date.now()}`,
        sender: 'system',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Erro ao gerar capa autoral: ${err.message || 'Verifique a conexão com a API'}.`
      };
      setMessages(prev => [...prev, errM]);
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

    if (actionType === 'capa' || /capa autoral|gerar capa|criar capa|fazer capa|mudar capa/i.test(textToSend)) {
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
      const bookContext = buildBookFullContext();

      // Histórico recente para conversa fluida sem re-apresentações formais
      const historicoRecente = nextMsgs.slice(-6).map(m => {
        const tag = m.sender === 'user' ? 'AUTOR' : (m.sender === 'agent' ? 'COAUTHOR' : 'SISTEMA');
        return `${tag}: ${m.text}`;
      }).join('\n\n');

      // MODO GLOBAL: REVISÃO DE ENREDO DA OBRA TODA, FECHAMENTO OU APROFUNDAMENTO
      const isGlobalAction = actionType === 'enredo-global' || actionType === 'fechamento' || actionType === 'profundidade'
        || /enredo|obra toda|livro todo|todos os cap|revisar tudo|revisar todo|fechamento|arremate|desfecho/i.test(textToSend);

      if (isGlobalAction) {
        setLoadingStatus('📖 CoAuthor analisando a Obra Completa de ponta a ponta...');

        const systemInstruction = `Você é o coautor parceiro e experiente de escrita para o autor nesta obra do Amazon KDP.
Obra: "${currentBookTitle}" | Gênero: "${currentBookGenre}" | Tipo: ${isTechnicalBook ? 'TÉCNICO / NÃO-FICÇÃO' : 'FICÇÃO / NARRATIVA'}
Você está trabalhando diretamente sobre toda a obra:
${bookContext}

REGRAS INEGOCIÁVEIS DE COMUNICAÇÃO:
1. NUNCA use frases clichês ou robóticas de IA (ex: "Olá, sou seu assistente de IA...", "Como posso ajudar você hoje?", "Com certeza! Como seu coautor de inteligência artificial...").
2. Fale como um colega escritor ou editor sênior humano e experiente: direto ao ponto, colaborativo, perspicaz, com ideias concretas.
3. Se já houver mensagens no histórico, mantenha a conversa fluida e contínua, sem saudações desnecessárias, indo direto ao ponto da discussão.
4. ${
  isTechnicalBook
    ? `DIRETRIZ PARA LIVRO TÉCNICO:
- Analise a solidez do conteúdo: clareza do método, aplicabilidade prática, densidade de valor real e didática.
- Identifique onde faltam exemplos práticos reais, frameworks de execução, dados aprofundados e checklists.
- Elimine enrolação (anti-fluff). Não invente personagens nem dramas de ficção.`
    : `DIRETRIZ PARA FICÇÃO:
- Analise a continuidade narrativa entre todos os capítulos, evolução do enredo e ritmo das cenas.
- Identifique onde a história precisa de mais imersão: ambientação sensorial, tensão dramática, profundidade e diálogos vivos.
- Garanta que o clímax e o fechamento do livro amarrem as pontas soltas.`
}
5. Se a obra já estiver excelente, ateste sua qualidade. Só formule sugestão de acréscimo onde houver benefício real.

FORMATO ESTRUTURADO DE RETORNO OBRIGATÓRIO:
Inicie sua resposta com uma análise crítica e acolhedora em linguagem natural e direta.
Em seguida, para cada capítulo que mereça enriquecimento, formate EXATAMENTE entre as tags:
<<<SUGESTAO_OBRA_COMPLETA>>>
RESUMO: [Resumo do diagnóstico geral e o que foi aprimorado na obra]
[CAP 1]
JUSTIFICATIVA: [Por que este enriquecimento melhora o capítulo 1]
ACRESCIMO: [O texto pronto para ser adicionado ao capítulo 1]
[/CAP]
[CAP 2]
JUSTIFICATIVA: [Por que este enriquecimento melhora o capítulo 2]
ACRESCIMO: [O texto pronto para ser adicionado ao capítulo 2]
[/CAP]
<<<FIM_OBRA_COMPLETA>>>`;

        const promptText = `━━━ DIÁLOGO RECENTE ━━━
${historicoRecente}

━━━ PEDIDO ATUAL DO AUTOR ━━━
"${textToSend}"

Analise a obra de ponta a ponta, identifique o que deve ser aprimorado e forneça as sugestões de acréscimo estruturadas para os capítulos correspondentes:`;

        const resultadoIA = await chamarGeminiTexto(promptText, {
          systemInstruction,
          temperature: 0.8,
          maxTokens: 4500
        });

        const respostaIA = resultadoIA?.texto || '';

        let cleanText = respostaIA;
        let fullReviewData: Message['fullBookReviewCard'] | undefined = undefined;

        const globalMatch = respostaIA.match(/<<<SUGESTAO_OBRA_COMPLETA>>>([\s\S]*?)<<<FIM_OBRA_COMPLETA>>>/);
        if (globalMatch) {
          const bloco = globalMatch[1];
          const resumoMatch = bloco.match(/RESUMO:\s*([\s\S]*?)(?=\[CAP|\n\n)/i);
          const resumo = resumoMatch ? resumoMatch[1].trim() : 'Diagnóstico editorial completo da obra.';

          const chaptersEnrichment: ChapterEnrichmentItem[] = [];
          const capRegex = /\[CAP\s*(\d+)\][\s\S]*?JUSTIFICATIVA:\s*([\s\S]*?)(?=ACRESCIMO:)ACRESCIMO:\s*([\s\S]*?)\[\/CAP\]/gi;
          let match;

          while ((match = capRegex.exec(bloco)) !== null) {
            const capNum = parseInt(match[1], 10);
            const just = match[2].trim();
            const acre = match[3].trim();
            if (capNum && acre) {
              chaptersEnrichment.push({
                chapterNumber: capNum,
                chapterTitle: cleanChapterTitle(currentBookCaps[capNum - 1]?.titulo || `Capítulo ${capNum}`),
                rationale: just,
                additionText: acre
              });
            }
          }

          if (chaptersEnrichment.length > 0) {
            fullReviewData = {
              summary: resumo,
              chaptersEnrichment,
              applied: false
            };
          }

          cleanText = respostaIA.replace(/<<<SUGESTAO_OBRA_COMPLETA>>>[\s\S]*?<<<FIM_OBRA_COMPLETA>>>/, '').trim();
          if (!cleanText) {
            cleanText = `Analisei a obra inteira de ponta a ponta e elaborei propostas de enriquecimento editorial para ${chaptersEnrichment.length} capítulos. Veja o plano abaixo e aprove para aplicar na obra toda de uma só vez:`;
          }
        }

        const agentMsg: Message = {
          id: `msg_agent_${Date.now()}`,
          sender: 'agent',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: cleanText,
          fullBookReviewCard: fullReviewData
        };

        setMessages(prev => [...prev, agentMsg]);
      } else {
        // MODO PONTUAL (Capítulo Específico ou Pergunta Geral)
        setLoadingStatus(`CoAuthor analisando Capítulo ${selectedChapter}...`);
        const currentChapterData = currentBookCaps[selectedChapter - 1];
        const chapterFullText = currentChapterData ? (currentChapterData.texto || currentChapterData.conteudo || '') : '';
        const chapterContentPreview = chapterFullText.length > 4000
          ? chapterFullText.slice(0, 2200) + '\n... [Trecho Final]:\n' + chapterFullText.slice(-1800)
          : chapterFullText;
        const currentCapTitleClean = cleanChapterTitle(currentChapterData?.titulo || `Capítulo ${selectedChapter}`);

        const systemInstruction = `Você é o parceiro de redação e coautor humano experiente do autor para Amazon KDP.
Obra: "${currentBookTitle}" | Gênero: "${currentBookGenre}" | Tipo: ${isTechnicalBook ? 'TÉCNICO / NÃO-FICÇÃO' : 'FICÇÃO'}
Capítulo focado: Capítulo ${selectedChapter} ("${currentCapTitleClean}").

REGRAS CONVERSACIONAIS:
1. NUNCA use frases robóticas ou clichês de IA. Fale de escritor para escritor, de forma direta, madura e colaborativa.
2. Se já houver mensagens no histórico, continue a conversa fluentemente sem saudações desnecessárias.
3. Se o capítulo já estiver bem trabalhado e redondo, declare isso abertamente. Só sugira acréscimo se houver lacuna real.
4. ${
  isTechnicalBook
    ? 'Para livro técnico: Adicione exemplos reais, passos práticos, frameworks e didática clara.'
    : 'Para ficção: Aprofunde o drama, as sensações, o conflito e os diálogos vivos.'
}

FORMATO ESPECIAL DE ACRÉSCIMO (usar apenas se houver necessidade real):
Quando fizer uma sugestão de acréscimo para este capítulo, formule entre as tags:
<<<SUGESTAO_ACRESCIMO>>>
CAPITULO: ${selectedChapter}
JUSTIFICATIVA: [Por que este trecho enriquece o capítulo sem ferir o contexto]
TEXTO: [O texto pronto para ser inserido no capítulo]
<<<FIM_SUGESTAO>>>`;

        const promptText = `━━━ DIÁLOGO RECENTE ━━━
${historicoRecente}

━━━ CONSULTA ATUAL DO AUTOR ━━━
Mensagem: "${textToSend}"
Capítulo focado: Capítulo ${selectedChapter} ("${currentCapTitleClean}")
Trecho atual do capítulo (${chapterFullText.split(/\s+/).filter(Boolean).length} palavras):
"${chapterContentPreview}"`;

        const resultadoIA = await chamarGeminiTexto(promptText, {
          systemInstruction,
          temperature: 0.8,
          maxTokens: 3200
        });

        const respostaIA = resultadoIA?.texto || '';
        let cleanText = respostaIA;
        let cardData: Message['suggestionCard'] | undefined = undefined;

        const cardMatch = respostaIA.match(/<<<SUGESTAO_ACRESCIMO>>>([\s\S]*?)<<<FIM_SUGESTAO>>>/);
        if (cardMatch) {
          const bloco = cardMatch[1];
          const capNumMatch = bloco.match(/CAPITULO:\s*(\d+)/i);
          const justMatch = bloco.match(/JUSTIFICATIVA:\s*([\s\S]*?)(?=TEXTO:|$)/i);
          const textoMatch = bloco.match(/TEXTO:\s*([\s\S]*)/i);

          const targetCap = capNumMatch ? parseInt(capNumMatch[1], 10) : selectedChapter;
          const rationale = justMatch ? justMatch[1].trim() : 'Enriquecimento temático e aprofundamento.';
          const addition = textoMatch ? textoMatch[1].trim() : '';

          if (addition) {
            cardData = {
              chapterNumber: targetCap,
              additionText: addition,
              rationale
            };
          }

          cleanText = respostaIA.replace(/<<<SUGESTAO_ACRESCIMO>>>[\s\S]*?<<<FIM_SUGESTAO>>>/, '').trim();
          if (!cleanText) {
            cleanText = `Formulei uma sugestão de acréscimo para o Capítulo ${targetCap}. Veja abaixo e aprove para aplicar:`;
          }
        }

        const agentMsg: Message = {
          id: `msg_agent_${Date.now()}`,
          sender: 'agent',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: cleanText,
          suggestionCard: cardData
        };

        setMessages(prev => [...prev, agentMsg]);
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: `msg_err_${Date.now()}`,
        sender: 'system',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Não foi possível consultar o CoAuthor: ${err.message || 'Verifique sua conexão ou configure sua chave Gemini API'}.`
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
                onClick={() => setIsOpen(false)}
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
                    onClick={() => handleSendMessage('Faça uma revisão crítica e completa da obra inteira de uma vez. Analise consistência de arcos, ritmo de todos os capítulos, furos e elabore sugestões de acréscimo estruturadas.', 'enredo-global')}
                    disabled={isLoading}
                    style={{
                      padding: '6px 11px',
                      borderRadius: 6,
                      background: '#ffffff',
                      border: '1.5px solid #0284c7',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#0369a1',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      boxShadow: '0 1px 2px rgba(2, 132, 199, 0.08)'
                    }}
                  >
                    📖 Revisar Obra Inteira de Uma Vez
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
                      border: '1.5px solid #059669',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#047857',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    {isTechnicalBook ? '⚙️ Enriquecer Conteúdo Técnico' : '✨ Enriquecer História & Diálogos'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendMessage('Revise o fechamento global da obra: analise se o clímax e os capítulos finais amarram todas as pontas soltas da trama e elabore o fechamento definitivo com impacto emocional ou prático.', 'fechamento')}
                    disabled={isLoading}
                    style={{
                      padding: '6px 11px',
                      borderRadius: 6,
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#0f172a',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    🎯 Fechamento da Obra
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

                        {/* EXIBIÇÃO DE CAPA AUTORAL GERADA NO CHAT COM BOTÃO DE INCORPORAÇÃO */}
                        {msg.coverImage && (
                          <div style={{
                            marginTop: 12,
                            padding: 10,
                            borderRadius: 10,
                            background: '#0f172a',
                            border: '1px solid #334155',
                            color: '#ffffff'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 5 }}>
                                <Palette size={13} /> Proposta de Capa Autoral
                              </span>
                              {msg.coverImage.applied && (
                                <span style={{ background: '#059669', color: '#ffffff', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                                  ✓ Incorporada ao Livro
                                </span>
                              )}
                            </div>

                            <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#000000', marginBottom: 10 }}>
                              <img
                                src={msg.coverImage.dataUrl}
                                alt="Capa Autoral do CoAuthor"
                                style={{
                                  width: '100%',
                                  maxHeight: 320,
                                  objectFit: 'contain',
                                  display: 'block',
                                  margin: '0 auto'
                                }}
                              />
                            </div>

                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {!msg.coverImage.applied ? (
                                <button
                                  type="button"
                                  onClick={() => handleApplyCoverToBook(msg.coverImage!, msg.id)}
                                  style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    borderRadius: 6,
                                    background: 'linear-gradient(135deg, #059669, #047857)',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    boxShadow: '0 2px 4px rgba(5, 150, 105, 0.3)'
                                  }}
                                >
                                  <Sparkles size={13} /> Incorporar esta Capa ao Livro
                                </button>
                              ) : (
                                <div style={{ fontSize: 11, color: '#34d399', fontWeight: 700, padding: 4 }}>
                                  ✓ Esta imagem agora é o fundo oficial do seu livro!
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => handleGenerateAuthorCover(`Crie uma variação com iluminação ou atmosfera alternativa para a capa de "${currentBookTitle}".`)}
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: 6,
                                  background: '#1e293b',
                                  color: '#cbd5e1',
                                  border: '1px solid #475569',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                🔄 Outra Variação
                              </button>
                            </div>
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
                      </div>

                      <span style={{ fontSize: 9.5, color: '#94a3b8', margin: '0 4px' }}>
                        {msg.timestamp}
                      </span>
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

              {/* INPUT DE MENSAGEM DO COAUTHOR */}
              <div style={{
                padding: '10px 12px',
                background: '#ffffff',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                gap: 8,
                alignItems: 'center'
              }}>
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
                  placeholder="Peça para revisar o enredo da obra toda ou criar uma capa autoral..."
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
