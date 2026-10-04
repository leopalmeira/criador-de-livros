// ================================================================
// CATÁLOGO DE TEMAS (60) — o tema é escolhido ANTES do título
// ================================================================
export type ThemeKind = 'ficcao' | 'nao-ficcao' | 'infantil' | 'atividades' | 'misto';

export interface BookTheme {
  id: string;
  label: string;
  kind: ThemeKind;
  /** exige faixa etária obrigatória */
  childrenBook: boolean;
  subthemes: string[];
  /** termo para pesquisa de mercado Amazon */
  marketQuery: string;
}

const t = (label: string, kind: ThemeKind, subthemes: string[], childrenBook = false, marketQuery?: string): BookTheme => ({
  id: label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  label, kind, childrenBook, subthemes, marketQuery: marketQuery || label,
});

export const BOOK_THEMES: BookTheme[] = [
  t('Mistério', 'ficcao', ['Cidade pequena', 'Casa antiga', 'Desaparecimento', 'Detetive amador']),
  t('Investigação criminal', 'ficcao', ['Procedimental policial', 'Cold case', 'Perícia forense', 'Detetive particular']),
  t('Thriller psicológico', 'ficcao', ['Narrador não confiável', 'Obsessão', 'Manipulação', 'Memória falsa']),
  t('Suspense', 'ficcao', ['Perseguição', 'Segredo de família', 'Reféns', 'Conspiração']),
  t('Romance', 'ficcao', ['Inimigos para amantes', 'Segunda chance', 'Amor à distância', 'Amizade que vira amor']),
  t('Romance contemporâneo', 'ficcao', ['Vida corporativa', 'Cidade grande', 'Recomeço', 'Família moderna']),
  t('Romance histórico', 'ficcao', ['Século XIX', 'Guerra', 'Corte e nobreza', 'Brasil colonial']),
  t('Fantasia', 'ficcao', ['Alta fantasia', 'Fantasia urbana', 'Magia e academias', 'Reinos em guerra']),
  t('Ficção científica', 'ficcao', ['Viagem espacial', 'Distopia', 'Inteligência artificial', 'Pós-apocalipse']),
  t('Terror', 'ficcao', ['Casa assombrada', 'Folclore', 'Seita', 'Sobrenatural']),
  t('Horror psicológico', 'ficcao', ['Paranoia', 'Isolamento', 'Pesadelo', 'Perda de identidade']),
  t('Aventura', 'ficcao', ['Expedição', 'Sobrevivência', 'Tesouro perdido', 'Viagem épica']),
  t('Drama', 'ficcao', ['Conflito familiar', 'Superação', 'Perda e luto', 'Dilema moral']),
  t('Biografia', 'nao-ficcao', ['Personalidade histórica', 'Empreendedor', 'Artista', 'Esportista']),
  t('Memórias', 'nao-ficcao', ['Infância', 'Imigração', 'Carreira', 'Superação pessoal']),
  t('Desenvolvimento pessoal', 'nao-ficcao', ['Hábitos', 'Autoconfiança', 'Mentalidade', 'Propósito de vida']),
  t('Produtividade', 'nao-ficcao', ['Gestão do tempo', 'Foco profundo', 'Rotinas', 'Organização digital']),
  t('Finanças pessoais', 'nao-ficcao', ['Sair das dívidas', 'Orçamento', 'Reserva de emergência', 'Aposentadoria']),
  t('Investimentos', 'nao-ficcao', ['Renda fixa', 'Ações', 'Fundos imobiliários', 'Iniciantes']),
  t('Negócios', 'nao-ficcao', ['Pequenas empresas', 'Vendas', 'Estratégia', 'Gestão']),
  t('Empreendedorismo', 'nao-ficcao', ['Primeiro negócio', 'Negócio digital', 'Startups', 'Renda extra']),
  t('Marketing', 'nao-ficcao', ['Redes sociais', 'Copywriting', 'Marca pessoal', 'Tráfego pago']),
  t('Liderança', 'nao-ficcao', ['Equipes remotas', 'Comunicação', 'Primeiro cargo de gestão', 'Cultura']),
  t('Educação', 'nao-ficcao', ['Métodos de estudo', 'Ensino em casa', 'Professores', 'Concursos']),
  t('História', 'nao-ficcao', ['Brasil', 'Idade Média', 'Guerras mundiais', 'Civilizações antigas']),
  t('Filosofia', 'nao-ficcao', ['Estoicismo', 'Ética', 'Filosofia do cotidiano', 'Existencialismo']),
  t('Psicologia', 'nao-ficcao', ['Ansiedade', 'Relacionamentos', 'Comportamento', 'Inteligência emocional']),
  t('Saúde e bem-estar', 'nao-ficcao', ['Sono', 'Alimentação', 'Exercícios', 'Saúde mental']),
  t('Espiritualidade', 'nao-ficcao', ['Meditação', 'Autoconhecimento', 'Gratidão', 'Mindfulness']),
  t('Religião', 'nao-ficcao', ['Estudo bíblico', 'Devocional', 'História das religiões', 'Vida de fé']),
  t('Crianças', 'infantil', ['Amizade', 'Família', 'Escola', 'Emoções'], true),
  t('Educação infantil', 'infantil', ['Alfabetização', 'Números', 'Cores e formas', 'Rotinas'], true),
  t('Literatura infantil', 'infantil', ['Contos de fadas', 'Fábulas', 'Histórias de bichos', 'Hora de dormir'], true),
  t('Livros para colorir', 'atividades', ['Animais', 'Mandalas', 'Fantasia', 'Natureza'], true),
  t('Atividades infantis', 'atividades', ['Recorte e colagem', 'Ligue os pontos', 'Desenho guiado', 'Coordenação motora'], true),
  t('Labirintos', 'atividades', ['Fácil', 'Médio', 'Difícil', 'Temáticos'], true),
  t('Caça-palavras', 'atividades', ['Infantil', 'Adulto', 'Temáticos', 'Letras grandes'], false),
  t('Sudoku', 'atividades', ['Iniciante', 'Intermediário', 'Avançado', 'Letras grandes'], false),
  t('Jogos de lógica', 'atividades', ['Raciocínio', 'Padrões', 'Sequências', 'Desafios mentais'], false),
  t('Casos criminais fictícios', 'misto', ['Casos curtos', 'Cena do crime', 'Pistas e evidências', 'Júri'], false),
  t('Investigação interativa', 'misto', ['Livro-jogo', 'Detetive leitor', 'Escolha o final', 'Pistas escondidas'], false),
  t('Enigmas', 'atividades', ['Charadas', 'Códigos', 'Cifras', 'Mistérios curtos'], false),
  t('Quebra-cabeças', 'atividades', ['Palavras cruzadas', 'Lógicos', 'Visuais', 'Numéricos'], false),
  t('Humor', 'misto', ['Crônicas', 'Piadas', 'Sátira', 'Situações do dia a dia']),
  t('Culinária', 'nao-ficcao', ['Receitas rápidas', 'Doces', 'Saudável', 'Cozinha regional']),
  t('Viagem', 'nao-ficcao', ['Roteiros', 'Mochilão', 'Dicas econômicas', 'Relatos']),
  t('Natureza', 'nao-ficcao', ['Jardinagem', 'Observação de aves', 'Sustentabilidade', 'Ecossistemas']),
  t('Animais', 'misto', ['Pets', 'Fauna brasileira', 'Adestramento', 'Curiosidades']),
  t('Tecnologia', 'nao-ficcao', ['Gadgets', 'Segurança digital', 'Internet', 'Futuro digital']),
  t('Inteligência Artificial', 'nao-ficcao', ['IA no trabalho', 'Prompts', 'Ética em IA', 'IA para iniciantes']),
  t('Programação', 'nao-ficcao', ['Python', 'JavaScript', 'Lógica de programação', 'Carreira dev']),
  t('História real', 'nao-ficcao', ['Crimes reais', 'Grandes eventos', 'Expedições', 'Sobrevivência real']),
  t('Clássicos e domínio público', 'misto', ['Edição comentada', 'Tradução', 'Antologia', 'Adaptação']),
  t('Guias práticos', 'nao-ficcao', ['Passo a passo', 'Checklists', 'Para iniciantes', 'Erros comuns']),
  t('Manuais', 'nao-ficcao', ['Técnicos', 'Do usuário', 'Procedimentos', 'Referência rápida']),
  t('Educação financeira infantil', 'infantil', ['Mesada', 'Economizar', 'Valor do trabalho', 'Doar e dividir'], true),
  t('Aventuras infantis', 'infantil', ['Exploradores', 'Mundo mágico', 'Animais falantes', 'Missões'], true),
  t('Contos', 'ficcao', ['Contos curtos', 'Realismo mágico', 'Contos de terror', 'Contos policiais']),
  t('Ficção policial', 'ficcao', ['Noir', 'Whodunit', 'Policial urbano', 'Delegacia']),
  t('Ficção histórica', 'ficcao', ['Antiguidade', 'Renascimento', 'Revoluções', 'Guerras']),
];

export function getTheme(id: string): BookTheme | undefined {
  return BOOK_THEMES.find(x => x.id === id);
}

export function isChildrenTheme(id: string): boolean {
  return !!getTheme(id)?.childrenBook;
}
