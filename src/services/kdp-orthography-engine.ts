// ============================================================================
// MOTOR DE PRECISÃO ORTOGRÁFICA & SANITIZAÇÃO EDITORIAL DE CAPAS KDP
// Garante ortografia, acentuação e cedilhas perfeitas no português (e outros idiomas).
// Impede erros como "financas" ao invés de "Finanças", "gestao" ao invés de "Gestão", etc.
// ============================================================================

/**
 * Dicionário de termos editoriais e palavras de títulos/categorias com acentuação estrita
 */
const DICIONARIO_ORTOGRAFIA_PORTUGUES: Record<string, string> = {
  // Finanças, Dinheiro e Investimentos
  'financas': 'Finanças',
  'financa': 'Finança',
  'gestao': 'Gestão',
  'patrimonio': 'Patrimônio',
  'patrimonial': 'Patrimonial',
  'economico': 'Econômico',
  'economica': 'Econômica',
  'economia': 'Economia',
  'investimento': 'Investimento',
  'investimentos': 'Investimentos',
  'orcamento': 'Orçamento',
  'inflacao': 'Inflação',
  'aposentadoria': 'Aposentadoria',
  'lucro': 'Lucro',
  'acoes': 'Ações',
  'acao': 'Ação',
  'negocio': 'Negócio',
  'negocios': 'Negócios',

  // Liderança, Produtividade e Negócios
  'lideranca': 'Liderança',
  'lider': 'Líder',
  'lideres': 'Líderes',
  'estrategia': 'Estratégia',
  'estrategias': 'Estratégias',
  'estrategico': 'Estratégico',
  'estrategica': 'Estratégica',
  'inovacao': 'Inovação',
  'inovacoes': 'Inovações',
  'inteligencia': 'Inteligência',
  'inteligente': 'Inteligente',
  'comunicacao': 'Comunicação',
  'producao': 'Produção',
  'produtividade': 'Produtividade',
  'decisao': 'Decisão',
  'decisoes': 'Decisões',
  'solucao': 'Solução',
  'solucoes': 'Soluções',
  'funcao': 'Função',
  'funcoes': 'Funções',
  'direcao': 'Direção',
  'geracao': 'Geração',
  'publicacao': 'Publicação',
  'visao': 'Visão',
  'missao': 'Missão',
  'ambicao': 'Ambição',

  // Hábitos, Mente e Psicologia
  'habito': 'Hábito',
  'habitos': 'Hábitos',
  'cerebro': 'Cérebro',
  'atencao': 'Atenção',
  'emocao': 'Emoção',
  'emocoes': 'Emoções',
  'motivacao': 'Motivação',
  'superacao': 'Superação',
  'transformacao': 'Transformação',
  'revolucao': 'Revolução',
  'evolucao': 'Evolução',
  'licoes': 'Lições',
  'licao': 'Lição',
  'ciencia': 'Ciência',
  'cientifico': 'Científico',
  'cientifica': 'Científica',
  'psicologia': 'Psicologia',
  'filosofia': 'Filosofia',
  'sabedoria': 'Sabedoria',
  'paciencia': 'Paciência',
  'resiliencia': 'Resiliência',

  // Saúde, Bem-Estar e Estilo de Vida
  'saude': 'Saúde',
  'saudavel': 'Saudável',
  'nutricao': 'Nutrição',
  'alimentacao': 'Alimentação',
  'coracao': 'Coração',
  'exercicio': 'Exercício',
  'exercicios': 'Exercícios',
  'pratica': 'Prática',
  'pratico': 'Prático',
  'praticas': 'Práticas',
  'praticos': 'Práticos',

  // Livros, Guias e Educação
  'educacao': 'Educação',
  'introducao': 'Introdução',
  'conclusao': 'Conclusão',
  'historia': 'História',
  'historias': 'Histórias',
  'cronica': 'Crônica',
  'cronicas': 'Crônicas',
  'ficcao': 'Ficção',
  'ilustracao': 'Ilustração',
  'ilustracoes': 'Ilustrações',
  'edicao': 'Edição',
  'colecao': 'Coleção',
  'versao': 'Versão',
  'padrao': 'Padrão',
  'metodo': 'Método',
  'metodos': 'Métodos',
  'guia': 'Guia',
  'manual': 'Manual',
  'modulo': 'Módulo',
  'capitulo': 'Capítulo',
  'capitulos': 'Capítulos',
  'pagina': 'Página',
  'paginas': 'Páginas',
  'sumario': 'Sumário',
  'prologo': 'Prólogo',
  'epilogo': 'Epílogo',

  // Termos de Fantasia, Aventura e Infantil
  'misterio': 'Mistério',
  'misterios': 'Mistérios',
  'maldicao': 'Maldição',
  'bencao': 'Bênção',
  'dragao': 'Dragão',
  'dragoes': 'Dragões',
  'coracao-selvagem': 'Coração Selvagem',
  'aventura': 'Aventura',
  'dinossauro': 'Dinossauro',
  'dinossauros': 'Dinossauros',
  'colorir': 'Colorir'
};

/**
 * Remove diacríticos e acentos para comparação normalizada
 */
function removerAcentosComparacao(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * Corrige uma palavra individual aplicando o dicionário de acentuação e regras morfológicas
 */
export function corrigirPalavraOrtografia(palavra: string): string {
  if (!palavra || palavra.trim().length <= 1) return palavra;

  // Preserva pontuações anexadas (ex: "financas,", "gestao!")
  const match = palavra.match(/^([^\w\sá-úÁ-ÚçÇ]*)([\wá-úÁ-ÚçÇ]+)([^\w\sá-úÁ-ÚçÇ]*)$/);
  if (!match) return palavra;

  const prefixo = match[1] || '';
  const nucleo = match[2];
  const sufixo = match[3] || '';

  const chaveLimpa = removerAcentosComparacao(nucleo);
  const isTudoMaiusculo = nucleo === nucleo.toUpperCase() && nucleo.length > 1;
  const isPrimeiraMaiuscula = nucleo[0] === nucleo[0].toUpperCase();

  // 1. Busca exata no dicionário curado
  if (DICIONARIO_ORTOGRAFIA_PORTUGUES[chaveLimpa]) {
    const palavraCorrigida = DICIONARIO_ORTOGRAFIA_PORTUGUES[chaveLimpa];
    let resultado = palavraCorrigida;

    if (isTudoMaiusculo) {
      resultado = palavraCorrigida.toUpperCase();
    } else if (isPrimeiraMaiuscula) {
      resultado = palavraCorrigida.charAt(0).toUpperCase() + palavraCorrigida.slice(1);
    } else {
      resultado = palavraCorrigida.toLowerCase();
    }
    return prefixo + resultado + sufixo;
  }

  // 2. Regras morfológicas heurísticas em português
  let morfologico = nucleo;

  // Terminações -cao -> -ção
  if (chaveLimpa.endsWith('cao') && chaveLimpa.length > 4) {
    morfologico = nucleo.replace(/cao$/i, (m) => m === 'CAO' ? 'ÇÃO' : m === 'Cao' ? 'Ção' : 'ção');
  }
  // Terminações -coes -> -ções
  else if (chaveLimpa.endsWith('coes') && chaveLimpa.length > 5) {
    morfologico = nucleo.replace(/coes$/i, (m) => m === 'COES' ? 'ÇÕES' : m === 'Coes' ? 'Ções' : 'ções');
  }
  // Terminações -sao -> -são
  else if (chaveLimpa.endsWith('sao') && chaveLimpa.length > 4 && !chaveLimpa.endsWith('ssao')) {
    morfologico = nucleo.replace(/sao$/i, (m) => m === 'SAO' ? 'SÃO' : m === 'Sao' ? 'São' : 'são');
  }
  // Terminações -ancia -> -ância
  else if (chaveLimpa.endsWith('ancia') && chaveLimpa.length > 5) {
    morfologico = nucleo.replace(/ancia$/i, (m) => m === 'ANCIA' ? 'ÂNCIA' : m === 'Ancia' ? 'Ância' : 'ância');
  }
  // Terminações -encia -> -ência
  else if (chaveLimpa.endsWith('encia') && chaveLimpa.length > 5) {
    morfologico = nucleo.replace(/encia$/i, (m) => m === 'ENCIA' ? 'ÊNCIA' : m === 'Encia' ? 'Ência' : 'ência');
  }
  // Terminações -orio -> -ório
  else if (chaveLimpa.endsWith('orio') && chaveLimpa.length > 5) {
    morfologico = nucleo.replace(/orio$/i, (m) => m === 'ORIO' ? 'ÓRIO' : m === 'Orio' ? 'Ório' : 'ório');
  }
  // Terminações -aria -> -ária
  else if (chaveLimpa.endsWith('aria') && chaveLimpa.length > 5 && !['maria', 'padaria', 'livraria'].includes(chaveLimpa)) {
    morfologico = nucleo.replace(/aria$/i, (m) => m === 'ARIA' ? 'ÁRIA' : m === 'Aria' ? 'Ária' : 'ária');
  }

  return prefixo + morfologico + sufixo;
}

/**
 * Sanitiza e repara ortograficamente uma frase ou título completo para a capa
 */
export function sanitizarOrtografiaEditorialCapa(texto: string): string {
  if (!texto || typeof texto !== 'string') return '';

  // Substituições diretas de casos críticos documentados pelo usuário
  let limpo = texto
    .replace(/\bfinancas\b/gi, 'Finanças')
    .replace(/\bFINANCAS\b/g, 'FINANÇAS')
    .replace(/\bgestao\b/gi, 'Gestão')
    .replace(/\bGESTAO\b/g, 'GESTÃO')
    .replace(/\bpatrimonio\b/gi, 'Patrimônio')
    .replace(/\bPATRIMONIO\b/g, 'PATRIMÔNIO')
    .replace(/\blideranca\b/gi, 'Liderança')
    .replace(/\bLIDERANCA\b/g, 'LIDERANÇA')
    .replace(/\beducacao\b/gi, 'Educação')
    .replace(/\bEDUCACAO\b/g, 'EDUCAÇÃO')
    .replace(/\bhabitos\b/gi, 'Hábitos')
    .replace(/\bHABITOS\b/g, 'HÁBITOS')
    .replace(/\bciencia\b/gi, 'Ciência')
    .replace(/\bCIENCIA\b/g, 'CIÊNCIA')
    .replace(/\bnegocios\b/gi, 'Negócios')
    .replace(/\bNEGOCIOS\b/g, 'NEGÓCIOS');

  // Itera por cada token para garantir integridade morfológica
  const palavras = limpo.split(/\s+/);
  const palavrasCorrigidas = palavras.map(corrigirPalavraOrtografia);

  return palavrasCorrigidas.join(' ');
}

/**
 * Sanitiza o prompt visual para modelos de difusão de imagem (FLUX / Imagen / Replicate)
 * IMPEDE RIGOROSAMENTE que a IA tente escrever palavras, letras ou títulos na arte gerada.
 * Converte conceitos temáticos para descritores visuais limpos em inglês.
 */
export function sanitizarPromptArteSemTexto(generoOuTema: string, promptUsuario?: string): string {
  const g = removerAcentosComparacao(generoOuTema);

  let cenaConceitual = 'minimalist fine art editorial background, dramatic atmospheric volumetric lighting, uncluttered space';

  if (g.includes('finan') || g.includes('dinheiro') || g.includes('patrimon') || g.includes('invest') || g.includes('riqueza')) {
    cenaConceitual = 'conceptual wealth and security scene, modern sleek architectural skyscrapers during golden hour, obsidian marble textures, warm atmospheric cinematic light, pristine negative space';
  } else if (g.includes('thriller') || g.includes('suspense') || g.includes('misterio') || g.includes('crime')) {
    cenaConceitual = 'cinematic dark thriller scene, mysterious foggy pine forest, solitary cabin with warm window glow, dramatic volumetric moonlight, shadowy atmospheric depth';
  } else if (g.includes('infantil') || g.includes('colorir') || g.includes('dino') || g.includes('crianca')) {
    cenaConceitual = 'vibrant playful illustration, cute friendly dinosaur in prehistoric jungle, rich lush greens and warm sunlight, clean cheerful cartoon style';
  } else if (g.includes('sudoku') || g.includes('puzzle') || g.includes('desafio') || g.includes('logica')) {
    cenaConceitual = 'minimalist sophisticated geometric composition, matte dark graphite slate with subtle glowing grid lines, modern intellectual aesthetic';
  } else if (g.includes('habito') || g.includes('produtiv') || g.includes('mente') || g.includes('desenvolvimento')) {
    cenaConceitual = 'conceptual personal growth photography, solitary figure gazing at vast sunlit horizon from mountain peak, clean open sky, inspiring golden morning light';
  } else if (g.includes('ficcao') || g.includes('sci-fi') || g.includes('espaco')) {
    cenaConceitual = 'cinematic deep cosmos scene, distant glowing nebula and sleek minimalist celestial vessel, deep indigo and starfield';
  } else if (g.includes('romance') || g.includes('amor')) {
    cenaConceitual = 'poetic romantic atmospheric lighting, soft golden hour boulevard, warm cinematic depth of field, gentle floral and twilight tones';
  }

  const cleanUserPrompt = promptUsuario && promptUsuario.trim().length > 5
    ? promptUsuario
        .replace(/\b(book[\s-]?cover|bookcover|capa de livro|capa|poster|cartaz)\b/gi, 'cinematic scene')
        .trim()
    : cenaConceitual;

  const basePrompt = cleanUserPrompt || cenaConceitual;

  // Blindagem definitiva anti-texto e anti-ambientes domésticos clichês:
  // Proíbe textualmente qualquer tentativa de renderizar letras/palavras e ambientes monótonos de sala
  return `${basePrompt}, vertical 2:3 book ratio.
CRITICAL MANDATORY RULES: ABSOLUTELY NO TEXT, NO LETTERS, NO WORDS, NO TYPOGRAPHY, NO LETTERING, NO FAKE ALPHABET, NO EMBEDDED WORDS, NO GIBBERISH WORDS, NO "FINANCAS", NO "FINANCES", NO WRITING, NO BOOK TITLES, NO AUTHOR NAMES, NO CAPTIONS, NO WATERMARKS, NO POLLINATIONS LOGOS, NO BADGES, NO CIRCULAR SEALS, NO MEDALS, NO STAMPS.
CRITICAL SCENE DIVERSITY RULE: ABSOLUTELY NO ORDINARY INDOOR LIVING ROOM, NO DOMESTIC ROOM, NO MUNDANE SOFA, NO BORING APARTMENT INTERIOR. Always render evocative cinematic outdoor locations, dramatic architectural fine art, atmospheric horizons or fine-art conceptual staging with 100% clean pristine composition for programmatic canvas typography.`;
}
