// ================================================================
// MOTOR DE PESQUISA & CRIAÇÃO: CRIMES REAIS & HISTÓRIA DE REIS (KDP)
// Permite ao autor escolher:
// 1. País e Ano/Período dos crimes reais (busca fatos de grande repercussão com artigo completo)
// 2. Reino/País e Século/Época de reis e monarcas históricos
// 3. Seleção de múltiplos casos para compor capítulos no mesmo livro
// ================================================================

export interface CrimeRealCaso {
  id: string;
  tituloCaso: string;
  pais: string;
  cidadeEstado: string;
  anoOuPeriodo: string;
  nivelRepercussao: string;
  vitimasOuAlvos: string;
  autoresOuAcusados: string;
  resumoBreve: string;
  artigoCompleto: {
    cenaECrime: string;
    investigacaoEPericia: string;
    reviravoltasESuspeitos: string;
    julgamentoEDesfecho: string;
    impactoHistorico: string;
  };
  fontesEMidia: string[];
  selecionadoParaLivro: boolean;
}

export interface CuriosidadeItem {
  id: string;
  numero: number;
  tituloFato: string;
  categoriaOuCoisa: string;
  origemOuPais: string;
  fatoSurpreendente: string;
  explicacaoDetalhada: string;
  porQuePoucosSabem: string;
  fonteOuReferencia: string;
  selecionadoParaLivro: boolean;
}

export interface HistoriaReiCaso {
  id: string;
  tituloReiOuReinado: string;
  reinoOuPais: string;
  epocaOuSeculo: string;
  monarcaOuDinastia: string;
  nivelImpacto: string;
  principaisEventos: string;
  resumoBreve: string;
  artigoCompleto: {
    ascensaoAoTrono: string;
    guerrasEConquistas: string;
    conspiracoesETraicoes: string;
    quedaOuLegado: string;
    fatosCuriosos: string;
  };
  selecionadoParaLivro: boolean;
}

export interface LivroCompostoProps {
  tituloSugerido: string;
  subtituloSugerido: string;
  premissaCentral: string;
  topicoDescricao: string;
  dossieArtigosConsolidado: string;
  capitulosSugeridos: Array<{
    num: number;
    title: string;
    sectionsCount: number;
    targetWords: number;
    focus: string;
    casoId?: string;
  }>;
}

export class KdpTrueCrimeRoyalHistoryService {

  // -------------------------------------------------------------
  // LISTA DE PAÍSES MAIS COMUNS PARA CRIMES REAIS
  // -------------------------------------------------------------
  public static readonly PAISES_CRIMES_REAIS = [
    'Brasil',
    'Estados Unidos (EUA)',
    'Reino Unido (Inglaterra)',
    'França',
    'Itália',
    'Alemanha',
    'Japão',
    'Espanha',
    'México',
    'Canadá',
    'Argentina',
    'Portugal',
    'Colômbia',
    'Austrália'
  ];

  // -------------------------------------------------------------
  // LISTA DE REINOS E IMPÉRIOS HISTÓRICOS
  // -------------------------------------------------------------
  public static readonly REINOS_HISTORICOS = [
    'Inglaterra / Grã-Bretanha',
    'França',
    'Portugal / Brasil Imperial',
    'Roma Antiga / Império Romano',
    'Egito Antigo (Faraós)',
    'Espanha',
    'Rússia Czarista',
    'Império Otomano',
    'Japão Feudal (Xogunato)',
    'Grécia Antiga / Macedônia',
    'Alemanha / Sacro Império',
    'Império Austro-Húngaro'
  ];

  // -------------------------------------------------------------
  // FALLBACK DOCUMENTAL DE CRIMES REAIS CONSAGRADOS
  // -------------------------------------------------------------
  private static readonly CRIMES_FALLBACK: CrimeRealCaso[] = [
    {
      id: 'crime_br_1992_daniella',
      tituloCaso: 'O Assassinato de Daniella Perez (Caso Guilherme de Pádua)',
      pais: 'Brasil',
      cidadeEstado: 'Rio de Janeiro, RJ',
      anoOuPeriodo: '1992',
      nivelRepercussao: 'Parou o Brasil inteiro, comoção nacional e motivou 1,3 milhão de assinaturas para tornar homicídio qualificado crime hediondo.',
      vitimasOuAlvos: 'Daniella Perez (atriz de 22 anos, filha da autora Glória Perez)',
      autoresOuAcusados: 'Guilherme de Pádua e Paula Thomaz',
      resumoBreve: 'Em 28 de dezembro de 1992, a jovem atriz foi emboscada na saída das gravações da novela "De Corpo e Alma" e morta com 18 punhaladas em um matagal na Barra da Tijuca por seu par romântico na ficção e a esposa dele.',
      artigoCompleto: {
        cenaECrime: 'Na noite de 28 de dezembro de 1992, Daniella Perez encerrou gravações nos estúdios da TV Globo. Ao parar em um posto de gasolina na Barra da Tijuca, seu carro foi fechado pelo veículo de Guilherme de Pádua. Após ser desacordada com um golpe, foi levada para um terreno baldio na Rua Cândido Portinari, onde foi brutalmente executada com dezoito golpes de punhal direcionados ao coração e pulmões.',
        investigacaoEPericia: 'Um frentista e um advogado que passavam pela região anotaram as placas dos carros envolvidos. O veículo Santana com placa adulterada com fita adesiva levou a polícia diretamente a Guilherme de Pádua na manhã seguinte. As contradições em seus depoimentos e as manchas de sangue nos veículos foram determinantes.',
        reviravoltasESuspeitos: 'Guilherme de Pádua compareceu à delegacia para consolar a família de Daniella antes de ser desmascarado. Inicialmente confessou sozinho, mas a perícia técnica e testemunhas provaram a participação ativa de sua esposa grávida, Paula Thomaz, como cúmplice e coautora.',
        julgamentoEDesfecho: 'Em 1997, ambos foram julgados e condenados por homicídio duplamente qualificado com motivo torpe e recurso que impossibilitou a defesa da vítima. Guilherme foi condenado a 19 anos de prisão e Paula a 18 anos e 6 meses.',
        impactoHistorico: 'A dor e mobilização de Glória Perez resultou na primeira iniciativa popular de alteração da Lei dos Crimes Hediondos (Lei 8.072/90) da história do Brasil, retirando a fiança e endurecendo o cumprimento de pena para homicídios qualificados.'
      },
      fontesEMidia: ['Arquivos Judiciais do Tribunal de Justiça do Rio de Janeiro', 'Revista Veja (Edições de 1992/1993)', 'Documentários jornalísticos'],
      selecionadoParaLivro: true
    },
    {
      id: 'crime_br_1992_carandiru',
      tituloCaso: 'O Massacre do Carandiru (Pavilhão 9)',
      pais: 'Brasil',
      cidadeEstado: 'São Paulo, SP',
      anoOuPeriodo: '1992',
      nivelRepercussao: 'Maior massacre prisional da história brasileira, com repercussão global nos principais veículos da imprensa internacional e órgãos de Direitos Humanos.',
      vitimasOuAlvos: '111 detentos da Casa de Detenção de São Paulo',
      autoresOuAcusados: 'Comando da Tropa de Choque e oficiais da Polícia Militar de São Paulo',
      resumoBreve: 'Em 2 de outubro de 1992, uma briga no Pavilhão 9 da Casa de Detenção desencadeou uma intervenção militar que culminou na morte de 111 presos desarmados.',
      artigoCompleto: {
        cenaECrime: 'Uma disputa durante uma partida de futebol de várzea no segundo andar do Pavilhão 9 deu início a um tumulto generalizado. A direção do presídio solicitou a entrada da Polícia Militar. Mais de 300 policiais da Tropa de Choque e ROTA invadiram o prédio com armas de grosso calibre.',
        investigacaoEPericia: 'A perícia balística revelou que a grande maioria dos tiros foi disparada de fora para dentro das celas, e mais de 70% das vítimas foram atingidas na cabeça e no tórax, caracterizando execuções sumárias sem confronto armado direto.',
        reviravoltasESuspeitos: 'A contagem de mortos foi ocultada até o término da votação das eleições municipais que ocorriam no mesmo fim de semana. Nenhum policial militar foi morto na operação.',
        julgamentoEDesfecho: 'O coronel Ubiratan Guimarães foi condenado a 632 anos de prisão em 2001, sentença posteriormente anulada em 2006. Mais de 70 policiais foram condenados em júris populares ao longo das décadas seguintes.',
        impactoHistorico: 'O episódio acelerou o fechamento definitivo da Casa de Detenção em 2002 e serviu de estopim histórico para a criação da maior facção criminosa organizada de São Paulo.'
      },
      fontesEMidia: ['Relatório OEA de Direitos Humanos', 'Livro Estação Carandiru (Drauzio Varella)', 'Jornal Folha de S.Paulo'],
      selecionadoParaLivro: true
    },
    {
      id: 'crime_us_1994_oj_simpson',
      tituloCaso: 'O Julgamento do Século: O Caso O.J. Simpson',
      pais: 'Estados Unidos (EUA)',
      cidadeEstado: 'Los Angeles, Califórnia',
      anoOuPeriodo: '1994',
      nivelRepercussao: 'Transmitido ao vivo para mais de 100 milhões de pessoas no mundo inteiro, paralisando a economia americana no dia do veredito.',
      vitimasOuAlvos: 'Nicole Brown Simpson e Ronald Goldman',
      autoresOuAcusados: 'O.J. Simpson (astro do futebol americano e celebridade de Hollywood)',
      resumoBreve: 'Em junho de 1994, os corpos de Nicole e Ronald foram encontrados esfaqueados em Brentwood. A perseguição na Ford Bronco branca e o longo julgamento televiso dividiram os EUA.',
      artigoCompleto: {
        cenaECrime: 'Na noite de 12 de junho de 1994, Nicole Brown Simpson e seu amigo Ronald Goldman foram encontrados mortos no pátio de sua residência em Brentwood, Los Angeles, com múltiplas facadas na garganta e no peito.',
        investigacaoEPericia: 'A polícia encontrou uma luva de couro ensanguentada na cena e outra idêntica na mansão de Simpson, acompanhadas de gotas de sangue compatíveis com o DNA de O.J. em seu Ford Bronco.',
        reviravoltasESuspeitos: 'A célebre perseguição na rodovia transmitida em helicópteros parou os EUA. No tribunal, a defesa liderada por Johnnie Cochran acusou o detetive Mark Fuhrman de racismo e desmontou a cadeia de custódia das evidências forenses.',
        julgamentoEDesfecho: 'Em 3 de outubro de 1995, o júri considerou Simpson "não culpado" na esfera criminal. No entanto, em 1997, a corte civil o condenou a pagar 33,5 milhões de dólares por responsabilidade na morte das vítimas.',
        impactoHistorico: 'Transformou a cobertura midiática de crimes, o papel da perícia de DNA na justiça americana e evidenciou profundas fraturas raciais na sociedade americana.'
      },
      fontesEMidia: ['CNN Live Court Coverage', 'Los Angeles Times Archives', 'Corte Superior de Los Angeles'],
      selecionadoParaLivro: true
    },
    {
      id: 'crime_us_1978_ted_bundy',
      tituloCaso: 'A Captura Definitiva de Ted Bundy (A Fuga e os Ataques em Chi Omega)',
      pais: 'Estados Unidos (EUA)',
      cidadeEstado: 'Tallahassee, Flórida',
      anoOuPeriodo: '1978',
      nivelRepercussao: 'Primeiro julgamento de assassino em série transmitido na televisão americana em rede nacional, cunhando o termo serial killer.',
      vitimasOuAlvos: 'Estudantes da república Chi Omega (Lisa Levy, Margaret Bowman) e Kimberly Leach',
      autoresOuAcusados: 'Theodore Robert Bundy',
      resumoBreve: 'Após fugir de duas prisões no Colorado, Ted Bundy viajou até a Flórida em 1978 e invadiu a fraternidade Chi Omega, cometendo assassinatos antes de ser preso por uma blitz rotineira.',
      artigoCompleto: {
        cenaECrime: 'Na madrugada de 15 de janeiro de 1978, Bundy entrou sorrateiramente na república feminina da Universidade Estadual da Flórida e atacou quatro jovens em seus quartos em menos de 15 minutos, deixando duas mortas e duas gravemente feridas.',
        investigacaoEPericia: 'O exame odontológico forense desempenhou papel revolucionário: as marcas de mordida encontradas no corpo da vítima Lisa Levy foram sobrepostas com os moldes dentários de Bundy.',
        reviravoltasESuspeitos: 'Bundy atuou como seu próprio advogado em plenário, demonstrando arrogância carismática e desafiando juízes e promotores.',
        julgamentoEDesfecho: 'Condenado à pena de morte por eletrocussão na Flórida. Foi executado na cadeira elétrica em janeiro de 1989 após confessar mais de 30 assassinatos em múltiplos estados americanos.',
        impactoHistorico: 'Estabeleceu padrões científicos da odontologia forense e a integração do FBI para rastreamento de criminosos interestaduais via sistema VICAP.'
      },
      fontesEMidia: ['Arquivo Histórico do FBI', 'The Stranger Beside Me (Ann Rule)', 'Tallahassee Democrat'],
      selecionadoParaLivro: true
    }
  ];

  // -------------------------------------------------------------
  // FALLBACK DOCUMENTAL DE HISTÓRIA DE REIS E DINASTIAS
  // -------------------------------------------------------------
  private static readonly REIS_FALLBACK: HistoriaReiCaso[] = [
    {
      id: 'rei_en_henrique_viii',
      tituloReiOuReinado: 'Henrique VIII e as Seis Rainhas (A Ruptura de Roma)',
      reinoOuPais: 'Inglaterra',
      epocaOuSeculo: 'Século XVI (1509–1547)',
      monarcaOuDinastia: 'Dinastia Tudor (Rei Henrique VIII)',
      nivelImpacto: 'Mudou para sempre o mapa religioso e geopolítico da Europa ocidental, fundando a Igreja da Inglaterra.',
      principaisEventos: 'Divórcio de Catarina de Aragão, execução de Ana Bolena, Act of Supremacy (1534), dissolução dos mosteiros.',
      resumoBreve: 'A busca obsessiva por um herdeiro masculino levou Henrique VIII a desafiar o Papa, decapitar rainhas e concentrar poder absoluto no Parlamento inglês.',
      artigoCompleto: {
        ascensaoAoTrono: 'Henrique VIII assumiu a coroa em 1509 aos 17 anos, jovem e culto, desposando Catarina de Aragão, viúva de seu irmão mais velho Arthur.',
        guerrasEConquistas: 'Financiou expedições navais na França e na Escócia, fundando as bases do poderio naval que mais tarde ergueria a Royal Navy britânica.',
        conspiracoesETraicoes: 'O caso com Ana Bolena gerou a ruptura com a Igreja Católica. Quando Ana não deu à luz um herdeiro masculino, foi falsamente acusada de adultério, incesto e traição, sendo decapitada na Torre de Londres.',
        quedaOuLegado: 'Teve seis esposas (duas decapitadas, duas divorciadas, uma falecida e uma sobrevivente). Deixou como herdeiro Eduardo VI e, futuramente, a era de ouro de Elizabeth I.',
        fatosCuriosos: 'Compunha músicas e poesias, mas tornou-se um tirano obeso e paranoico nos últimos anos de vida após um grave ferimento em torneio de justa.'
      },
      selecionadoParaLivro: true
    },
    {
      id: 'rei_fr_luis_xiv',
      tituloReiOuReinado: 'Luís XIV: O Rei Sol e o Palácio de Versalhes',
      reinoOuPais: 'França',
      epocaOuSeculo: 'Século XVII e XVIII (1643–1715)',
      monarcaOuDinastia: 'Dinastia Bourbon (Luís XIV)',
      nivelImpacto: 'O mais longo reinado da história europeia documentada (72 anos e 110 dias), símbolo supremo do absolutismo monárquico.',
      principaisEventos: 'Construção do Palácio de Versalhes, domesticação da nobreza francesa, Revogação do Édito de Nantes, Guerra de Sucessão Espanhola.',
      resumoBreve: 'Com a célebre premissa "L’État, c’est moi" (O Estado sou eu), Luís XIV centralizou toda a aristocracia em Versalhes sob sua órbita solar.',
      artigoCompleto: {
        ascensaoAoTrono: 'Coroado ainda criança em 1643 sob a regência de sua mãe e do Cardeal Mazarino, sobreviveu à rebelião aristocrática da Fronda, jurando jamais permitir que nobres desafiassem o trono.',
        guerrasEConquistas: 'Transformou a França na maior potência militar do continente através de campanhas nos Países Baixos, no Reno e na Espanha.',
        conspiracoesETraicoes: 'Subjugou a alta nobreza forçando-os a morar na corte de Versalhes, disputando favores matinais banais (como entregar as camisas do rei) em vez de conspirar em suas províncias.',
        quedaOuLegado: 'Criou as bases culturais da França como epicentro das artes, moda e etiqueta diplomática, mas deixou dívidas colossais que culminariam na Revolução Francesa 74 anos após sua morte.',
        fatosCuriosos: 'Era apaixonado por balé e chegou a se fantasiar de Apolo nas apresentações da corte, origem de sua alcunha perpétua de "Rei Sol".'
      },
      selecionadoParaLivro: true
    },
    {
      id: 'rei_br_pedro_i',
      tituloReiOuReinado: 'D. Pedro I: O Grito do Ipiranga e a Abdicação da Coroa',
      reinoOuPais: 'Brasil Imperial / Portugal',
      epocaOuSeculo: 'Século XIX (1822–1834)',
      monarcaOuDinastia: 'Casa de Bragança (Imperador D. Pedro I / Rei D. Pedro IV)',
      nivelImpacto: 'Fundador do Império do Brasil, redator da primeira Constituição de 1824 e vencedor das Guerras Liberais em Portugal.',
      principaisEventos: 'Dia do Fico (1822), Proclamação da Independência às margens do Ipiranga, Guerra da Cisplatina, Abdicação em 1831.',
      resumoBreve: 'Figura impetuosa e contraditória que rompeu com sua pátria-mãe para coroar-se Imperador do Brasil e, anos depois, abdicou do trono para lutar contra o irmão absolutista em Portugal.',
      artigoCompleto: {
        ascensaoAoTrono: 'Chegou ao Brasil aos 9 anos fugindo das invasões napoleônicas. Tornou-se Príncipe Regente após o retorno de seu pai D. João VI a Lisboa em 1821.',
        guerrasEConquistas: 'Desafiou as Cortes de Lisboa, proclamou a Independência do Brasil em 7 de setembro de 1822 e organizou as tropas imperiais nas guerras de independência na Bahia e no Maranhão.',
        conspiracoesETraicoes: 'O relacionamento polêmico com a Marquesa de Santos e a dissolução violenta da Constituinte de 1823 na Noite da Agonia isolaram politicamente o imperador.',
        quedaOuLegado: 'Abdicou em 1831 em favor de seu filho D. Pedro II, de apenas 5 anos, e partiu para a Europa, onde derrotou D. Miguel e restaurou o liberalismo constitucional em Portugal.',
        fatosCuriosos: 'Deixou seu coração embalsamado na cidade do Porto como tributo aos cidadãos que lutaram a seu lado, relíquia que viajou ao Brasil no bicentenário da Independência.'
      },
      selecionadoParaLivro: true
    }
  ];

  // -------------------------------------------------------------
  // BUSCA INTELIGENTE DE CRIMES REAIS VIA IA (OU FALLBACK SEGURO)
  // -------------------------------------------------------------
  public static async buscarCrimesReais(params: {
    pais: string;
    anoOuPeriodo: string;
    idioma?: string;
    chamarAiFn?: (prompt: string, opt?: any) => Promise<any>;
  }): Promise<CrimeRealCaso[]> {
    const isEn = Boolean(params.idioma && /ingl|en/i.test(params.idioma));
    const paisLimpo = params.pais.trim() || 'Brasil';
    const periodoLimpo = params.anoOuPeriodo.trim() || '1990-2000';

    if (params.chamarAiFn) {
      try {
        const prompt = isEn
          ? `You are a world-class investigative journalist and true-crime researcher.
TASK: Research real, authentic criminal cases that had MASSIVE MEDIA AND PUBLIC IMPACT in the country "${paisLimpo}" around the year/period "${periodoLimpo}".
MANDATORY CRITERIA:
1. Every case MUST be 100% REAL, famous, historical and documented by law enforcement and press.
2. High public repercussion (front-page news, national shock, trials of the century).
3. Provide a full journalistic dossier for EACH crime with factual rigor.
4. Return between 3 and 5 distinct cases from that period.

RETURN ONLY VALID JSON (no markdown formatting, no code blocks):
[
  {
    "id": "crime_${Date.now()}_1",
    "tituloCaso": "Case Name",
    "pais": "${paisLimpo}",
    "cidadeEstado": "City, State",
    "anoOuPeriodo": "Exact Year",
    "nivelRepercussao": "Detailed description of how deeply this case shocked society",
    "vitimasOuAlvos": "Victims and targets",
    "autoresOuAcusados": "Perpetrators or suspects",
    "resumoBreve": "Summary in 2-3 compelling sentences",
    "artigoCompleto": {
      "cenaECrime": "Detailed account of the crime scene and how it took place",
      "investigacaoEPericia": "Forensic evidence, detective work and clues",
      "reviravoltasESuspeitos": "Interrogations, contradictions, alibis and plot twists",
      "julgamentoEDesfecho": "Court trial, sentences, appeals and ultimate resolution",
      "impactoHistorico": "Lasting legacy in law, journalism and culture"
    },
    "fontesEMidia": ["Official Court Records", "Major Newspaper"],
    "selecionadoParaLivro": true
  }
]`
          : `Você é um jornalista investigativo especialista em Crimes Reais (True Crime) e história forense.
TAREFA: Realize uma busca aprofundada por crimes reais que tiveram ENORME REPERCUSSÃO NACIONAL E PÚBLICA no país "${paisLimpo}" no ano/período "${periodoLimpo}".
CRITÉRIOS OBRIGATÓRIOS:
1. Todos os crimes DEVEM ser 100% VERÍDICOS, notórios e amplamente noticiados pela imprensa e pela justiça.
2. Casos de grande comoção popular (manchetes de capa de jornal, julgamentos do século, crimes que mudaram leis).
3. Forneça um dossiê factual investigativo completo para CADA crime.
4. Retorne de 3 a 5 casos emblemáticos distintos daquele período.

Retorne APENAS um array JSON válido (sem blocos de código nem markdown):
[
  {
    "id": "crime_${Date.now()}_1",
    "tituloCaso": "Nome do Crime / Caso Notório",
    "pais": "${paisLimpo}",
    "cidadeEstado": "Cidade, Estado",
    "anoOuPeriodo": "Ano exato do crime",
    "nivelRepercussao": "Descrição detalhada do tamanho do choque na sociedade e na mídia",
    "vitimasOuAlvos": "Vítimas ou pessoas afetadas",
    "autoresOuAcusados": "Acusados ou condenados",
    "resumoBreve": "Resumo envolvente de 2 a 3 frases",
    "artigoCompleto": {
      "cenaECrime": "Relato detalhado da cena, modus operandi e descoberta",
      "investigacaoEPericia": "O trabalho dos detetives, perícia científica e pistas",
      "reviravoltasESuspeitos": "Interrogatórios, confissões, contradições e álibis",
      "julgamentoEDesfecho": "O tribunal do júri, condenações e o desfecho judicial",
      "impactoHistorico": "Marcas deixadas na sociedade, leis ou na cultura popular"
    },
    "fontesEMidia": ["Processo Judicial", "Imprensa da Época"],
    "selecionadoParaLivro": true
  }
]`;

        const res = await params.chamarAiFn(prompt, { temperature: 0.7, maxTokens: 4000 });
        const raw = typeof res === 'string' ? res : res?.texto || '';
        const clean = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(clean);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item, idx) => ({
            id: item.id || `crime_live_${Date.now()}_${idx}`,
            tituloCaso: item.tituloCaso || `Caso Notório ${idx + 1}`,
            pais: item.pais || paisLimpo,
            cidadeEstado: item.cidadeEstado || paisLimpo,
            anoOuPeriodo: item.anoOuPeriodo || periodoLimpo,
            nivelRepercussao: item.nivelRepercussao || 'Ampla repercussão na imprensa e tribunais',
            vitimasOuAlvos: item.vitimasOuAlvos || 'Não informado',
            autoresOuAcusados: item.autoresOuAcusados || 'Não informado',
            resumoBreve: item.resumoBreve || '',
            artigoCompleto: {
              cenaECrime: item.artigoCompleto?.cenaECrime || '',
              investigacaoEPericia: item.artigoCompleto?.investigacaoEPericia || '',
              reviravoltasESuspeitos: item.artigoCompleto?.reviravoltasESuspeitos || '',
              julgamentoEDesfecho: item.artigoCompleto?.julgamentoEDesfecho || '',
              impactoHistorico: item.artigoCompleto?.impactoHistorico || ''
            },
            fontesEMidia: Array.isArray(item.fontesEMidia) ? item.fontesEMidia : ['Arquivos Jurídicos', 'Imprensa Oficial'],
            selecionadoParaLivro: true
          }));
        }
      } catch (err) {
        console.warn('[TrueCrimeService] Falha na busca por IA, utilizando base documental de fallback:', err);
      }
    }

    // Filtra ou adapta a base de fallback
    const filtrados = this.CRIMES_FALLBACK.filter(c => 
      c.pais.toLowerCase().includes(paisLimpo.toLowerCase()) ||
      paisLimpo.toLowerCase().includes(c.pais.toLowerCase())
    );

    if (filtrados.length > 0) return filtrados;
    return this.CRIMES_FALLBACK;
  }

  // -------------------------------------------------------------
  // BUSCA DE HISTÓRIA DE REIS VIA IA (OU FALLBACK SEGURO)
  // -------------------------------------------------------------
  public static async buscarHistoriaReis(params: {
    reinoOuPais: string;
    epocaOuSeculo: string;
    idioma?: string;
    chamarAiFn?: (prompt: string, opt?: any) => Promise<any>;
  }): Promise<HistoriaReiCaso[]> {
    const isEn = Boolean(params.idioma && /ingl|en/i.test(params.idioma));
    const reinoLimpo = params.reinoOuPais.trim() || 'Inglaterra';
    const epocaLimpa = params.epocaOuSeculo.trim() || 'Século XVI';

    if (params.chamarAiFn) {
      try {
        const prompt = isEn
          ? `You are an expert historian specializing in monarchies, royal dynasties and crowns.
TASK: Research major historical kings, queens or royal dynasties of "${reinoLimpo}" in the era/century "${epocaLimpa}".
CRITERIA:
1. Document authentic, historically proven facts with high dramatic and political weight (palace intrigues, battles, coronations, executions, betrayals).
2. Provide a detailed article for each monarch/dynasty.
3. Return between 3 and 5 compelling royal chronicles.

RETURN ONLY VALID JSON (no markdown):
[
  {
    "id": "rei_${Date.now()}_1",
    "tituloReiOuReinado": "Monarch / Reign Title",
    "reinoOuPais": "${reinoLimpo}",
    "epocaOuSeculo": "${epocaLimpa}",
    "monarcaOuDinastia": "Monarch Name and Dynasty",
    "nivelImpacto": "Historical impact on the realm and world",
    "principaisEventos": "Key events and battles",
    "resumoBreve": "Gripping 2-3 sentence overview",
    "artigoCompleto": {
      "ascensaoAoTrono": "Ascension to the throne and claims",
      "guerrasEConquistas": "Wars, foreign policies and conquests",
      "conspiracoesETraicoes": "Court plots, betrayals and scandals",
      "quedaOuLegado": "Death, succession or downfall",
      "fatosCuriosos": "Lesser known facts and court anecdotes"
    },
    "selecionadoParaLivro": true
  }
]`
          : `Você é um historiador e biógrafo especializado em realezas, dinastias e impérios.
TAREFA: Pesquise grandes reis, rainhas ou dinastias históricas de "${reinoLimpo}" na época/século "${epocaLimpa}".
CRITÉRIOS:
1. Resgate fatos históricos autênticos com grande peso dramático e político (intrigas de corte, traições, coroações, batalhas épicas, reformas e quedas).
2. Forneça um artigo biográfico e investigativo detalhado para cada reinado.
3. Retorne de 3 a 5 episódios ou monarcas marcantes daquele período.

Retorne APENAS um array JSON válido (sem blocos de código nem markdown):
[
  {
    "id": "rei_${Date.now()}_1",
    "tituloReiOuReinado": "Título do Rei / Reinado Notável",
    "reinoOuPais": "${reinoLimpo}",
    "epocaOuSeculo": "${epocaLimpa}",
    "monarcaOuDinastia": "Nome do Monarca e Dinastia",
    "nivelImpacto": "Impacto na história do reino e do mundo",
    "principaisEventos": "Principais eventos, batalhas e leis",
    "resumoBreve": "Resumo envolvente de 2 a 3 frases",
    "artigoCompleto": {
      "ascensaoAoTrono": "Como ascendeu ao poder e alianças de sangue",
      "guerrasEConquistas": "Campanhas militares, expansão e diplomacia",
      "conspiracoesETraicoes": "Conspirações na corte, traições e escândalos",
      "quedaOuLegado": "Fim do reinado, sucessão e legado duradouro",
      "fatosCuriosos": "Curiosidades surpreendentes e segredos da corte"
    },
    "selecionadoParaLivro": true
  }
]`;

        const res = await params.chamarAiFn(prompt, { temperature: 0.7, maxTokens: 4000 });
        const raw = typeof res === 'string' ? res : res?.texto || '';
        const clean = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(clean);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item, idx) => ({
            id: item.id || `rei_live_${Date.now()}_${idx}`,
            tituloReiOuReinado: item.tituloReiOuReinado || `Reinado Histórico ${idx + 1}`,
            reinoOuPais: item.reinoOuPais || reinoLimpo,
            epocaOuSeculo: item.epocaOuSeculo || epocaLimpa,
            monarcaOuDinastia: item.monarcaOuDinastia || 'Monarca Histórico',
            nivelImpacto: item.nivelImpacto || 'Grande impacto histórico',
            principaisEventos: item.principaisEventos || '',
            resumoBreve: item.resumoBreve || '',
            artigoCompleto: {
              ascensaoAoTrono: item.artigoCompleto?.ascensaoAoTrono || '',
              guerrasEConquistas: item.artigoCompleto?.guerrasEConquistas || '',
              conspiracoesETraicoes: item.artigoCompleto?.conspiracoesETraicoes || '',
              quedaOuLegado: item.artigoCompleto?.quedaOuLegado || '',
              fatosCuriosos: item.artigoCompleto?.fatosCuriosos || ''
            },
            selecionadoParaLivro: true
          }));
        }
      } catch (err) {
        console.warn('[RoyalHistoryService] Falha na busca por IA, utilizando fallback:', err);
      }
    }

    const filtrados = this.REIS_FALLBACK.filter(r => 
      r.reinoOuPais.toLowerCase().includes(reinoLimpo.toLowerCase()) ||
      reinoLimpo.toLowerCase().includes(r.reinoOuPais.toLowerCase())
    );

    if (filtrados.length > 0) return filtrados;
    return this.REIS_FALLBACK;
  }

  // -------------------------------------------------------------
  // COMPOR LIVRO COM OS CASOS SELECIONADOS PELO AUTOR
  // -------------------------------------------------------------
  public static comporLivroCrimes(params: {
    casos: CrimeRealCaso[];
    pais: string;
    anoOuPeriodo: string;
    idioma?: string;
    autor?: string;
  }): LivroCompostoProps {
    const isEn = Boolean(params.idioma && /ingl|en/i.test(params.idioma));
    const qtd = params.casos.length;
    const nomes = params.casos.map(c => c.tituloCaso).join(', ');

    const tituloSugerido = isEn
      ? `Infamous Crimes of ${params.pais} (${params.anoOuPeriodo})`
      : `Crimes Que Chocaram o ${params.pais} (${params.anoOuPeriodo})`;

    const subtituloSugerido = isEn
      ? `The Definitive Investigative Account of ${qtd} Shocking Real-Life Cases That Shook a Nation`
      : `O Dossiê Investigativo Definitivo de ${qtd} Casos Reais de Grande Repercussão que Marcaram a História`;

    const premissaCentral = isEn
      ? `An in-depth, forensic and journalistic exploration into the most notorious true crimes that gripped ${params.pais} during ${params.anoOuPeriodo}, examining the crime scenes, detectives' breakthroughs, courtroom battles, and their lasting societal impact.`
      : `Um mergulho investigativo e documental profundo nos crimes reais de maior repercussão ocorridos no ${params.pais} em ${params.anoOuPeriodo}. O livro disseca as evidências periciais, os bastidores policiais, os confrontos no tribunal do júri e o impacto que esses casos deixaram na opinião pública.`;

    const topicoDescricao = isEn
      ? `A compelling true-crime chronicle featuring: ${nomes}. Each case is meticulously researched with official court records, forensic details, and dramatic courtroom resolutions.`
      : `Uma crônica criminal documental baseada em fatos reais sobre os casos: ${nomes}. Cada caso é reconstruído com precisão factual, perícias da época e a repercussão nos tribunais.`;

    // Constrói o dossiê consolidado para Recursos & Fontes (Etapa 4)
    let dossie = isEn
      ? `# OFFICIAL TRUE CRIME INVESTIGATIVE DOSSIER: ${params.pais.toUpperCase()} (${params.anoOuPeriodo})\n\n`
      : `# DOSSIÊ INVESTIGATIVO OFICIAL: CRIMES REAIS NO ${params.pais.toUpperCase()} (${params.anoOuPeriodo})\n\n`;

    params.casos.forEach((caso, i) => {
      dossie += `## ${i + 1}. ${caso.tituloCaso}\n`;
      dossie += `• Local e Ano: ${caso.cidadeEstado} (${caso.anoOuPeriodo})\n`;
      dossie += `• Vítimas: ${caso.vitimasOuAlvos}\n`;
      dossie += `• Autores/Acusados: ${caso.autoresOuAcusados}\n`;
      dossie += `• Repercussão: ${caso.nivelRepercussao}\n\n`;
      dossie += `### O Crime & A Cena:\n${caso.artigoCompleto.cenaECrime}\n\n`;
      dossie += `### A Investigação Policial & Perícia:\n${caso.artigoCompleto.investigacaoEPericia}\n\n`;
      dossie += `### Reviravoltas e Interrogatórios:\n${caso.artigoCompleto.reviravoltasESuspeitos}\n\n`;
      dossie += `### O Julgamento e Desfecho Jurídico:\n${caso.artigoCompleto.julgamentoEDesfecho}\n\n`;
      dossie += `### Impacto Histórico e Memória:\n${caso.artigoCompleto.impactoHistorico}\n\n`;
      dossie += `---\n\n`;
    });

    // Constrói capítulos para a estrutura editorial
    const capitulosSugeridos: Array<{
      num: number;
      title: string;
      sectionsCount: number;
      targetWords: number;
      focus: string;
      casoId?: string;
    }> = [];

    // Capítulo 1: Introdução à época e ao cenário criminal
    capitulosSugeridos.push({
      num: 1,
      title: isEn
        ? `Chapter 1: The Dark Underbelly of ${params.pais} in ${params.anoOuPeriodo}`
        : `Capítulo 1: O Cenário da Época e os Sinais do Perigo no ${params.pais}`,
      sectionsCount: 3,
      targetWords: 1800,
      focus: isEn
        ? `Establishing the historical, economic, and policing atmosphere of ${params.pais} in ${params.anoOuPeriodo}.`
        : `Apresentar a atmosfera social, o clima policial e a imprensa do ${params.pais} naquele período.`
    });

    // Capítulos para cada caso selecionado
    params.casos.forEach((caso, idx) => {
      capitulosSugeridos.push({
        num: capitulosSugeridos.length + 1,
        title: isEn
          ? `Chapter ${capitulosSugeridos.length + 1}: ${caso.tituloCaso} — The Crime & Investigation`
          : `Capítulo ${capitulosSugeridos.length + 1}: ${caso.tituloCaso} — A Cena e as Pistas`,
        sectionsCount: 4,
        targetWords: 2400,
        focus: `Dossiê completo, reconstituição da cena e perícia forense do caso ${caso.tituloCaso}.`,
        casoId: caso.id
      });

      capitulosSugeridos.push({
        num: capitulosSugeridos.length + 1,
        title: isEn
          ? `Chapter ${capitulosSugeridos.length + 1}: ${caso.tituloCaso} — The Verdict & Legacy`
          : `Capítulo ${capitulosSugeridos.length + 1}: ${caso.tituloCaso} — O Julgamento e o Veredito`,
        sectionsCount: 4,
        targetWords: 2200,
        focus: `Os embates na corte, sentenças judiciais e as lições deixadas pelo caso ${caso.tituloCaso}.`,
        casoId: caso.id
      });
    });

    // Capítulo Final: Síntese e reflexão jurídica
    capitulosSugeridos.push({
      num: capitulosSugeridos.length + 1,
      title: isEn
        ? `Chapter ${capitulosSugeridos.length + 1}: Echoes of Justice — How These Cases Changed History`
        : `Capítulo ${capitulosSugeridos.length + 1}: Ecos da Justiça — O Legado Inesquecível dos Casos`,
      sectionsCount: 3,
      targetWords: 1900,
      focus: isEn
        ? `Concluding analysis of forensic advancements, public memory, and definitive justice.`
        : `Conclusão reflexiva sobre a evolução da perícia criminal, a memória das vítimas e a busca incessante por justiça.`
    });

    return {
      tituloSugerido,
      subtituloSugerido,
      premissaCentral,
      topicoDescricao,
      dossieArtigosConsolidado: dossie,
      capitulosSugeridos
    };
  }

  // -------------------------------------------------------------
  // COMPOR LIVRO COM CASOS HISTÓRICOS DE REIS
  // -------------------------------------------------------------
  public static comporLivroReis(params: {
    casos: HistoriaReiCaso[];
    reinoOuPais: string;
    epocaOuSeculo: string;
    idioma?: string;
    autor?: string;
  }): LivroCompostoProps {
    const isEn = Boolean(params.idioma && /ingl|en/i.test(params.idioma));
    const qtd = params.casos.length;
    const nomes = params.casos.map(r => r.tituloReiOuReinado).join(', ');

    const tituloSugerido = isEn
      ? `Crowns of Blood and Glory: The Great Kings of ${params.reinoOuPais}`
      : `Coroas de Sangue e Glória: Os Grandes Reis de ${params.reinoOuPais}`;

    const subtituloSugerido = isEn
      ? `Intrigues, Betrayals, and Triumphs Across ${params.epocaOuSeculo}`
      : `As Intrigas, Batalhas e Segredos da Corte que Moldaram ${params.epocaOuSeculo}`;

    const premissaCentral = isEn
      ? `A grand historical narrative exploring the reigns, conspiracies, battles, and intimate lives of the monarchs of ${params.reinoOuPais} during ${params.epocaOuSeculo}.`
      : `Uma grande narrativa histórica que explora os reinados, as conspirações palacianas, as grandes batalhas e a vida privada dos soberanos de ${params.reinoOuPais} no ${params.epocaOuSeculo}.`;

    const topicoDescricao = isEn
      ? `An epic royal history chronicle featuring: ${nomes}. Based on authentic historical documents, court chronicles, and political milestones.`
      : `Uma crônica histórica épica sobre os soberanos: ${nomes}. Baseada em fontes documentais autênticas, crônicas da corte e grandes marcos políticos.`;

    let dossie = isEn
      ? `# ROYAL CHRONICLES & HISTORICAL DOSSIER: ${params.reinoOuPais.toUpperCase()} (${params.epocaOuSeculo})\n\n`
      : `# DOSSIÊ HISTÓRICO DAS COROAS: ${params.reinoOuPais.toUpperCase()} (${params.epocaOuSeculo})\n\n`;

    params.casos.forEach((caso, i) => {
      dossie += `## ${i + 1}. ${caso.tituloReiOuReinado}\n`;
      dossie += `• Reino: ${caso.reinoOuPais} | Época: ${caso.epocaOuSeculo}\n`;
      dossie += `• Monarca/Dinastia: ${caso.monarcaOuDinastia}\n`;
      dossie += `• Impacto: ${caso.nivelImpacto}\n\n`;
      dossie += `### Ascensão ao Trono:\n${caso.artigoCompleto.ascensaoAoTrono}\n\n`;
      dossie += `### Guerras e Campanhas:\n${caso.artigoCompleto.guerrasEConquistas}\n\n`;
      dossie += `### Conspirações e Traições:\n${caso.artigoCompleto.conspiracoesETraicoes}\n\n`;
      dossie += `### O Fim do Reinado e Legado:\n${caso.artigoCompleto.quedaOuLegado}\n\n`;
      dossie += `### Fatos Curiosos:\n${caso.artigoCompleto.fatosCuriosos}\n\n`;
      dossie += `---\n\n`;
    });

    const capitulosSugeridos: Array<{
      num: number;
      title: string;
      sectionsCount: number;
      targetWords: number;
      focus: string;
      casoId?: string;
    }> = [];

    capitulosSugeridos.push({
      num: 1,
      title: isEn
        ? `Chapter 1: The Throne and the Scepter — The Era of ${params.epocaOuSeculo}`
        : `Capítulo 1: O Trono e o Cetro — A Época de Ouro e Sombras no ${params.reinoOuPais}`,
      sectionsCount: 3,
      targetWords: 1800,
      focus: 'Cenário geopolítico da corte, hierarquia da nobreza e disputas de poder.'
    });

    params.casos.forEach(caso => {
      capitulosSugeridos.push({
        num: capitulosSugeridos.length + 1,
        title: isEn
          ? `Chapter ${capitulosSugeridos.length + 1}: ${caso.tituloReiOuReinado} — The Ascent to Power`
          : `Capítulo ${capitulosSugeridos.length + 1}: ${caso.tituloReiOuReinado} — A Conquista da Coroa`,
        sectionsCount: 4,
        targetWords: 2400,
        focus: `A ascensão, alianças de sangue e grandes batalhas de ${caso.monarcaOuDinastia}.`,
        casoId: caso.id
      });

      capitulosSugeridos.push({
        num: capitulosSugeridos.length + 1,
        title: isEn
          ? `Chapter ${capitulosSugeridos.length + 1}: ${caso.tituloReiOuReinado} — Intrigues and the Fall`
          : `Capítulo ${capitulosSugeridos.length + 1}: ${caso.tituloReiOuReinado} — Traições e o Legado Eterno`,
        sectionsCount: 4,
        targetWords: 2200,
        focus: `Conspirações palacianas, segredos da corte e o impacto histórico de ${caso.monarcaOuDinastia}.`,
        casoId: caso.id
      });
    });

    capitulosSugeridos.push({
      num: capitulosSugeridos.length + 1,
      title: isEn
        ? `Chapter ${capitulosSugeridos.length + 1}: The Eternal Shadow of Kings`
        : `Capítulo ${capitulosSugeridos.length + 1}: A Sombra Eterna dos Monarcas`,
      sectionsCount: 3,
      targetWords: 1900,
      focus: 'Reflexão conclusiva sobre o poder real, a vaidade humana e as marcas indeléveis na história.'
    });

    return {
      tituloSugerido,
      subtituloSugerido,
      premissaCentral,
      topicoDescricao,
      dossieArtigosConsolidado: dossie,
      capitulosSugeridos
    };
  }

  // -------------------------------------------------------------
  // LISTA DE CATEGORIAS E COISAS DE CURIOSIDADES
  // -------------------------------------------------------------
  public static readonly CATEGORIAS_CURIOSIDADES = [
    'Coisas e Fatos do Mundo Todo (Geral)',
    'Países, Culturas e Tradições Bizarras',
    'Ciência Fascinante e Natureza Estranha',
    'Animais e Biologia Inacreditável',
    'Invenções Acidentais e Tecnologia',
    'História Oculta e Segredos do Passado',
    'Corpo Humano e Mistérios da Medicina',
    'Espaço, Universo e Astronomia',
    'Leis Mais Absurdas do Planeta',
    'Comidas e Gastronomia Exótica'
  ];

  // -------------------------------------------------------------
  // FALLBACK DOCUMENTAL DE CURIOSIDADES SURPREENDENTES
  // -------------------------------------------------------------
  private static readonly CURIOSIDADES_FALLBACK: CuriosidadeItem[] = [
    {
      id: 'curio_1',
      numero: 1,
      tituloFato: 'O Mel Nunca Estraga, Mesmo Após 3.000 Anos',
      categoriaOuCoisa: 'Alimentos e Ciência',
      origemOuPais: 'Egito / Global',
      fatoSurpreendente: 'Potes de mel encontrados em tumbas de faraós egípcios de mais de 3.000 anos ainda estavam perfeitamente comestíveis.',
      explicacaoDetalhada: 'O mel tem baixíssima umidade e alta acidez natural (pH entre 3 e 4,5), além de conter peróxido de hidrogênio produzido pelas abelhas, criando um ambiente biologicamente hostil para bactérias e fungos.',
      porQuePoucosSabem: 'A maioria das pessoas acredita que todo alimento orgânico tem prazo de validade rígido, mas o mel puro é imortal se mantido fechado.',
      fonteOuReferencia: 'Smithsonian Institution / National Geographic',
      selecionadoParaLivro: true
    },
    {
      id: 'curio_2',
      numero: 2,
      tituloFato: 'O Japão Possui Ilhas Governadas por Gatos e Coelhos',
      categoriaOuCoisa: 'Lugares e Países',
      origemOuPais: 'Japão',
      fatoSurpreendente: 'Na ilha de Aoshima, a população de felinos supera a de seres humanos em mais de seis para um, e na ilha de Okunoshima os coelhos selvagens dominam o território.',
      explicacaoDetalhada: 'Os gatos foram levados originalmente para controlar ratos em barcos de pescadores e se multiplicaram livremente com a diminuição dos moradores humanos, transformando o local em santuário mundial.',
      porQuePoucosSabem: 'Pouca gente sabe que existem locais geográficos habitados onde animais vivem sem predadores naturais e com assistência pública do governo.',
      fonteOuReferencia: 'Japan National Tourism Organization',
      selecionadoParaLivro: true
    },
    {
      id: 'curio_3',
      numero: 3,
      tituloFato: 'O Coração de uma Baleia-Azul é do Tamanho de um Carro Popular',
      categoriaOuCoisa: 'Animais e Biologia',
      origemOuPais: 'Oceanos Globais',
      fatoSurpreendente: 'O coração da baleia-azul pesa cerca de 180 kg e suas artérias principais são tão largas que uma criança pequena poderia nadar por dentro delas.',
      explicacaoDetalhada: 'Com batimentos que ocorrem apenas de 2 a 8 vezes por minuto no mergulho profundo, cada pulsar bombeia centenas de litros de sangue oxigenado para sustentar um animal de 150 toneladas.',
      porQuePoucosSabem: 'A escala monumental da vida marinha é difícil de visualizar sem comparações diretas com objetos da nossa rotina.',
      fonteOuReferencia: 'Royal Ontario Museum',
      selecionadoParaLivro: true
    },
    {
      id: 'curio_4',
      numero: 4,
      tituloFato: 'A Torre Eiffel Pode Ficar 15 Centímetros Mais Alta no Verão',
      categoriaOuCoisa: 'Coisas Estranhas e Física',
      origemOuPais: 'França',
      fatoSurpreendente: 'Devido à dilatação térmica do ferro pudlado, a Torre Eiffel se expande durante o calor do verão e se inclina ligeiramente para longe do sol.',
      explicacaoDetalhada: 'O calor faz com que as partículas metálicas vibrem e ocupem mais espaço. Quando a temperatura cai no inverno parisiense, a estrutura contrai de volta à sua altura original.',
      porQuePoucosSabem: 'Monumento visto como estático e rígido na verdade "respira" e muda de tamanho conforme as estações do ano.',
      fonteOuReferencia: 'Société d’Exploitation de la Tour Eiffel (SETE)',
      selecionadoParaLivro: true
    },
    {
      id: 'curio_5',
      numero: 5,
      tituloFato: 'Cleópatra Viveu Mais Perto da Invenção do iPhone do que das Pirâmides',
      categoriaOuCoisa: 'História Misteriosa',
      origemOuPais: 'Egito Antigo / Roma',
      fatoSurpreendente: 'A Grande Pirâmide de Gizé foi construída por volta de 2500 a.C. Cleópatra morreu em 30 a.C. O primeiro iPhone foi lançado em 2007 d.C.',
      explicacaoDetalhada: 'Há cerca de 2.470 anos entre as pirâmides e Cleópatra, enquanto há pouco mais de 2.030 anos entre ela e o smartphone moderno.',
      porQuePoucosSabem: 'Tendemos a agrupar todo o "Egito Antigo" como uma época só, ignorando que sua civilização durou mais de três milênios.',
      fonteOuReferencia: 'Oxford History of Ancient Egypt',
      selecionadoParaLivro: true
    }
  ];

  // -------------------------------------------------------------
  // BUSCA DE CURIOSIDADES VIA IA (OU FALLBACK SEGURO)
  // -------------------------------------------------------------
  public static async buscarCuriosidades(params: {
    sobreOQue: string;
    paisOuRegiao: string;
    quantidade: number;
    idioma?: string;
    chamarAiFn?: (prompt: string, opt?: any) => Promise<any>;
  }): Promise<CuriosidadeItem[]> {
    const isEn = Boolean(params.idioma && /ingl|en/i.test(params.idioma));
    const sobreLimpo = params.sobreOQue.trim() || 'Coisas e fatos mais estranhos do mundo';
    const regiaoLimpa = params.paisOuRegiao.trim() || 'Global / Mundo Todo';
    const qtdDesejada = Math.max(5, Math.min(50, params.quantidade || 10));

    if (params.chamarAiFn) {
      try {
        const prompt = isEn
          ? `You are an elite trivia curator, fact-checker and bestselling almanac author.
TASK: Research ${qtdDesejada} 100% FACTUAL, MIND-BLOWING AND SURPRISING CURIOSITIES/FACTS.
Topic / Focus: "${sobreLimpo}"
Origin / Country / Region: "${regiaoLimpa}"
MANDATORY CRITERIA:
1. Every fact MUST be 100% REAL, scientifically or historically verified (NO myths, NO fake trivia).
2. Highly engaging, rare, mind-blowing facts that readers rarely know.
3. Provide full explanation and context for every single item.

RETURN ONLY VALID JSON (no markdown formatting, no code blocks):
[
  {
    "id": "curio_${Date.now()}_1",
    "numero": 1,
    "tituloFato": "Eye-catching Fact Headline",
    "categoriaOuCoisa": "Category / Subject",
    "origemOuPais": "${regiaoLimpa}",
    "fatoSurpreendente": "The surprising core fact in 1-2 punchy sentences",
    "explicacaoDetalhada": "In-depth explanation of why and how this happens",
    "porQuePoucosSabem": "Why this fact is obscure or counter-intuitive",
    "fonteOuReferencia": "Scientific journal or verified source",
    "selecionadoParaLivro": true
  }
]`
          : `Você é um curador mestre de almanaque, pesquisador de fatos e autor de livros de curiosidades bestsellers na Amazon KDP.
TAREFA: Pesquise ${qtdDesejada} CURIOSIDADES E FATOS 100% VERÍDICOS, INACREDITÁVEIS E FASCINANTES.
Sobre o que: "${sobreLimpo}"
Origem / País / Região: "${regiaoLimpa}"
CRITÉRIOS OBRIGATÓRIOS:
1. Todos os fatos DEVEM ser 100% REAIS, cientificamente ou historicamente comprovados (nada de mitos populares falsos ou fake news).
2. Curiosidades de alto impacto ("que parecem mentira mas são verdade"), que prendem a atenção instantaneamente.
3. Forneça explicação aprofundada de como e por que acontece, com fontes confiáveis.

Retorne APENAS um array JSON válido (sem blocos de código nem markdown):
[
  {
    "id": "curio_${Date.now()}_1",
    "numero": 1,
    "tituloFato": "Título Impactante do Fato",
    "categoriaOuCoisa": "Categoria ou Tipo de Coisa",
    "origemOuPais": "${regiaoLimpa}",
    "fatoSurpreendente": "O fato chocante resumido em 1 a 2 frases magnéticas",
    "explicacaoDetalhada": "Explicação completa e detalhada de como e por que isso acontece",
    "porQuePoucosSabem": "Por que quase ninguém sabe disso ou a razão do senso comum errar",
    "fonteOuReferencia": "Revista científica, museu ou documento oficial",
    "selecionadoParaLivro": true
  }
]`;

        const res = await params.chamarAiFn(prompt, { temperature: 0.75, maxTokens: 4000 });
        const raw = typeof res === 'string' ? res : res?.texto || '';
        const clean = raw.replace(/\`\`\`json/gi, '').replace(/\`\`\`/g, '').trim();
        const parsed = JSON.parse(clean);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item, idx) => ({
            id: item.id || `curio_live_${Date.now()}_${idx}`,
            numero: item.numero || idx + 1,
            tituloFato: item.tituloFato || `Fato Incrível ${idx + 1}`,
            categoriaOuCoisa: item.categoriaOuCoisa || sobreLimpo,
            origemOuPais: item.origemOuPais || regiaoLimpa,
            fatoSurpreendente: item.fatoSurpreendente || '',
            explicacaoDetalhada: item.explicacaoDetalhada || '',
            porQuePoucosSabem: item.porQuePoucosSabem || '',
            fonteOuReferencia: item.fonteOuReferencia || 'Fatos Verificados',
            selecionadoParaLivro: true
          }));
        }
      } catch (err) {
        console.warn('[CuriositiesService] Falha na busca por IA, utilizando fallback:', err);
      }
    }

    return this.CURIOSIDADES_FALLBACK;
  }

  // -------------------------------------------------------------
  // COMPOR LIVRO COM AS CURIOSIDADES SELECIONADAS PELO AUTOR
  // -------------------------------------------------------------
  public static comporLivroCuriosidades(params: {
    curiosidades: CuriosidadeItem[];
    sobreOQue: string;
    paisOuRegiao: string;
    quantidadeTotal: number;
    idioma?: string;
    autor?: string;
  }): LivroCompostoProps {
    const isEn = Boolean(params.idioma && /ingl|en/i.test(params.idioma));
    const qtd = params.quantidadeTotal || params.curiosidades.length || 50;
    const tema = params.sobreOQue.trim() || 'Fatos Inacreditáveis';
    const regiao = params.paisOuRegiao.trim() || 'do Mundo';

    const tituloSugerido = isEn
      ? `${qtd} Mind-Blowing Facts About ${tema} (${regiao})`
      : `${qtd} Curiosidades Absurdas Sobre ${tema} (${regiao})`;

    const subtituloSugerido = isEn
      ? `Fascinating, Little-Known, and 100% Verified Truths That Will Completely Change the Way You See the World`
      : `Fatos Factualmente Verídicos, Estranhos e Desconhecidos que Parecem Mentira mas Vão Explodir Sua Mente`;

    const premissaCentral = isEn
      ? `An engaging, high-curiosity almanac revealing ${qtd} extraordinary, little-known truths about ${tema} from ${regiao}, packed with scientific explanations, historical backstories, and verified sources.`
      : `Um almanaque fascinante e magnético reunindo ${qtd} fatos e curiosidades reais sobre ${tema} (${regiao}), dissecando a ciência, a história e os segredos por trás de cada fenômeno de forma divertida e memorável.`;

    const topicoDescricao = isEn
      ? `A rich collection of verified facts covering: ${tema} in ${regiao}. Designed for curious minds, trivia lovers, and readers seeking high-dopamine knowledge.`
      : `Uma coletânea rica de curiosidades verificadas cobrindo: ${tema} em ${regiao}. Ideal para leitores curiosos, amantes de trivia e leituras dinâmicas.`;

    // Constrói o dossiê consolidado para Recursos & Fontes (Etapa 4)
    let dossie = isEn
      ? `# COMPLETE VERIFIED CURIOSITIES & TRIVIA DOSSIER: ${tema.toUpperCase()} (${regiao.toUpperCase()})\n\n`
      : `# DOSSIÊ COMPLETO DE CURIOSIDADES E FATOS REAIS: ${tema.toUpperCase()} (${regiao.toUpperCase()})\n\n`;

    params.curiosidades.forEach((c, idx) => {
      dossie += `## Fato ${idx + 1}: ${c.tituloFato}\n`;
      dossie += `• Origem/Região: ${c.origemOuPais} | Categoria: ${c.categoriaOuCoisa}\n`;
      dossie += `• O Fato: ${c.fatoSurpreendente}\n`;
      dossie += `• Explicação Científica/Histórica: ${c.explicacaoDetalhada}\n`;
      dossie += `• Por Que Poucos Sabem: ${c.porQuePoucosSabem}\n`;
      dossie += `• Fonte/Referência: ${c.fonteOuReferencia}\n\n---\n\n`;
    });

    // Constrói estrutura de capítulos no Sumário
    // Divide em blocos temáticos
    const numCaps = Math.max(5, Math.min(12, Math.ceil(params.curiosidades.length / 5)));
    const fatosPorCap = Math.ceil(params.curiosidades.length / numCaps);

    const capitulosSugeridos: Array<{
      num: number;
      title: string;
      sectionsCount: number;
      targetWords: number;
      focus: string;
    }> = [];

    capitulosSugeridos.push({
      num: 1,
      title: isEn
        ? `Chapter 1: The Gateway to the Bizarre — Mind-Bending Truths to Start`
        : `Capítulo 1: A Fronteira do Inacreditável — Fatos de Entrada que Desafiam a Lógica`,
      sectionsCount: 3,
      targetWords: 1600,
      focus: 'Apresentar a proposta do livro e os primeiros grandes fatos de impacto imediato.'
    });

    for (let i = 1; i < numCaps; i++) {
      const startIdx = i * fatosPorCap;
      const fatosBloco = params.curiosidades.slice(startIdx, startIdx + fatosPorCap);
      const amostra = fatosBloco[0]?.tituloFato || `Bloco ${i + 1}`;

      capitulosSugeridos.push({
        num: capitulosSugeridos.length + 1,
        title: isEn
          ? `Chapter ${capitulosSugeridos.length + 1}: Unbelievable Secrets (${amostra})`
          : `Capítulo ${capitulosSugeridos.length + 1}: Segredos Desconhecidos (${amostra})`,
        sectionsCount: 4,
        targetWords: 1800,
        focus: `Exploração aprofundada de ${fatosBloco.length || 5} fatos fascinantes sobre ${tema}.`
      });
    }

    capitulosSugeridos.push({
      num: capitulosSugeridos.length + 1,
      title: isEn
        ? `Chapter ${capitulosSugeridos.length + 1}: The Ultimate Enigmas and Final Revelations`
        : `Capítulo ${capitulosSugeridos.length + 1}: O Almanaque Supremo — Revelações Finais que Ficam na Memória`,
      sectionsCount: 3,
      targetWords: 1700,
      focus: 'Fatos de encerramento, curiosidades mais surpreendentes e conclusão do almanaque.'
    });

    return {
      tituloSugerido,
      subtituloSugerido,
      premissaCentral,
      topicoDescricao,
      dossieArtigosConsolidado: dossie,
      capitulosSugeridos
    };
  }
}
