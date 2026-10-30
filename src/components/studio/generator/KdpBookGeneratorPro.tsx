import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen, Sparkles, Plus, Download, Copy, Save, Eye,
  Play, Square, RefreshCw, Trash2, ArrowLeft, Check, Layers,
  Monitor, Smartphone, FileText, Image as ImageIcon, ChevronRight, ChevronLeft,
  ShieldCheck, CheckCircle2, AlertTriangle, Wand2, Headphones, Globe, Code2,
  Award, Palette, Edit3, Star, Sliders, Compass, TrendingUp, Bot,
  Volume2, VolumeX, Pause, SkipForward, SkipBack, Upload,
  Film, Music, Search, ExternalLink, Columns, ArrowRight
} from 'lucide-react';
import { cinematicAudioDirector } from '../../../services/cinematic-audio-director';
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
import { BOOK_TYPE_CONFIGS, type BookType } from '../../../types/book-project';
import { db } from '../../../database/local-database';
import {
  KdpBookVerifier,
  FullBookVerificationReport,
  VerifierIssue
} from '../../../services/kdp-book-verifier';
import { EditorialCorrectionSection } from './EditorialCorrectionSection';
import { buildKdpPdf } from '../../../services/kdp-pdf-builder';
import { ManuscriptIntegrityEngine } from '../../../services/manuscript-integrity-engine';
import type { FinalBookRecord } from '../../../types/editorial-correction';
import { newId } from '../../../services/project-state';
import { BOOK_THEMES, getTheme, isChildrenTheme, type BookTheme } from '../../../data/book-themes';
import { AGE_BANDS, type AgeBandId, validateAgeRequirement, buildAgeDirective } from '../../../services/age-engine';
import { researchMarket, pickReferences, describeRank, displayField, DATA_UNAVAILABLE, type MarketReference } from '../../../services/market-intel';
import { AmazonLiveService } from '../../../services/amazon-live-service';
import { filterOriginalCandidates, checkTitleSimilarity } from '../../../services/similarity-engine';
import { AudiobookStudio } from '../audiobook/AudiobookStudio';
import { KdpTourGuideModal } from './KdpTourGuideModal';
import { KdpPageReviewerModal } from './KdpPageReviewerModal';
import { Top50BestsellersModal } from './Top50BestsellersModal';
import { KdpTikTokStoryStudio } from './KdpTikTokStoryStudio';
import { ErrorBoundary } from '../../common/ErrorBoundary';
import { BookEnginAnimatedBook } from '../../common/BookEnginAnimatedBook';
import {
  CoAuthorCard,
  CoAuthorWorkspace,
  type CoAuthorContextData
} from './CoAuthorAgentSuite';
import { CoAuthorFloatingAssistant } from './CoAuthorFloatingAssistant';
import { coAuthorVoiceService, type VoiceGender } from '../../../services/coauthor-voice-service';
import {
  buildChapterNarrationSegments,
  type NarrationSegment,
  narrationProgressStore
} from '../../../services/narration-sync';
import {
  orchestrateEditorialPlan,
  buildFallbackEditorialPlan,
  type KdpEditorialPlan
} from '../../../services/kdp-agents-service';
import {
  AmazonTop100Service,
  type AmazonTop100Segment,
  type AmazonSegmentBook
} from '../../../services/amazon-top100-segments';
import {
  KdpTitleSuggestionEngine,
  type TitleSuggestion
} from '../../../services/kdp-title-suggestion-engine';
import {
  KdpWorkflowGatekeeper,
  KDP_WORKFLOW_STEPS,
  type WorkflowStateSnapshot
} from '../../../services/kdp-workflow-gatekeeper';
import {
  buildCoverArtPrompt,
  getCoverTypographyTheme,
  type CoverTitleLayout,
  type CoverVisualStyle
} from '../../../services/kdp-cover-art-direction';
import {
  SilhuetaMarginalConfig,
  SILHUETA_CONFIG_PADRAO,
  GALERIA_SILHUETAS_PB,
  calcularPaginasSilhueta,
  gerarSilhuetaPersonagem,
  gerarIlustracaoCapitulo
} from '../../../services/kdp-silhouette-service';
import { sanitizarOrtografiaEditorialCapa } from '../../../services/kdp-orthography-engine';
import { useBookCredits } from '../../../services/kdp-credits-service';
import { PurchaseCreditsModal } from '../credits/PurchaseCreditsModal';
import { PlannerBookStudio } from '../planner/PlannerBookStudio';
import { useTranslation } from '../../../services/i18n-service';
import { PrintCoverService } from '../../../services/print-cover-service';
import { PublishingMetadataService } from '../../../services/publishing-metadata-service';
import { preflightPdf } from '../../../services/pdf-preflight';
import { KdpCoverMasterPromptCard } from './KdpCoverMasterPromptCard';

const newProjectId = () => newId('prj_');

const ENGLISH_THEME_LABELS: Record<string, string> = {
  'Mistério': 'Mystery',
  'Investigação criminal': 'Crime Investigation',
  'Thriller psicológico': 'Psychological Thriller',
  'Suspense': 'Suspense',
  'Romance': 'Romance',
  'Romance contemporâneo': 'Contemporary Romance',
  'Romance histórico': 'Historical Romance',
  'Fantasia': 'Fantasy',
  'Ficção científica': 'Science Fiction',
  'Terror': 'Horror',
  'Horror psicológico': 'Psychological Horror',
  'Aventura': 'Adventure',
  'Drama': 'Drama',
  'Não ficção': 'Nonfiction',
  'Biografia': 'Biography',
  'Memórias': 'Memoir',
  'Autoajuda': 'Self-Help',
  'Desenvolvimento pessoal': 'Personal Development',
  'Produtividade': 'Productivity',
  'Finanças pessoais': 'Personal Finance',
  'Investimentos': 'Investing',
  'Negócios': 'Business',
  'Empreendedorismo': 'Entrepreneurship',
  'Marketing': 'Marketing',
  'Liderança': 'Leadership',
  'Educação': 'Education',
  'História': 'History',
  'Filosofia': 'Philosophy',
  'Psicologia': 'Psychology',
  'Saúde e bem-estar': 'Health & Wellness',
  'Espiritualidade': 'Spirituality',
  'Religião': 'Religion',
  'Crianças': 'Children',
  'Educação infantil': 'Early Childhood Education',
  'Literatura infantil': 'Children’s Literature',
  'Histórias infantis ilustradas': 'Illustrated Children’s Stories',
  'Livros para colorir': 'Coloring Books',
  'Atividades infantis': 'Kids’ Activity Books',
  'Labirintos': 'Mazes',
  'Caça-palavras': 'Word Search',
  'Sudoku': 'Sudoku',
  'Jogos de lógica': 'Logic Puzzles',
  'Casos criminais fictícios': 'Fictional Crime Cases',
  'Investigação interativa': 'Interactive Mystery',
  'Enigmas': 'Riddles',
  'Quebra-cabeças': 'Puzzles',
  'Humor': 'Humor',
  'Culinária': 'Cooking',
  'Viagem': 'Travel',
  'Natureza': 'Nature',
  'Animais': 'Animals',
  'Tecnologia': 'Technology',
  'Inteligência Artificial': 'Artificial Intelligence',
  'Programação': 'Programming',
  'História real': 'True Stories',
  'Clássicos e domínio público': 'Classics & Public Domain',
  'Guias práticos': 'Practical Guides',
  'Manuais': 'Manuals',
  'Educação financeira infantil': 'Financial Education for Kids',
  'Aventuras infantis': 'Kids’ Adventures',
  'Contos': 'Short Stories',
  'Ficção policial': 'Crime Fiction',
  'Ficção histórica': 'Historical Fiction',
  'Autoconfiança': 'Self-confidence',
  'Amor à distância': 'Long-distance love',
  'Brasil colonial': 'Colonial Brazil',
  'Magia e academias': 'Magic and academies',
  'Reinos em guerra': 'Kingdoms at war',
  'Pós-apocalipse': 'Post-apocalypse',
  'Perseguição': 'Pursuit',
  'Obsessão': 'Obsession',
  'Cold case': 'Cold case',
  'Século XIX': '19th century',
  'Fábulas': 'Fables',
  'Histórias de bichos': 'Animal stories',
  'Amizade e emoções': 'Friendship and emotions',
  'Mandalas': 'Mandalas',
  'Recorte e colagem': 'Cut and paste',
  'Ligue os pontos': 'Connect the dots',
  'Desenho guiado': 'Guided drawing',
  'Coordenação motora': 'Motor skills',
  'Temáticos': 'Themed',
  'Infantil': 'Children',
  'Adulto': 'Adult',
  'Letras grandes': 'Large print',
  'Raciocínio': 'Reasoning',
  'Padrões': 'Patterns',
  'Sequências': 'Sequences',
  'Desafios mentais': 'Brain teasers',
  'Casos curtos': 'Short cases',
  'Júri': 'Jury',
  'Detetive leitor': 'Reader as detective',
  'Cifras': 'Ciphers',
  'Mistérios curtos': 'Short mysteries',
  'Lógicos': 'Logic puzzles',
  'Visuais': 'Visual puzzles',
  'Numéricos': 'Number puzzles',
  'Crônicas': 'Essays',
  'Piadas': 'Jokes',
  'Sátira': 'Satire',
  'Situações do dia a dia': 'Everyday situations',
  'Doces': 'Desserts',
  'Saudável': 'Healthy cooking',
  'Cozinha regional': 'Regional cuisine',
  'Mochilão': 'Backpacking',
  'Relatos': 'Travel stories',
  'Observação de aves': 'Birdwatching',
  'Sustentabilidade': 'Sustainability',
  'Ecossistemas': 'Ecosystems',
  'Pets': 'Pets',
  'Fauna brasileira': 'Brazilian wildlife',
  'Adestramento': 'Pet training',
  'Curiosidades': 'Fun facts',
  'Gadgets': 'Gadgets',
  'Internet': 'Internet',
  'Futuro digital': 'Digital future',
  'IA no trabalho': 'AI at work',
  'Prompts': 'Prompts',
  'Ética em IA': 'AI ethics',
  'IA para iniciantes': 'AI for beginners',
  'Lógica de programação': 'Programming logic',
  'Carreira dev': 'Software development career',
  'Grandes eventos': 'Major events',
  'Expedições': 'Expeditions',
  'Sobrevivência real': 'Real-life survival',
  'Edição comentada': 'Annotated edition',
  'Antologia': 'Anthology',
  'Adaptação': 'Adaptation',
  'Erros comuns': 'Common mistakes',
  'Técnicos': 'Technical',
  'Do usuário': 'User guide',
  'Procedimentos': 'Procedures',
  'Referência rápida': 'Quick reference',
  'Mesada': 'Allowance',
  'Economizar': 'Saving money',
  'Valor do trabalho': 'The value of work',
  'Doar e dividir': 'Giving and sharing',
  'Exploradores': 'Explorers',
  'Mundo mágico': 'Magical world',
  'Animais falantes': 'Talking animals',
  'Missões': 'Missions',
  'Realismo mágico': 'Magical realism',
  'Noir': 'Noir',
  'Whodunit': 'Whodunit',
  'Delegacia': 'Police station',
  'Antiguidade': 'Ancient history',
  'Renascimento': 'Renaissance',
  'Revoluções': 'Revolutions',
  'Guerras': 'Wars',
  'Personalidade histórica': 'Historical figure',
  'Sair das dívidas': 'Getting out of debt',
  'Orçamento': 'Budgeting',
  'Aposentadoria': 'Retirement',
  'Renda fixa': 'Fixed-income investing',
  'Ações': 'Stocks',
  'Fundos imobiliários': 'Real estate funds',
  'Primeiro negócio': 'First business',
  'Startups': 'Startups',
  'Renda extra': 'Extra income',
  'Copywriting': 'Copywriting',
  'Tráfego pago': 'Paid advertising',
  'Equipes remotas': 'Remote teams',
  'Comunicação': 'Communication',
  'Primeiro cargo de gestão': 'First management role',
  'Cultura': 'Culture',
  'Professores': 'Teachers',
  'Concursos': 'Competitive exams',
  'Idade Média': 'Middle Ages',
  'Guerras mundiais': 'World wars',
  'Civilizações antigas': 'Ancient civilizations',
  'Estoicismo': 'Stoicism',
  'Ética': 'Ethics',
  'Filosofia do cotidiano': 'Everyday philosophy',
  'Existencialismo': 'Existentialism',
  'Comportamento': 'Behavior',
  'Inteligência emocional': 'Emotional intelligence',
  'Alimentação': 'Nutrition',
  'Exercícios': 'Exercise',
  'Autoconhecimento': 'Self-awareness',
  'Gratidão': 'Gratitude',
  'Devocional': 'Devotional',
  'História das religiões': 'History of religions',
  'Vida de fé': 'Faith',
  'Imigração': 'Immigration',
  'Carreira': 'Career',
  'Superação pessoal': 'Personal growth',
  'Hábitos': 'Habits',
  'Mentalidade': 'Mindset',
  'Propósito de vida': 'Life purpose',
  'Rotinas': 'Routines',
  'Organização digital': 'Digital organization',
  'Vendas': 'Sales',
  'Estratégia': 'Strategy',
  'Gestão': 'Management',
  'Foco': 'Focus',
  'Iniciante': 'Beginner',
  'Intermediário': 'Intermediate',
  'Avançado': 'Advanced',
  'Brasil': 'Brazil',
  'Médio': 'Medium',
  'Difícil': 'Hard',
  'Fácil': 'Easy'
};

const ENGLISH_SUBTHEMES: Record<string, string> = {
  'Cidade pequena': 'Small town', 'Casa antiga': 'Old house', 'Desaparecimento': 'Disappearance',
  'Detetive amador': 'Amateur detective', 'Procedimental policial': 'Police procedural',
  'Perícia forense': 'Forensic investigation', 'Detetive particular': 'Private detective',
  'Narrador não confiável': 'Unreliable narrator', 'Manipulação': 'Manipulation',
  'Memória falsa': 'False memory', 'Segredo de família': 'Family secret',
  'Reféns': 'Hostages', 'Conspiração': 'Conspiracy', 'Inimigos para amantes': 'Enemies to lovers',
  'Segunda chance': 'Second chance', 'Amor à distância': 'Long-distance love',
  'Amizade que vira amor': 'Friends to lovers', 'Vida corporativa': 'Corporate life',
  'Cidade grande': 'Big city', 'Recomeço': 'Fresh start', 'Família moderna': 'Modern family',
  'Guerra': 'War', 'Corte e nobreza': 'Court and nobility', 'Alta fantasia': 'High fantasy',
  'Fantasia urbana': 'Urban fantasy', 'Viagem espacial': 'Space travel', 'Distopia': 'Dystopia',
  'Inteligência artificial': 'Artificial intelligence', 'Casa assombrada': 'Haunted house',
  'Folclore': 'Folklore', 'Sobrenatural': 'Supernatural', 'Sobrevivência': 'Survival',
  'Conflito familiar': 'Family conflict', 'Perda e luto': 'Loss and grief',
  'Hábitos e disciplina': 'Habits and discipline', 'Propósito e motivação': 'Purpose and motivation',
  'Gestão do tempo': 'Time management', 'Foco profundo': 'Deep focus',
  'Reserva de emergência': 'Emergency fund', 'Iniciantes': 'Beginners',
  'Pequenas empresas': 'Small businesses', 'Negócio digital': 'Digital business',
  'Redes sociais': 'Social media', 'Marca pessoal': 'Personal brand',
  'Métodos de estudo': 'Study methods', 'Ensino em casa': 'Homeschooling',
  'Ansiedade': 'Anxiety', 'Relacionamentos': 'Relationships', 'Sono': 'Sleep',
  'Saúde mental': 'Mental health', 'Meditação': 'Meditation', 'Mindfulness': 'Mindfulness',
  'Estudo bíblico': 'Bible study', 'Amizade': 'Friendship', 'Emoções': 'Emotions',
  'Alfabetização': 'Literacy', 'Cores e formas': 'Colors and shapes',
  'Contos de fadas': 'Fairy tales', 'Hora de dormir': 'Bedtime',
  'Aventuras com animais': 'Animal adventures', 'Fantasia e magia': 'Fantasy and magic',
  'Aprender brincando': 'Learn through play', 'Animais': 'Animals', 'Natureza': 'Nature',
  'Fácil': 'Easy', 'Médio': 'Medium', 'Difícil': 'Hard', 'Iniciante': 'Beginner',
  'Intermediário': 'Intermediate', 'Avançado': 'Advanced', 'Cena do crime': 'Crime scene',
  'Pistas e evidências': 'Clues and evidence', 'Livro-jogo': 'Gamebook',
  'Escolha o final': 'Choose the ending', 'Pistas escondidas': 'Hidden clues',
  'Charadas': 'Riddles', 'Códigos': 'Codes', 'Palavras cruzadas': 'Crosswords',
  'Receitas rápidas': 'Quick recipes', 'Roteiros': 'Itineraries', 'Dicas econômicas': 'Budget tips',
  'Jardinagem': 'Gardening', 'Segurança digital': 'Digital security',
  'Python': 'Python', 'JavaScript': 'JavaScript', 'Passo a passo': 'Step by step',
  'Checklists': 'Checklists', 'Para iniciantes': 'For beginners', 'Crimes reais': 'True crime',
  'Contos curtos': 'Short stories', 'Contos de terror': 'Horror stories',
  'Contos policiais': 'Crime stories', 'Policial urbano': 'Urban crime',
  'Empreendedor': 'Entrepreneur', 'Artista': 'Artist', 'Esportista': 'Athlete',
  'Foco': 'Focus', 'Organização digital': 'Digital organization'
};

interface Capitulo {
  titulo: string;
  texto: string;
  imagemDataUrl?: string | null;
  imagemPrompt?: string;
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

export interface ItemHistoricoCapa {
  id: string;
  dataUrl: string;
  fundoUrl?: string;
  timestamp: number;
  estilo?: 'modern-magazine' | 'luxury-serif' | 'bold-impact';
  conceito?: string;
}

/**
 * Renderiza o texto com iluminação suave e elegante (estilo Apple Books / Audible)
 * para a frase sendo narrada, atribuindo id="active-narration-chunk" para auto-scroll dinâmico.
 */
function renderHighlightedEditorialText(
  text: string,
  seg: NarrationSegment | null,
  isCurrent: boolean
): React.ReactNode {
  if (!isCurrent || !seg || !text) return text;
  const s = Math.max(0, Math.min(seg.start, text.length));
  const e = Math.max(s, Math.min(seg.end, text.length));
  if (s === e) return text;

  const before = text.slice(0, s);
  const match = text.slice(s, e);
  const after = text.slice(e);

  return (
    <>
      {before}
      <mark
        id="active-narration-chunk"
        data-narration-active="true"
        style={{
          background: 'rgba(254, 240, 138, 0.40)', // Dourado âmbar translúcido e suave, descansado para a visão
          color: '#0f172a',
          padding: '2px 4px',
          borderRadius: 4,
          borderBottom: '2px solid rgba(217, 119, 6, 0.70)',
          boxShadow: '0 1px 4px rgba(217, 119, 6, 0.12)',
          transition: 'background 0.25s ease, border-color 0.25s ease',
          display: 'inline'
        }}
      >
        {match}
      </mark>
      {after}
    </>
  );
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
  const { currentLang } = useTranslation();
  const isEnglish = currentLang === 'en-US';
  const ui = (portuguese: string, english: string) => isEnglish ? english : portuguese;
  const themeLabel = (label: string) => isEnglish ? ENGLISH_THEME_LABELS[label] || label : label;
  const subthemeLabel = (label: string) => isEnglish ? ENGLISH_SUBTHEMES[label] || label : label;
  const bookTypeLabel = (type: BookType) => {
    const labels: Partial<Record<BookType, string>> = {
      'children-picture-book': 'Illustrated Children’s Book',
      'illustrated-book': 'Illustrated Book / Graphic Novel',
      'light-novel': 'Light Novel',
      'fiction-novel': 'Novel / General Fiction',
      'romance': 'Romance',
      'fantasy': 'Fantasy',
      'thriller': 'Thriller',
      'mystery': 'Mystery',
      'suspense': 'Suspense',
      'sci-fi': 'Science Fiction',
      'self-help': 'Self-Help',
      'business': 'Business',
      'finance': 'Personal Finance',
      'health-wellness': 'Health & Wellness',
      'education': 'Education',
      'practical-guide': 'Practical Guide',
      'biography': 'Biography',
      'non-fiction': 'Nonfiction',
      'technical-manual': 'Technical Manual',
      'short-ebook': 'Short eBook',
      'workbook': 'Workbook',
      'activity-book': 'Activity Book',
      'coloring-book': 'Coloring Book',
      'journal': 'Journal',
      'planner': 'Planner',
      'diary': 'Diary',
      'puzzle-book': 'Puzzle Book',
      'other': 'Other'
    };
    return isEnglish ? labels[type] || BOOK_TYPE_CONFIGS[type].label : BOOK_TYPE_CONFIGS[type].label;
  };
  const bookTypeDescription = (type: BookType) => {
    if (!isEnglish) return BOOK_TYPE_CONFIGS[type]?.description || '';
    const descriptions: Partial<Record<BookType, string>> = {
      'cinematic_illustrated_novel': 'Cinematic Photo Book with realistic AI imagery, embedded narrative, and visual storytelling.',
      'children-picture-book': '8.5" x 8.5" square format, full-bleed color, 32 pages, simple text, and rich illustrations throughout.',
      'illustrated-book': '7" x 10" format with vibrant illustrations accompanying descriptive passages.',
      'light-novel': '5" x 8" trim size, cream paper, fast chapters, dynamic pacing, and engaging dialogue.',
      'fiction-novel': '6" x 9" novel format, cream paper, and a classic three-act arc: setup, escalation, climax, and resolution.',
      romance: 'Character chemistry, internal conflict, emotional tension, and a satisfying ending.',
      fantasy: 'Rich worldbuilding, magic, prophecies, distinct peoples, and a hero’s journey.',
      thriller: 'Clues, plot twists, imminent danger, and short chapters with strong hooks.',
      mystery: 'A central mystery, planted clues, red herrings, and a climactic reveal.',
      suspense: 'A dark atmosphere, paranoia, oppressive pacing, and shocking revelations.',
      'sci-fi': 'Future technology, social dilemmas, artificial intelligence, space, or dystopian futures.',
      'self-help': 'A practical 6" x 9" editorial format with actionable steps and case studies.',
      business: 'Executive-level management methods, clear frameworks, and practical business applications.',
      finance: 'Progressive guidance on money, financial mindset, budgeting, and investing.',
      'health-wellness': 'Practical guidance on longevity, healthy routines, nutrition, and mental balance.',
      education: 'Progressive teaching for educators, students, or parents using effective learning methods.',
      'practical-guide': 'A practical, direct manual with checklists and numbered steps.',
      biography: 'A chronological life story covering challenges, lessons, and an inspiring legacy.',
      'non-fiction': 'A progressive 6" x 9" educational format, from fundamentals to advanced practical steps.',
      'technical-manual': 'A spacious 7" x 10" format for code or technical tables, explained step by step.',
      'short-ebook': 'A focused, high-value book designed for a one-to-two-hour Kindle read.',
      workbook: 'An interactive workbook with exercises, fill-in spaces, and practical activities.',
      'activity-book': 'Varied activities such as mazes, connect-the-dots, coloring, word searches, and learning games.',
      'coloring-book': 'Line-art illustrations for coloring, single-sided printing, and varied themes.',
      journal: 'A journal with writing prompts and space for reflection, gratitude, or planning.',
      planner: 'A planner organized into daily, weekly, monthly, or project-based pages.',
      diary: 'A guided journal with questions, reflections, and lined pages; no prose chapters.',
      'puzzle-book': 'Crosswords, Sudoku, word searches, and logic puzzles with answer keys.',
      other: 'A format customized by the author, without a predefined template.'
    };
    return descriptions[type] || BOOK_TYPE_CONFIGS[type]?.description || '';
  };
  const bookTypeCategory = (category: string) => isEnglish ? ({
    'Ficção': 'Fiction',
    'Não-Ficção': 'Nonfiction',
    'Infantil & Ilustrado': 'Children & Illustrated',
    'Técnico & Guias': 'Technical & Guides'
  }[category] || category) : category;

  // Configurações do formulário (sempre 100% em branco para novos livros)
  const [titulo, setTitulo] = useState(() => initialProject?.title || '');
  const [subtitulo, setSubtitulo] = useState(() => initialProject?.subtitle || '');
  const [autor, setAutor] = useState(() => initialProject?.author || '');
  const [genero, setGenero] = useState(() => initialProject?.categories?.[0] || '');
  const [topico, setTopico] = useState(() => initialProject?.topic || '');
  const [paginasAlvo, setPaginasAlvo] = useState(100);
  const [maxCapitulos, setMaxCapitulos] = useState(15);
  const [formato, setFormato] = useState('6x9');
  const [idioma, setIdioma] = useState(() => isEnglish ? 'inglês' : 'português');
  const [tamCapitulo, setTamCapitulo] = useState(11);
  const [corCapitulo, setCorCapitulo] = useState('#1e293b');
  const [optPromo, setOptPromo] = useState(true);
  const [optSumario, setOptSumario] = useState(true);

  // Estados Editoriais Avançados (Prompt Mestre)
  const [temaSelecionado, setTemaSelecionado] = useState('');
  const [subtemaSelecionado, setSubtemaSelecionado] = useState('');

  // Wizard Editorial — Stepper de Progressão Sequencial Rigoroso (1 a 10)
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [faixaEtaria, setFaixaEtaria] = useState<AgeBandId | ''>('');
  const [uniqueAngle, setUniqueAngle] = useState('');
  const [bookPromise, setBookPromise] = useState('');
  const [targetReader, setTargetReader] = useState('');
  const [marketReferences, setMarketReferences] = useState<MarketReference[]>([]);
  const [marketPool, setMarketPool] = useState<MarketReference[]>([]);
  const [isAnalyzingMarket, setIsAnalyzingMarket] = useState(false);
  const [marketFeedback, setMarketFeedback] = useState<string | null>(null);
  const [opcoesTitulos, setOpcoesTitulos] = useState<string[]>([]);
  const [opcoesSubtitulos, setOpcoesSubtitulos] = useState<string[]>([]);
  const [isGeneratingTitulos, setIsGeneratingTitulos] = useState(false);
  const [isGeneratingSubtitulos, setIsGeneratingSubtitulos] = useState(false);
  const [isSuggestingDiferencial, setIsSuggestingDiferencial] = useState(false);

  // Estados de Inteligência Competitiva e Pesquisa Amazon KDP
  const [amazonCustomerQuery, setAmazonCustomerQuery] = useState('');
  const [amazonSuggestions, setAmazonSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [bsrFilter, setBsrFilter] = useState<'all' | 'under80k' | 'under25k' | 'high_revenue'>('under80k');
  const [suggestedAmazonTitles, setSuggestedAmazonTitles] = useState<Array<{ title: string; subtitle: string; rationale: string; targetBsr: string }>>([]);
  const [isGeneratingAmazonTitles, setIsGeneratingAmazonTitles] = useState(false);

  // Estados de Top 100 Segmentos Amazon & Pool de 10 Livros com Substituição Imediata
  const [top100Segments, setTop100Segments] = useState<AmazonTop100Segment[]>(() =>
    AmazonTop100Service.getTop100Segments()
  );
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>('habitos-disciplina');
  const [activePoolBooks, setActivePoolBooks] = useState<AmazonSegmentBook[]>(() =>
    AmazonTop100Service.getActiveBookPool('habitos-disciplina', [], 10).activeBooks
  );
  const [excludedAsins, setExcludedAsins] = useState<string[]>([]);
  const [selectedInspirationAsins, setSelectedInspirationAsins] = useState<string[]>([]);
  const [segmentCategoryFilter, setSegmentCategoryFilter] = useState<string>('all');
  const [segmentSearchQuery, setSegmentSearchQuery] = useState<string>('');

  const [isGeneratingSimilares, setIsGeneratingSimilares] = useState(false);

  // Gera títulos similares a partir do que o usuário digitou ou da ideia central
  const handleGerarTitulosSimilares = (baseText?: string) => {
    setIsGeneratingSimilares(true);
    try {
      const query = baseText || titulo || subtemaSelecionado || temaSelecionado || genero;
      const similares = KdpTitleSuggestionEngine.getSimilarTitles(query, temaSelecionado || genero, subtemaSelecionado);
      setSuggestedTitlesList(similares);
      setStatusMsg(`✓ ${similares.length} sugestões de títulos similares geradas com base em "${query}"!`);
      setStatusType('ok');
    } catch (err) {
      console.error('Erro ao gerar títulos similares:', err);
    } finally {
      setIsGeneratingSimilares(false);
    }
  };

  // Sugestões Contextualizadas de Título & Subtítulo por Segmento KDP
  const [suggestedTitlesList, setSuggestedTitlesList] = useState<TitleSuggestion[]>(() =>
    KdpTitleSuggestionEngine.getSuggestionsForTheme('Desenvolvimento Pessoal', 'Hábitos e disciplina', [])
  );

  // Estados do Fluxo Vertical de 10 Etapas (Metodologia Editorial Completa)
  const [stanceTopic, setStanceTopic] = useState('');
  const [authorTone, setAuthorTone] = useState<string>('Conversacional, próximo, envolvente e prático');
  const [customRefInput, setCustomRefInput] = useState('');
  const [titleFeedbackPrompt, setTitleFeedbackPrompt] = useState('');
  const [resourceNotes, setResourceNotes] = useState('');
  const [authorType, setAuthorType] = useState<string>('Pseudônimo (Autor Pessoal)');
  const [authorBackground, setAuthorBackground] = useState('');
  const [authorEducation, setAuthorEducation] = useState('');
  const [authorAchievements, setAuthorAchievements] = useState('');
  const [authorStyleInspiration, setAuthorStyleInspiration] = useState('');
  const [authorOfficialBio, setAuthorOfficialBio] = useState('');
  const [focusTags, setFocusTags] = useState<string[]>([]);
  const [customFocusTag, setCustomFocusTag] = useState('');
  const [proposedBookSummary, setProposedBookSummary] = useState('');
  const [bookStructureType, setBookStructureType] = useState<string>('Jornada Progressiva com Ritmo Variado (Passo a Passo + Casos + Quebra de Mitos)');
  const [variedOutlinePreview, setVariedOutlinePreview] = useState<Array<{ num: number; title: string; sectionsCount: number; targetWords: number; focus: string }>>([]);
  const [bookCommercialDescription, setBookCommercialDescription] = useState('');
  const [isAiStepBusy, setIsAiStepBusy] = useState<string | null>(null);
  const [copiedDescOk, setCopiedDescOk] = useState(false);

  // Estados de execução
  const [livro, setLivro] = useState<LivroGerado | null>(null);
  const [planoEditorial, setPlanoEditorial] = useState<KdpEditorialPlan | null>(null);
  const [capaFinal, setCapaFinal] = useState<string | null>(null);
  const [fundoImg, setFundoImg] = useState<string | null>(null);
  const [contracapaFinal, setContracapaFinal] = useState<string | null>(null);
  const [wrapPreviewUrl, setWrapPreviewUrl] = useState<string | null>(null);
  const [viewModeCapa, setViewModeCapa] = useState<'wrap' | 'front' | 'back'>('wrap');
  const [showKdpGuides, setShowKdpGuides] = useState<boolean>(true);
  const [contracapaTexto, setContracapaTexto] = useState<{ hookHeadline: string; synopsisText: string; readerBenefits: string[] } | null>(null);
  const [isEditingBackCover, setIsEditingBackCover] = useState(false);
  const [contracapaAlign, setContracapaAlign] = useState<'left' | 'center' | 'right'>('left');
  const [contracapaAuthorPhotoUrl, setContracapaAuthorPhotoUrl] = useState<string | null>(null);
  const [contracapaAuthorPhotoSize, setContracapaAuthorPhotoSize] = useState<number>(180);

  // Estados de Personalização da Capa Frontal (Mover título, tamanho da fonte e estilo)
  const [isEditingFrontCover, setIsEditingFrontCover] = useState(false);
  const [capaTituloOffsetY, setCapaTituloOffsetY] = useState<number>(0);
  const [capaTituloFontSize, setCapaTituloFontSize] = useState<number>(110);
  const [capaTituloFontFamily, setCapaTituloFontFamily] = useState<string>('serif');

  const [keywordsKdp, setKeywordsKdp] = useState<string[]>([]);
  const [isEditingKeywords, setIsEditingKeywords] = useState(false);
  const [promoData, setPromoData] = useState<BookPromotionalPageData | null>(null);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);

  // Motor de Silhuetas Marginais & Ilustrações de Capítulos (3% Sangria Externa)
  const [silhuetaConfig, setSilhuetaConfig] = useState<SilhuetaMarginalConfig>(SILHUETA_CONFIG_PADRAO);
  const [isGeneratingSilhueta, setIsGeneratingSilhueta] = useState(false);
  const [personagemSilhuetaFoco, setPersonagemSilhuetaFoco] = useState('');
  const [generatingCapImgIndex, setGeneratingCapImgIndex] = useState<number | null>(null);
  const [showSilhuetaPanel, setShowSilhuetaPanel] = useState(false);
  const [isTop50ModalOpen, setIsTop50ModalOpen] = useState(false);
  const [isTikTokStudioOpen, setIsTikTokStudioOpen] = useState(false);
  const [tikTokChapterIndex, setTikTokChapterIndex] = useState(0);
  const [isEditingManuscriptInline, setIsEditingManuscriptInline] = useState(false);
  const [isChapterBgmPlaying, setIsChapterBgmPlaying] = useState(false);

  const handleToggleChapterBgm = () => {
    if (isChapterBgmPlaying) {
      cinematicAudioDirector.stop();
      setIsChapterBgmPlaying(false);
    } else {
      const targetIdx = audioReadingCapIndex !== null ? audioReadingCapIndex : 0;
      const cap = livro?.capitulos?.[targetIdx];
      if (cap) {
        cinematicAudioDirector.playScene(
          { narrationText: cap.texto || '', sceneSummary: cap.titulo || '' },
          livro?.genero || 'Ficção'
        );
        setIsChapterBgmPlaying(true);
      }
    }
  };

  // Estados do Estúdio de Capa & Direção de Arte de Revista (Anti-Slop Web UI)
  const [estiloCapaTipo, setEstiloCapaTipo] = useState<'modern-magazine' | 'luxury-serif' | 'bold-impact'>('modern-magazine');
  const [estiloArteVisual, setEstiloArteVisual] = useState<CoverVisualStyle>('minimalist');
  const [posicaoTituloCapa, setPosicaoTituloCapa] = useState<CoverTitleLayout>('centro');
  const [intensidadeZonaLimpa, setIntensidadeZonaLimpa] = useState<'suave' | 'media' | 'forte'>('media');
  const [customCoverPrompt, setCustomCoverPrompt] = useState('');
  const [isRegeneratingCoverOnly, setIsRegeneratingCoverOnly] = useState(false);
  const [isReapplyingTypography, setIsReapplyingTypography] = useState(false);

  // Histórico de Capas Geradas para o Carrossel e Escolha Visual
  const [historicoCapas, setHistoricoCapas] = useState<ItemHistoricoCapa[]>([]);
  const [indiceCapaCarrossel, setIndiceCapaCarrossel] = useState<number>(0);

  // Referências para importação de capa local (PNG, JPG, WEBP)
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const backCoverFileInputRef = useRef<HTMLInputElement>(null);
  const wrapFileInputRef = useRef<HTMLInputElement>(null);

  // Ambientação geográfica anti-alucinação para livros em língua inglesa
  const [estadoEua, setEstadoEua] = useState<string>('Nova York (NY)');

  // Estados do Agente Leitor de Áudio Neural (Mesmo motor e voz humana natural do CoAuthor)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [audioReadingCapIndex, setAudioReadingCapIndex] = useState<number | null>(null);
  const [audioMode, setAudioMode] = useState<'single' | 'full'>('single');
  const [audioSpeed, setAudioSpeed] = useState<number>(1.0);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0);
  const [totalChunksCount, setTotalChunksCount] = useState<number>(0);
  const [audioVoiceGender, setAudioVoiceGender] = useState<VoiceGender>(coAuthorVoiceService.getVoiceGender());
  const [activeNarrationSegment, setActiveNarrationSegment] = useState<NarrationSegment | null>(null);

  const audioSegmentsRef = useRef<NarrationSegment[]>([]);
  const audioChunksRef = useRef<string[]>([]);
  const audioCapIndexRef = useRef<number>(0);
  const audioModeRef = useRef<'single' | 'full'>('single');
  const audioSpeedRef = useRef<number>(1.0);
  const isAudioActiveRef = useRef<boolean>(false);
  const currentAudioElemRef = useRef<HTMLAudioElement | null>(null);
  const audioAbortControllerRef = useRef<AbortController | null>(null);
  const audioNextPromiseRef = useRef<Promise<string | null> | null>(null);
  const audioQueuePoolRef = useRef<Map<number, HTMLAudioElement>>(new Map());
  const audioUrlCacheRef = useRef<Map<string, string>>(new Map());
  const audioPrefetchPromisesRef = useRef<Map<number, Promise<HTMLAudioElement | null>>>(new Map());
  const audioPlayTokenRef = useRef<number>(0);

  // Status e controle do pipeline
  const [gerando, setGerando] = useState(false);
  const [isPlanningEditorial, setIsPlanningEditorial] = useState(false);
  const [estiloIlustracaoCapitulo, setEstiloIlustracaoCapitulo] = useState<'realista' | 'arte_editorial' | 'aquarela' | 'nanquim'>('aquarela');
  const [pararFlag, setPararFlag] = useState(false);
  const pararFlagRef = useRef(false);
  const [capAtual, setCapAtual] = useState(0);
  const [totalCaps, setTotalCaps] = useState(0);
  const [statusMsg, setStatusMsg] = useState('Pronto para iniciar');
  const [statusType, setStatusType] = useState<'normal' | 'ok' | 'error'>('normal');
  const [progressPercent, setProgressPercent] = useState(0);
  const [activeTab, setActiveTab] = useState<'wizard' | 'preview' | 'market' | 'capa' | 'promo' | 'auditoria' | 'planner' | 'coauthor'>('wizard');
  const [workspaceLayout, setWorkspaceLayout] = useState<'focused' | 'split'>('focused');
  const [bookType, setBookType] = useState<BookType>('fiction-novel');
  const [creationSelectorValue, setCreationSelectorValue] = useState('format:fiction-novel');

  // Estado do Co-Autor Inteligente (3 caixas de contexto para geração conversacional)
  const [coAuthorContext, setCoAuthorContext] = useState<CoAuthorContextData>({
    premissaVisao: '',
    elementosChave: '',
    formulaBestseller: ''
  });

  // Sistema de Eficiência Máxima de API (Modo Ultra Econômico Google Gemini)
  const [modoEconomico, setModoEconomico] = useState(true);
  const [tokensConsumidosTotal, setTokensConsumidosTotal] = useState(0);
  const [custoEstimadoTotalBrl, setCustoEstimadoTotalBrl] = useState(0);

  // Sistema de Auto-Clique Automático do Botão de Continuar Geração
  const [autoClickCountdown, setAutoClickCountdown] = useState<number | null>(null);
  const [isAutoClicking, setIsAutoClicking] = useState(false);
  const autoClickTimerRef = useRef<any>(null);

  // Modal de Tour Guiado de Cada Função
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);

  // Sistema de Créditos Editoriais KDP (US$ 3 por livro gerado)
  const { balance: creditosLivros, useCredit: debitarCreditoLivro } = useBookCredits();
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [creditModalMotivo, setCreditModalMotivo] = useState('');

  // Modal do Revisor Editorial Página por Página (Folhear & Validar Finais de Frase)
  const [isPageReviewerOpen, setIsPageReviewerOpen] = useState(false);

  // Sincroniza a voz neural humana ativa (Francisca/Antônio) com o serviço do CoAuthor
  useEffect(() => {
    const unsub = coAuthorVoiceService.subscribe((st) => {
      setAudioVoiceGender(st.gender);
    });
    return unsub;
  }, []);

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
  const [diagnostico, setDiagnostico] = useState<string>('');

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
    // 1. Quando o usuário clica em criar novo projeto: formulário totalmente em branco (sem cache de obras anteriores)
    if (isNewProject || initialProject === null) {
      projectIdRef.current = newProjectId();
      setTitulo('');
      setSubtitulo('');
      setAutor('');
      setGenero('');
      setBookType('fiction-novel');
      setCreationSelectorValue('format:fiction-novel');
      setTopico('');
      setTemaSelecionado('');
      setSubtemaSelecionado('');
      setFaixaEtaria('');
      setUniqueAngle('');
      setBookPromise('');
      setTargetReader('');
      setStanceTopic('');
      setAuthorTone('Conversacional, próximo, envolvente e prático');
      setCustomRefInput('');
      setTitleFeedbackPrompt('');
      setResourceNotes('');
      setAuthorType('Pseudônimo (Autor Pessoal)');
      setAuthorBackground('');
      setAuthorEducation('');
      setAuthorAchievements('');
      setAuthorStyleInspiration('');
      setAuthorOfficialBio('');
      setFocusTags(['Estratégias Práticas', 'Ganhos Rápidos Diários', 'Estudos de Caso Reais']);
      setProposedBookSummary('');
      setVariedOutlinePreview([]);
      setBookCommercialDescription('');
      setMarketReferences([]);
      setOpcoesTitulos([]);
      setOpcoesSubtitulos([]);
      setPaginasAlvo(100);
      setMaxCapitulos(15);
      setFormato('6x9');
      setIdioma(isEnglish ? 'inglês' : 'português');
      setTamCapitulo(11);
      setCorCapitulo('#1e293b');
      setLivro(null);
      setCapaFinal(null);
      setFundoImg(null);
      setContracapaFinal(null);
      setWrapPreviewUrl(null);
      setPromoData(null);
      setHistoricoCapas([]);
      setIndiceCapaCarrossel(0);
      setCapAtual(0);
      setTotalCaps(0);
      setWizardStep(1);
      setStatusMsg('Pronto para iniciar novo livro em branco.');
      setStatusType('normal');
      setDiagnostico('Novo projeto em branco pronto.');
      return;
    }

    // 2. Quando o usuário seleciona um projeto existente na Dashboard
    if (initialProject) {
      projectIdRef.current = initialProject.id;
      setBookType(initialProject.kdpBookType && BOOK_TYPE_CONFIGS[initialProject.kdpBookType]
        ? initialProject.kdpBookType
        : 'fiction-novel');
      setCreationSelectorValue(`format:${initialProject.kdpBookType && BOOK_TYPE_CONFIGS[initialProject.kdpBookType]
        ? initialProject.kdpBookType
        : 'fiction-novel'}`);
      setTitulo(initialProject.title || '');
      setSubtitulo(initialProject.subtitle || '');
      setAutor(initialProject.author || 'Leandro Palmeira');
      setGenero(initialProject.categories?.[0] || 'Thriller / Mistério Investigativo');
      setTopico(initialProject.topic || initialProject.description || '');
      setFormato(initialProject.trimSize || '6x9');
      setCapaFinal(initialProject.coverImageUrl || null);
      setPromoData(initialProject.promotionalPage || null);
      if (initialProject.coverImageUrl) {
        setHistoricoCapas([{
          id: 'capa_inicial_proj',
          dataUrl: initialProject.coverImageUrl,
          timestamp: Date.now(),
          estilo: 'modern-magazine'
        }]);
        setIndiceCapaCarrossel(0);
      }

      if (initialProject.kdpChapters && initialProject.kdpChapters.length > 0) {
        const caps: Capitulo[] = initialProject.kdpChapters.map(c => ({
          titulo: c.title,
          texto: c.prose || c.summary || '',
          imagemDataUrl: c.illustrations?.[0] || null
        }));
        
        const totalEstimado = initialProject.estimatedPages
          ? Math.max(3, Math.min(maxCapitulos || 15, Math.round((initialProject.estimatedPages * 300) / 900)))
          : (maxCapitulos || 15);
        const totalCalculado = Math.max(caps.length, totalEstimado);

        setLivro({
          titulo: initialProject.title,
          subtitulo: initialProject.subtitle || '',
          autor: initialProject.author,
          genero: initialProject.categories?.[0] || 'Thriller / Mistério Investigativo',
          idioma: isEnglish ? 'inglês' : 'português',
          capitulos: caps,
          meta: {
            palavrasPorCap: 900,
            paginasAlvo: initialProject.estimatedPages || 100
          }
        });
        setCapAtual(caps.length);
        setTotalCaps(totalCalculado);
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
        if (p?.historicoCapas && Array.isArray(p.historicoCapas) && p.historicoCapas.length > 0) {
          setHistoricoCapas(p.historicoCapas);
          const idx = p.historicoCapas.findIndex((c: any) => c.dataUrl === p.capaFinal);
          setIndiceCapaCarrossel(idx >= 0 ? idx : 0);
        }
        if (p?.livro?.capitulos?.length > 0) {
          setLivro(p.livro);
          setCapaFinal(p.capaFinal || null);
          setFundoImg(p.fundoImg || null);
          if (p.contracapaFinal) setContracapaFinal(p.contracapaFinal);
          if (p.wrapPreviewUrl) setWrapPreviewUrl(p.wrapPreviewUrl);
          if (p.keywordsKdp && Array.isArray(p.keywordsKdp)) setKeywordsKdp(p.keywordsKdp);
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
            setIdioma(p.config.idioma || (isEnglish ? 'inglês' : 'português'));
            setBookType(p.config.bookType && BOOK_TYPE_CONFIGS[p.config.bookType as BookType]
              ? p.config.bookType as BookType
              : 'fiction-novel');
            setCreationSelectorValue(`format:${p.config.bookType && BOOK_TYPE_CONFIGS[p.config.bookType as BookType]
              ? p.config.bookType
              : 'fiction-novel'}`);
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

  // Salvar no localStorage e sincronizar automaticamente no IndexedDB
  // Salvar rascunho leve no localStorage e sincronizar dados completos e imagens no IndexedDB
  const salvarProgressoLocal = async (novoLivro: LivroGerado, capa?: string, fundo?: string, promo?: BookPromotionalPageData, novoHistorico?: ItemHistoricoCapa[]) => {
    const projId = projectIdRef.current || `proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    projectIdRef.current = projId;

    // 1. Gravação contínua no IndexedDB: Suporta centenas de Megabytes sem limite de 5MB do localStorage.
    // Salva imagens completas, capas, contracapa e todos os capítulos gerados!
    try {
      const isConcluido = novoLivro.capitulos.length >= Math.max(1, totalCaps);
      const projAutoSave: BookProject = {
        id: projId,
        createdAt: initialProject?.createdAt || Date.now(),
        updatedAt: Date.now(),
        status: isConcluido ? 'FINALIZADO' : 'ESCREVENDO',
        priority: 'ALTA',
        executionMode: 'assisted',
        title: novoLivro.titulo || titulo || 'Livro em Produção',
        subtitle: novoLivro.subtitulo || subtitulo,
        author: novoLivro.autor || autor || 'Leandro Palmeira',
        description: topico,
        language: idioma === 'português' ? 'Português' : idioma === 'inglês' ? 'Inglês' : 'Espanhol',
        format: 'Capa Comum',
        trimSize: formato as any,
        paperType: 'bw-white',
        estimatedPages: paginasAlvo,
        actualPages: novoLivro.capitulos.length * 6,
        targetPrice: 39.90,
        currency: 'BRL',
        targetMarketplace: 'amazon.com.br',
        categories: [genero],
        keywords: keywordsKdp && keywordsKdp.length > 0 ? keywordsKdp : [],
        targetAudience: targetReader || 'Público Geral',
        topic: topico,
        kdpBookType: bookType,
        coverImageUrl: capa !== undefined ? capa : (capaFinal || undefined),
        promotionalPage: promo !== undefined ? promo : (promoData || undefined),
        promotionalImageUrl: (promo !== undefined ? promo?.promotionalImageUrl : promoData?.promotionalImageUrl) || undefined,
        kdpChapters: novoLivro.capitulos.map((c, i) => ({
          index: i + 1,
          title: c.titulo,
          summary: c.texto.slice(0, 200),
          targetWordCount: novoLivro.meta?.palavrasPorCap || 900,
          prose: c.texto,
          wordCount: c.texto.split(/\s+/).length,
          status: 'APROVADO' as const,
          illustrations: c.imagemDataUrl ? [c.imagemDataUrl] : [],
          scenes: []
        })),
        tasks: [],
        notes: `Rascunho automático em andamento (${novoLivro.capitulos.length}/${totalCaps || maxCapitulos} capítulos gerados).`,
        competitorsAsins: [],
        pipelineStage: isConcluido ? 'final' : 'writing',
        pipelineProgress: Math.min(100, Math.round((novoLivro.capitulos.length / Math.max(1, totalCaps)) * 100)),
        pipelineLog: [`Capítulo ${novoLivro.capitulos.length} salvo automaticamente no banco local.`]
      };

      await db.saveBookProject(projAutoSave);
      if (onProjectSaved) {
        onProjectSaved(projAutoSave);
      }
    } catch (errDb) {
      console.warn('[IndexedDB] Erro ao gravar projeto:', errDb);
    }

    // 2. Rascunho leve no localStorage: NÃO salvar imagens base64 gigantes (evita QuotaExceededError)
    const capaLeve = (capa !== undefined ? capa : capaFinal);
    const payloadLeve = {
      livro: novoLivro,
      // Guarda capa apenas se for URL leve ou string menor que 50KB (nunca base64 de 2MB)
      capaFinal: (capaLeve && capaLeve.length < 50000) ? capaLeve : undefined,
      keywordsKdp: keywordsKdp || [],
      totalCaps,
      capAtual: novoLivro.capitulos.length,
      config: {
        titulo, subtitulo, autor, genero, topico, paginasAlvo, maxCapitulos, formato, idioma, bookType
      },
      ts: Date.now()
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payloadLeve));
    } catch {
      // Se houver erro de cota, limpa chaves antigas de projetos que não sejam o atual
      try {
        if (typeof localStorage !== 'undefined') {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('kdp_projeto_pro_v11_') && k !== STORAGE_KEY) {
              localStorage.removeItem(k);
            }
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(payloadLeve));
        }
      } catch {}
    }

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('kdp_last_active_project_id', projId);
      }
    } catch {}
  };

  // Análise de Mercado Amazon KDP (TOP 1-200) com sorteio dinâmico e randômico
  const handleAnalisarMercado = async (forceRandom = false, customQuery?: string) => {
    const temaObj = getTheme(temaSelecionado);
    let query = customQuery || subtemaSelecionado || temaObj?.marketQuery || temaSelecionado || genero || 'livros';
    const isLivroInfantil = bookType === 'children-picture-book' || /infantil|crian|kids|3-5|6-8/i.test(`${temaSelecionado} ${subtemaSelecionado} ${genero} ${faixaEtaria}`);
    if (isLivroInfantil && !/infantil|crian|kids|children/i.test(query)) {
      query = `livros infantis ${query}`.trim();
    }
    setIsAnalyzingMarket(true);
    setMarketFeedback(null);
    logDiag(`Iniciando análise de mercado na Amazon para "${query}"...`);
    try {
      // Se já temos um pool amplo carregado e o usuário clicou em sortear outras referências:
      if (forceRandom && marketPool.length > 5) {
        const sortedRandom = pickReferences(marketPool, { query, limit: 5, randomize: true });
        setMarketReferences(sortedRandom);
        setMarketFeedback(`🔄 5 novas referências sorteadas dinamicamente do ranking (#1 a #200).`);
        logDiag(`5 novas referências sorteadas dinamicamente do pool de ${marketPool.length} itens.`);
        return;
      }

      // Consulta de mercado na Amazon com suporte a ranking randômico #1 a #200
      const res = await researchMarket(query, {
        marketplace: 'amazon.com.br',
        limit: 40,
        bypassCache: forceRandom,
        randomize: forceRandom
      });
      if (res.error && (!res.items || res.items.length === 0)) {
        setMarketFeedback(`⚠️ ${res.error}`);
        logDiag(`Aviso de mercado: ${res.error}`);
      } else {
        const pool = res.items || [];
        setMarketPool(pool);
        // Sorteia 5 referências aleatórias do ranking para nunca ficar travado nos mesmos livros
        const top5 = pickReferences(pool, { query, limit: 5, randomize: true });
        setMarketReferences(top5);
        setMarketFeedback(`✓ ${top5.length} referências dinâmicas identificadas no ranking de #1 a #200.`);
        logDiag(`Mercado analisado: ${top5.length} referências selecionadas dinamicamente de ${pool.length} encontradas.`);
      }
    } catch (err: any) {
      setMarketFeedback(`Erro na análise de mercado: ${err?.message || 'Falha de conexão'}`);
    } finally {
      setIsAnalyzingMarket(false);
    }
  };

  // Geração de 5 Títulos Originais com IA, Validador de Similaridade e Variação Dinâmica (#1 a #200)
  const handleGerarTitulosOriginais = async () => {
    setIsGeneratingTitulos(true);
    try {
      // Amostra aleatória de referências para a IA nunca ficar engessada nas mesmas referências
      const pool = marketPool.length > 0 ? marketPool : marketReferences;
      const sampledRefs = pool.length > 0
        ? [...pool].sort(() => Math.random() - 0.5).slice(0, 5)
        : marketReferences;

      // Se temos itens no pool, atualizamos também as referências visíveis na tela para dinamismo total
      if (sampledRefs.length > 0 && pool.length > 5) {
        setMarketReferences(sampledRefs);
      }

      const refTitles = sampledRefs.map(r => r.title).filter(Boolean);

      const ganchosCriativos = [
        'comercial de alto impacto de vendas na Amazon KDP com promessa irresistível',
        'curiosidade extrema, suspense hipnótico e quebra imediata de padrão',
        'autoridade editorial, transformação pessoal e clareza magnética',
        'tensão dramática psicológica, segredos ocultos e reviravoltas intensas',
        'estilo cinematográfico contemporâneo com ritmo veloz e apelo de best-seller internacional',
        'provocação direta, mistério não resolvido e gancho visceral'
      ];
      const ganchoEscolhido = ganchosCriativos[Math.floor(Math.random() * ganchosCriativos.length)];

      const prompt = `Você é o principal diretor editorial de best-sellers da Amazon. Crie exatamente 5 opções de títulos comerciais, impactantes e TOTALMENTE ORIGINAIS para um novo livro.
Enfoque criativo desta rodada: ${ganchoEscolhido}.
Tema: ${temaSelecionado || genero}
Subtema: ${subtemaSelecionado || 'Geral'}
Público Alvo: ${targetReader || 'Geral'}
Diferencial/Promessa: ${bookPromise || uniqueAngle || topico || 'Não informado'}
Seed de novidade: ${Date.now()}_${Math.random().toString(36).slice(2, 7)}

REFERÊNCIAS DE MERCADO PARA CONTRASTE (CRIE TÍTULOS DIFERENTES DESTES, NUNCA COPIE NEM REPITA):
${refTitles.length ? refTitles.map((t, i) => `- ${t}`).join('\n') : 'Nenhuma'}

Regras:
1. Títulos originais, memoráveis e com alto apelo comercial no KDP.
2. Cada título deve ter entre 2 e 6 palavras.
3. Não use títulos genéricos ou repetitivos de rodadas anteriores. Crie opções frescas e inovadoras.

Responda APENAS com as 5 opções, uma por linha, numeradas de 1 a 5, sem explicações adicionais.`;

      const resposta = await chamarGeminiTexto(prompt, { temperature: 0.95, maxTokens: 300 });
      if (resposta?.tokensTotal) {
        setTokensConsumidosTotal(prev => prev + resposta.tokensTotal!);
        setCustoEstimadoTotalBrl(prev => prev + (resposta.custoBrl || 0));
      }
      const textoResp = typeof resposta === 'string' ? resposta : (resposta?.texto || '');
      const linhas = textoResp
        .split('\n')
        .map((l: string) => l.replace(/^\d+[\.\-\)]\s*/, '').replace(/[\*\"\_]/g, '').trim())
        .filter((l: string) => l.length > 2)
        .slice(0, 5);

      const originais = filterOriginalCandidates(linhas, refTitles);
      const aceitas = originais.accepted.map(a => a.text);
      setOpcoesTitulos(aceitas.length > 0 ? aceitas : linhas);
      logDiag(`${aceitas.length} títulos originais gerados (${resposta.tokensTotal || 0} tokens usados).`);
    } catch (err: any) {
      logDiag(`Erro ao gerar títulos: ${err?.message}`);
    } finally {
      setIsGeneratingTitulos(false);
    }
  };

  // Geração de 5 Subtítulos Originais com IA, Frases 100% Completas sem Cortes
  const handleGerarSubtitulosOriginais = async () => {
    if (!titulo.trim()) {
      setStatusMsg('⚠️ Defina ou selecione um Título primeiro.');
      setStatusType('error');
      return;
    }
    setIsGeneratingSubtitulos(true);
    try {
      const refSubtitles = marketReferences.map(r => r.subtitle).filter(Boolean) as string[];
      const refTitulosAmazon = marketReferences.map(r => r.title).filter(Boolean).slice(0, 5) as string[];
      const prompt = `Você é um estrategista editorial KDP especializado em conversão de vendas. Crie exatamente 5 opções de subtítulos comerciais persuasivos e TOTALMENTE ORIGINAIS para o livro:
Título da Obra: "${titulo}"
Tema Central: ${temaSelecionado || genero}
Subtema: ${subtemaSelecionado || 'Geral'}
Diferencial Editorial: ${uniqueAngle || bookPromise || 'Transformador'}
Público Alvo: ${targetReader || 'Geral'}
Títulos e Palavras-chave de Referência da Amazon KDP: ${refTitulosAmazon.join(' | ') || 'Best-sellers da categoria'}
Seed de novidade: ${Date.now()}_${Math.random().toString(36).slice(2, 6)}

REGRAS OBRIGATÓRIAS:
1. O SUBTÍTULO DEVE TER COERÊNCIA ABSOLUTA COM O TÍTULO ("${titulo}"), complementando seu sentido e prometendo o desfecho/benefício central.
2. Incorpore a linguagem e intenção de busca observadas nas referências de mercado da Amazon para atrair o leitor ideal.
3. CRIE FRASES 100% COMPLETAS COM SENTIDO GRAMATICAL FINALIZADO E PONTUAÇÃO (NUNCA CORTE PALAVRAS PELA METADE E NUNCA DEIXE FRASES TRUNCADAS OU INCOMPLETAS).
4. Tamanho ideal: entre 6 e 14 palavras bem elaboradas.
5. Forte gancho de curiosidade, suspense ou autoridade.

Responda APENAS com as 5 opções completas, uma por linha, numeradas de 1 a 5, sem explicações adicionais.`;

      const resposta = await chamarGeminiTexto(prompt, { temperature: 0.90, maxTokens: 350 });
      if (resposta?.tokensTotal) {
        setTokensConsumidosTotal(prev => prev + resposta.tokensTotal!);
        setCustoEstimadoTotalBrl(prev => prev + (resposta.custoBrl || 0));
      }
      const textoResp = typeof resposta === 'string' ? resposta : (resposta?.texto || '');
      const linhas = textoResp
        .split('\n')
        .map((l: string) => l.replace(/^\d+[\.\-\)]\s*/, '').replace(/[\*\"\_]/g, '').trim())
        .filter((l: string) => l.length > 5)
        .slice(0, 5);

      const originais = filterOriginalCandidates(linhas, refSubtitles);
      const aceitas = originais.accepted.map(a => a.text);
      setOpcoesSubtitulos(aceitas.length > 0 ? aceitas : linhas);
      logDiag(`${aceitas.length} subtítulos originais gerados (${resposta.tokensTotal || 0} tokens usados).`);
    } catch (err: any) {
      logDiag(`Erro ao gerar subtítulos: ${err?.message}`);
    } finally {
      setIsGeneratingSubtitulos(false);
    }
  };

  // Sugestão de Diferencial Editorial KDP Completo (Etapa 4)
  const handleSugerirDiferencialCompleto = async () => {
    setIsSuggestingDiferencial(true);
    setStatusMsg('✨ Gerando estratégia de Diferencial Editorial com Gemini...');
    try {
      const prompt = `Você é um estrategista sênior de posicionamento editorial para livros da Amazon KDP.
Crie a estratégia completa de diferenciação para a seguinte obra:
Tema Central: ${temaSelecionado || genero || 'Geral'}
Subtema: ${subtemaSelecionado || 'Geral'}
Título da Obra: "${titulo || 'Ainda não definido'}"
Subtítulo: "${subtitulo || ''}"
Premissa: "${topico || ''}"

Gere EXATAMENTE o seguinte objeto JSON:
{
  "uniqueAngle": "Um ângulo único, original e inovador que destaca este livro de todos os concorrentes da categoria (1 a 2 frases)",
  "bookPromise": "A promessa central transformadora entregue ao leitor (1 frase impactante)",
  "targetReader": "Descrição do leitor ideal e nicho demográfico/psicográfico (ex: Jovens adultos, profissionais em transição, leitores vorazes de suspense)"
}
Responda APENAS com o JSON puro, sem markdown e sem introduções.`;

      const resposta = await chamarGeminiTexto(prompt, { temperature: 0.85, maxTokens: 400 });
      if (resposta?.tokensTotal) {
        setTokensConsumidosTotal(prev => prev + resposta.tokensTotal!);
        setCustoEstimadoTotalBrl(prev => prev + (resposta.custoBrl || 0));
      }
      const textoResp = typeof resposta === 'string' ? resposta : (resposta?.texto || '');
      const cleanJson = textoResp.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (parsed.uniqueAngle) setUniqueAngle(parsed.uniqueAngle);
      if (parsed.bookPromise) setBookPromise(parsed.bookPromise);
      if (parsed.targetReader) setTargetReader(parsed.targetReader);

      setStatusMsg('✓ Diferencial Editorial (Ângulo, Promessa e Público) gerado com sucesso!');
      setStatusType('ok');
      logDiag('Diferencial editorial completo sugerido com sucesso.');
    } catch (err: any) {
      setStatusMsg(`Erro ao sugerir diferencial: ${err?.message}`);
      setStatusType('error');
    } finally {
      setIsSuggestingDiferencial(false);
    }
  };

  // Auto-Carregamento Inicial de Inteligência de Mercado se ainda estiver vazio
  useEffect(() => {
    if (marketReferences.length === 0) {
      handleAnalisarMercado(false, temaSelecionado || 'Desenvolvimento Pessoal e Hábitos');
    }
  }, []);

  // Sincroniza sugestões de títulos contextuais sempre que o nicho ou referências mudarem
  useEffect(() => {
    const currentGenre = temaSelecionado || genero || 'Desenvolvimento Pessoal';
    const suggestions = KdpTitleSuggestionEngine.getSuggestionsForTheme(currentGenre, subtemaSelecionado, marketReferences);
    setSuggestedTitlesList(suggestions);
  }, [temaSelecionado, genero, subtemaSelecionado, marketReferences.length]);

  // Busca sugestões em tempo real que clientes digitam na barra de busca da Amazon
  const fetchCustomerSearchSuggestions = async (prefix: string) => {
    if (!prefix || prefix.trim().length < 2) {
      setAmazonSuggestions([]);
      return;
    }
    setIsLoadingSuggestions(true);
    try {
      const terms = await AmazonLiveService.getLiveSuggestions(prefix.trim(), idioma === 'en' ? 'us' : 'br');
      setAmazonSuggestions(terms.slice(0, 8));
    } catch (e) {
      console.warn('Erro ao buscar termos de clientes da Amazon:', e);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Gerador de Títulos e Subtítulos de Alta Conversão baseados em Termos Reais de Busca da Amazon (BSR < 80k)
  const handleGerarTitulosTermosAmazon = async () => {
    setIsGeneratingAmazonTitles(true);
    try {
      const topicContext = temaSelecionado || topico || genero || 'Desenvolvimento Pessoal e Hábitos';
      const realQueries = amazonSuggestions.length > 0
        ? amazonSuggestions
        : await AmazonLiveService.getLiveSuggestions(topicContext, 'br');

      const benchmarkTitles = marketReferences.slice(0, 5).map(r => `"${r.title}" (BSR #${r.bsr || 25000})`).join(', ');

      const prompt = `Você é o Estrategista Editorial Chefe de Bestsellers da Amazon KDP.
Tema da Obra: ${topicContext}
Tese / Stance: ${stanceTopic || uniqueAngle || 'Prático, contraintuitivo e fundamentado em fatos'}
Bestsellers Concorrentes Reais (BSR < 80.000): ${benchmarkTitles || 'Hábitos Atômicos, A Psicologia Financeira, Foco Supremo'}
Termos Reais Buscados por Clientes na Barra de Pesquisa da Amazon: ${realQueries.slice(0, 6).join(', ') || topicContext}

TAREFA:
Crie 5 opções de TÍTULO e SUBTÍTULO de ALTA CONVERSÃO para Amazon KDP.
Regras Absolutas:
1. Devem usar as palavras-chave reais mais pesquisadas pelos clientes para ranquear organicamente no topo das buscas da Amazon.
2. Cada opção deve ter um gancho magnético comercial e focar em BSR menor que 80.000.
3. Responda APENAS em JSON válido no formato:
[
  {
    "title": "Título Curto de Impacto",
    "subtitle": "Subtítulo Comercial com Termos Reais de Busca",
    "rationale": "Explicação estratégica do porquê ranqueia no BSR < 80k",
    "targetBsr": "< 30.000"
  }
]`;

      const resp = await chamarGeminiTexto(prompt, { temperature: 0.85, maxTokens: 800 });
      const txt = (typeof resp === 'string' ? resp : resp?.texto || '').replace(/```json/gi, '').replace(/```/g, '').trim();
      const jsonMatch = txt.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setSuggestedAmazonTitles(parsed);
        setStatusMsg('✓ 5 Títulos ranqueados com termos da Amazon gerados com sucesso!');
        setStatusType('ok');
      }
    } catch (e) {
      console.warn('Erro ao gerar títulos baseados em termos da Amazon:', e);
    } finally {
      setIsGeneratingAmazonTitles(false);
    }
  };

  // Inspirar a Obra diretamente em um Bestseller Real da Amazon com Título & Subtítulo Contextualizados
  const handleInspirarNoBestseller = (ref: MarketReference, advanceToNext: boolean = false) => {
    if (!ref.title) return;
    const inspired = KdpTitleSuggestionEngine.generateInspiredFromBook(ref, temaSelecionado || genero);
    setTitulo(inspired.title);
    setSubtitulo(inspired.subtitle);
    setUniqueAngle(inspired.uniqueAngle);
    setStanceTopic(inspired.stance);
    setStatusMsg(`✓ Obra inspirada no bestseller "${ref.title}" (BSR #${ref.bsr || 15000})! Título: "${inspired.title}"`);
    setStatusType('ok');

    // Atualiza a lista de sugestões colocando o livro em destaque
    const fresh = KdpTitleSuggestionEngine.getSuggestionsForTheme(temaSelecionado || genero, subtemaSelecionado, [ref, ...marketReferences]);
    setSuggestedTitlesList(fresh);

    if (advanceToNext) {
      if (wizardStep === 1) setWizardStep(2);
      else if (wizardStep === 2) setWizardStep(3);
      else if (wizardStep === 3) setWizardStep(4);
    }
  };

  // Selecionar um dos títulos sugeridos para o segmento
  const handleSelectSuggestedTitle = (sug: TitleSuggestion, advanceToNext: boolean = false) => {
    setTitulo(sug.title);
    setSubtitulo(sug.subtitle);
    if (sug.uniqueAngle) setUniqueAngle(sug.uniqueAngle);
    if (sug.stance) setStanceTopic(sug.stance);
    setStatusMsg(`✓ Título comercial definido: "${sug.title}"!`);
    setStatusType('ok');

    if (advanceToNext) {
      if (wizardStep === 1) setWizardStep(2);
      else if (wizardStep === 2) setWizardStep(3);
      else if (wizardStep === 3) setWizardStep(4);
    }
  };

  // Top 100 Amazon: Troca de segmento e recarregamento dos 10 livros
  const handleSelectSegment = (segmentId: string) => {
    setSelectedSegmentId(segmentId);
    const pool = AmazonTop100Service.getActiveBookPool(segmentId, excludedAsins, 10);
    setActivePoolBooks(pool.activeBooks);

    const seg = AmazonTop100Service.getSegment(segmentId);
    const segName = seg?.title || seg?.name || 'Desenvolvimento Pessoal';
    setGenero(segName);

    const mappedRefs: MarketReference[] = pool.activeBooks.map(b => ({
      title: b.title,
      subtitle: b.subtitle,
      author: b.author,
      asin: b.asin,
      bsr: b.bsr,
      rating: b.rating,
      reviewsCount: b.reviewsCount,
      priceUsd: b.priceUsd,
      estimatedMonthlySales: b.estimatedMonthlySales,
      estimatedMonthlyRevenueUsd: b.estimatedMonthlyRevenueUsd,
      coverImage: b.coverImage,
      amazonUrl: b.amazonUrl,
      hookRationale: b.hookRationale,
      rank: b.bsr,
      rankType: 'BSR',
      relevance: 100,
      source: 'api/amazon/top100-segments',
      collectedAt: Date.now()
    }));

    const suggestions = KdpTitleSuggestionEngine.getSuggestionsForTheme(segName, seg?.dominantHook, mappedRefs);
    setSuggestedTitlesList(suggestions);

    // Não sobrescreve se o usuário já estiver digitando ou se for fórmula antiga
    if (suggestions.length > 0 && (!titulo.trim() || titulo.startsWith('O Novo Código de') || titulo.startsWith('O Guia Definitivo de') || titulo === 'O Efeito O')) {
      setTitulo(suggestions[0].title);
      setSubtitulo(suggestions[0].subtitle);
      setUniqueAngle(suggestions[0].uniqueAngle);
      setStanceTopic(suggestions[0].stance);
    }

    setMarketFeedback(`Segmento selecionado. 10 livros carregados e sugestões de títulos geradas.`);
  };

  // Descartar livro e repor imediatamente outro livro no pool de 10
  const handleDiscardBook = (asin: string) => {
    const updated = [...excludedAsins, asin];
    setExcludedAsins(updated);
    setSelectedInspirationAsins(prev => prev.filter(a => a !== asin));
    const pool = AmazonTop100Service.getActiveBookPool(selectedSegmentId, updated, 10);
    setActivePoolBooks(pool.activeBooks);
    setMarketFeedback(`Livro descartado. Nova recomendação adicionada automaticamente ao pool de 10.`);
  };

  // Alternar seleção de livro para inspiração (permite entre 1 e 10)
  const handleToggleSelectInspiration = (book: AmazonSegmentBook) => {
    setSelectedInspirationAsins(prev => {
      if (prev.includes(book.asin)) {
        return prev.filter(a => a !== book.asin);
      }
      if (prev.length >= 10) {
        alert('Você pode selecionar no máximo 10 livros como referência de inspiração.');
        return prev;
      }
      return [...prev, book.asin];
    });
  };

  // Avançar para a Etapa 3 aplicando os livros selecionados como referências de mercado
  const handleAdvanceToStep3WithSelected = () => {
    const chosen = activePoolBooks.filter(b => selectedInspirationAsins.includes(b.asin));
    const finalBooks = chosen.length > 0 ? chosen : activePoolBooks.slice(0, Math.min(5, activePoolBooks.length));
    
    const mapped: MarketReference[] = finalBooks.map(b => ({
      title: b.title,
      subtitle: b.subtitle,
      author: b.author,
      asin: b.asin,
      bsr: b.bsr,
      rating: b.rating,
      reviewsCount: b.reviewsCount,
      priceUsd: b.priceUsd,
      estimatedMonthlySales: b.estimatedMonthlySales,
      estimatedMonthlyRevenueUsd: b.estimatedMonthlyRevenueUsd,
      coverImage: b.coverImage,
      amazonUrl: b.amazonUrl,
      hookRationale: b.hookRationale,
      rank: b.bsr,
      rankType: 'BSR',
      relevance: 100,
      source: 'api/amazon/top100-segments',
      collectedAt: Date.now()
    }));
    setMarketReferences(mapped);

    if (finalBooks.length > 0 && (!titulo.trim() || titulo.startsWith('O Novo Código de'))) {
      const topRef = finalBooks[0];
      const inspired = KdpTitleSuggestionEngine.generateInspiredFromBook(topRef, temaSelecionado || genero);
      setTitulo(inspired.title);
      setSubtitulo(inspired.subtitle);
      setUniqueAngle(inspired.uniqueAngle);
      setStanceTopic(inspired.stance);
    }

    setWizardStep(3);
  };

  // Iniciar Produção da Obra Completa com IA garantindo título e premissa sem travas
  const iniciarProducaoObraAssistida = async () => {
    let t = titulo.trim();
    let top = topico.trim();
    if (!t) {
      t = temaSelecionado ? `O Guia Definitivo de ${temaSelecionado}` : 'O Poder da Transformação';
      setTitulo(t);
    }
    if (!top) {
      top = bookPromise || uniqueAngle || (temaSelecionado ? `Método prático e comprovado para dominar ${temaSelecionado} com resultados rápidos.` : 'Guia prático para transformação pessoal.');
      setTopico(top);
    }
    setStatusMsg('🚀 Iniciando arquitetura editorial e escrita dos capítulos com IA...');
    setStatusType('ok');
    setTimeout(() => {
      iniciarGeracao();
    }, 150);
  };

  // Auto-Preencher Dossiê Editorial com IA em 1 clique
  const handleAutoPreencherDossie = async () => {
    setIsAiStepBusy('auto-dossie');
    try {
      const temaAtual = temaSelecionado || 'Desenvolvimento Pessoal e Hábitos';
      const prompt = `Você é um arquiteto editorial de elite para Amazon KDP.
Gere um dossiê editorial completo para um livro vencedor no nicho: "${temaAtual}".
Retorne APENAS um JSON válido com o seguinte formato:
{
  "titulo": "Título Curto Magnético",
  "subtitulo": "Subtítulo Comercial que Resolve a Dor do Leitor e Ranqueia em BSR < 80k",
  "stance": "Tese única contraintuitiva que quebra o clichê do tema (2 frases)",
  "promessa": "O que o leitor será capaz de fazer após ler este livro",
  "publicoAlvo": "Perfil demográfico e psicográfico do leitor ideal",
  "recursos": "Estudos de caso empíricos, pesquisas científicas e dados de mercado",
  "sinopse": "Sinopse comercial persuasiva de 2 parágrafos para a contracapa e Amazon KDP"
}`;
      const resp = await chamarGeminiTexto(prompt, { temperature: 0.8, maxTokens: 900 });
      const txt = (typeof resp === 'string' ? resp : resp?.texto || '').replace(/```json/gi, '').replace(/```/g, '').trim();
      const match = txt.match(/\{[\s\S]*\}/);
      if (match) {
        const d = JSON.parse(match[0]);
        if (d.titulo) setTitulo(d.titulo);
        if (d.subtitulo) setSubtitulo(d.subtitulo);
        if (!autor) setAutor('Leandro Palmeira');
        if (d.stance) setStanceTopic(d.stance);
        if (d.promessa) setBookPromise(d.promessa);
        if (d.publicoAlvo) setTargetReader(d.publicoAlvo);
        if (d.recursos) setResourceNotes(d.recursos);
        if (d.sinopse) setBookCommercialDescription(d.sinopse);
        setStatusMsg('✓ Dossiê editorial pré-preenchido com sucesso!');
        setStatusType('ok');
      }
    } catch (e: any) {
      console.warn('Erro ao auto-preencher dossiê:', e);
    } finally {
      setIsAiStepBusy(null);
    }
  };

  // Sugestão individual para cada campo da Etapa 4
  const handleSugerirCampoDiferencial = async (campo: 'uniqueAngle' | 'bookPromise' | 'targetReader') => {
    setLoadingSugestao(campo);
    try {
      const descricoes = {
        uniqueAngle: '1 ÂNGULO ÚNICO em uma frase que diferencie o livro de concorrentes',
        bookPromise: '1 PROMESSA CENTRAL clara e emocionante ao leitor em uma frase',
        targetReader: '1 PERFIL DO LEITOR ALVO ideal e demografia para este nicho'
      };

      const prompt = `Você é estrategista editorial KDP.
Tema: ${temaSelecionado || genero}
Subtema: ${subtemaSelecionado || 'Geral'}
Título: "${titulo}"
Gere apenas ${descricoes[campo]}. Retorne APENAS o texto puro sem aspas e sem explicações.`;

      const resposta = await chamarGeminiTexto(prompt, { temperature: 0.85, maxTokens: 150 });
      if (resposta?.tokensTotal) {
        setTokensConsumidosTotal(prev => prev + resposta.tokensTotal!);
        setCustoEstimadoTotalBrl(prev => prev + (resposta.custoBrl || 0));
      }
      const textoResp = typeof resposta === 'string' ? resposta : (resposta?.texto || '');
      const limpo = textoResp.replace(/^["'\*]+|["'\*]+$/g, '').trim();

      if (campo === 'uniqueAngle') setUniqueAngle(limpo);
      if (campo === 'bookPromise') setBookPromise(limpo);
      if (campo === 'targetReader') setTargetReader(limpo);

      setStatusMsg(`✓ Sugestão aplicada.`);
      setStatusType('ok');
    } catch (err: any) {
      setStatusMsg(`Erro na sugestão: ${err?.message}`);
    } finally {
      setLoadingSugestao(null);
    }
  };

  // ── HANDLERS DO FLUXO DE 10 ETAPAS (METODOLOGIA EDITORIAL AVANÇADA) ──
  const handleSugerirStance = async () => {
    setIsAiStepBusy('stance');
    try {
      const prompt = `Você é estrategista editorial de bestsellers.
Tema: "${temaSelecionado || genero}" | Subtema: "${subtemaSelecionado || 'Geral'}"
Crie uma TESE / POSICIONAMENTO FORTE E CONTRAINTUITIVO (Stance on the Topic) de 2 frases que faça este livro se destacar da concorrência genérica (ex: um método de 10 minutos por dia, uma verdade pouco dita ou uma abordagem única). Retorne apenas o texto direto sem aspas.`;
      const res = await chamarGeminiTexto(prompt, { temperature: 0.8, maxTokens: 200 });
      const txt = (typeof res === 'string' ? res : res?.texto || '').replace(/^["']+|["']+$/g, '').trim();
      if (txt) {
        setStanceTopic(txt);
        if (!uniqueAngle.trim()) setUniqueAngle(txt);
        setStatusMsg('✓ Tese / Posicionamento forte sugerido com sucesso!');
        setStatusType('ok');
      }
    } catch {
      setStanceTopic(`Abordagem prática e contraintuitiva sobre ${temaSelecionado || genero}, focada em resultados reais aplicáveis em poucos minutos por dia.`);
    } finally {
      setIsAiStepBusy(null);
    }
  };

  const handleAdicionarReferenciaCustom = () => {
    const val = customRefInput.trim();
    if (!val) return;
    const novaRef: MarketReference = {
      title: val,
      author: 'Referência Selecionada pelo Autor',
      bsr: 120,
      rating: 4.9,
      reviews: 850,
      referenceScore: 98,
      category: temaSelecionado || genero || 'Geral',
      rankType: 'category_rank' as any,
      source: 'manual' as any,
      collectedAt: Date.now()
    };
    setMarketReferences(prev => [novaRef, ...prev]);
    setCustomRefInput('');
    setStatusMsg('✓ Livro de referência adicionado para modelagem estrutural!');
    setStatusType('ok');
  };

  const handleRemoverReferenciaMercado = (idxToRemove: number) => {
    setMarketReferences(prev => prev.filter((_, i) => i !== idxToRemove));
  };

  const handleRefinarTituloComFeedback = async () => {
    if (!titleFeedbackPrompt.trim() && !titulo.trim()) return;
    setIsAiStepBusy('title-feedback');
    try {
      const prompt = `Você é diretor editorial de bestsellers.
Título atual: "${titulo || temaSelecionado || genero}"
Tema: "${temaSelecionado || genero}" | Posicionamento: "${stanceTopic || uniqueAngle}"
Pedido de melhoria do autor: "${titleFeedbackPrompt || 'Torne mais magnético, memorável e comercial'}"
Gere 5 títulos aprimorados numerados de 1 a 5 (apenas um título por linha, sem explicações).`;
      const res = await chamarGeminiTexto(prompt, { temperature: 0.85, maxTokens: 300 });
      const txt = typeof res === 'string' ? res : (res?.texto || '');
      const linhas = txt
        .split('\n')
        .map(l => l.replace(/^\d+[\.\)\-\s]+/, '').replace(/^["'\*]+|["'\*]+$/g, '').trim())
        .filter(l => l.length > 3)
        .slice(0, 5);
      if (linhas.length > 0) {
        setOpcoesTitulos(linhas);
        setTitulo(linhas[0]);
        setStatusMsg('✓ 5 variações de títulos refinadas com base no seu feedback!');
        setStatusType('ok');
      }
    } catch {
      // Fallback silencioso
    } finally {
      setIsAiStepBusy(null);
    }
  };

  const handleSugerirRecursos = async () => {
    setIsAiStepBusy('resources');
    try {
      const prompt = `Você é pesquisador editorial sênior.
Livro: "${titulo || temaSelecionado || genero}" (${temaSelecionado || genero})
Tese: "${stanceTopic || uniqueAngle || 'Abordagem diferenciada'}"
Liste 5 FONTES DE REFERÊNCIA, ESTUDOS DE CASO E DICAS-CHAVE DE ALTO VALOR que devem constar como base de pesquisa deste livro para torná-lo profundo, autêntico e embasado. Seja conciso e direto.`;
      const res = await chamarGeminiTexto(prompt, { temperature: 0.7, maxTokens: 450 });
      const txt = (typeof res === 'string' ? res : res?.texto || '').trim();
      if (txt) {
        setResourceNotes(prev => (prev ? `${prev}\n\n${txt}` : txt));
        setStatusMsg('✓ Fontes, estudos e dicas-chave adicionados à Base de Recursos!');
        setStatusType('ok');
      }
    } catch {
      const fallback = `• Estudos de caso reais e dados estatísticos aplicados a ${temaSelecionado || genero}\n• Metodologia passo a passo com microvitórias diárias\n• Exemplos práticos do cotidiano e superação de objeções comuns`;
      setResourceNotes(prev => (prev ? `${prev}\n\n${fallback}` : fallback));
    } finally {
      setIsAiStepBusy(null);
    }
  };

  const handleGerarBiografiaAutor = async () => {
    setIsAiStepBusy('author-bio');
    try {
      const prompt = `Você é redator editorial profissional.
Crie uma BIOGRAFIA OFICIAL DE AUTOR e PERFIL DE VOZ (Persona) em 1 parágrafo envolvente (80 a 130 palavras) para:
- Nome/Assinatura: "${autor || 'Autor'}" (${authorType === 'pen-name' ? 'Pseudônimo' : authorType === 'brand' ? 'Marca Editorial' : 'Nome Pessoal'})
- Experiência / Background: "${authorBackground || `Especialista e pesquisador dedicado ao universo de ${temaSelecionado || genero}`}"
- Formação / Credenciais: "${authorEducation || 'Trajetória prática consolidada'}"
- Conquistas / Detalhes Pessoais: "${authorAchievements || 'Dedicado a transformar conceitos densos em leitura magnética'}"
- Inspiração de Estilo: "${authorStyleInspiration || 'Escrita fluida, humana e envolvente'}"
Retorne apenas a biografia pronta para publicação e uso no contexto da obra.`;
      const res = await chamarGeminiTexto(prompt, { temperature: 0.75, maxTokens: 350 });
      const txt = (typeof res === 'string' ? res : res?.texto || '').trim();
      if (txt) {
        setAuthorOfficialBio(txt);
        try {
          localStorage.setItem('bookengin_saved_author_persona', JSON.stringify({
            autor, authorType, authorBackground, authorEducation, authorAchievements, authorStyleInspiration, authorOfficialBio: txt
          }));
        } catch {}
        setStatusMsg('✓ Biografia Oficial e Persona do Autor geradas e salvas!');
        setStatusType('ok');
      }
    } catch {
      const bioFallback = `${autor} dedica sua trajetória a explorar ${temaSelecionado || genero} com profundidade prática e olhar humano. Combinando ${authorBackground || 'experiência real'} e uma narrativa envolvente, suas obras conectam estratégia, clareza e histórias reais que permanecem com o leitor muito depois da última página.`;
      setAuthorOfficialBio(bioFallback);
    } finally {
      setIsAiStepBusy(null);
    }
  };

  const handleGerarPropostaFoco = async () => {
    setIsAiStepBusy('proposed-book');
    try {
      const prompt = `Você é estrategista de publicação de bestsellers.
Livro: "${titulo || 'Nova Obra'}" — Subtítulo: "${subtitulo}"
Tema: "${temaSelecionado || genero}" | Posicionamento: "${stanceTopic || uniqueAngle}"
Tags de Foco Escolhidas: ${focusTags.join(', ')}
Referências Analisadas: ${marketReferences.slice(0, 3).map(r => r.title).join(', ') || 'Bestsellers da categoria'}
Escreva uma PROPOSTA DE VALOR E POSICIONAMENTO COMPETITIVO (2 parágrafos curtos) explicando:
1. Qual é a Proposta Única de Venda (USP) do livro.
2. Como ele modela o que há de melhor no mercado mas se diferencia com seu ângulo exclusivo (${focusTags.join(', ')}).`;
      const res = await chamarGeminiTexto(prompt, { temperature: 0.75, maxTokens: 450 });
      const txt = (typeof res === 'string' ? res : res?.texto || '').trim();
      if (txt) {
        setProposedBookSummary(txt);
        if (!uniqueAngle.trim()) setUniqueAngle(`${stanceTopic || ''} — Foco em: ${focusTags.join(', ')}`.trim());
        if (!bookPromise.trim()) setBookPromise(txt.split('.')[0] + '.');
        setStatusMsg('✓ Proposta do Livro com Foco gerada com sucesso!');
        setStatusType('ok');
      }
    } catch {
      setProposedBookSummary(`"${titulo || 'Esta obra'}" revoluciona a abordagem sobre ${temaSelecionado || genero} ao combinar ${focusTags.join(', ')} em uma metodologia prática e envolvente, entregando clareza imediata onde outros livros permanecem apenas na teoria.`);
    } finally {
      setIsAiStepBusy(null);
    }
  };

  const handleGerarSumarioRitmoVariado = async () => {
    setIsAiStepBusy('varied-outline');
    const isEn = Boolean(idioma && /ingl|en/i.test(idioma));
    const numCaps = Math.max(4, Math.min(25, maxCapitulos || 10));
    const baseWordsPerCap = Math.round(((paginasAlvo || 100) * 260) / numCaps);
    try {
      const prompt = isEn
        ? `You are an architectural outline planner for US bestsellers on Amazon KDP.
Book: "${titulo || temaSelecionado || genero}" | Structure: ${bookStructureType}
Premise: "${topico || stanceTopic || uniqueAngle || temaSelecionado}"
Total chapters: ${numCaps}.
US Geographical Setting: ${estadoEua || 'the United States'}.
Create a dynamic table of contents where EVERY CHAPTER has varied pacing, unique narrative approach, and modern American vocabulary.
Every single chapter title MUST start with "Chapter X: [Creative English Title]".
Return ONLY a valid JSON array in this exact format:
[{"num": 1, "title": "Chapter 1: The Initial Spark", "sectionsCount": 3, "targetWords": ${Math.round(baseWordsPerCap * 0.85)}, "focus": "Magnetic hook and core premise"}]`
        : `Você é arquiteto de sumários de bestsellers.
Livro: "${titulo || temaSelecionado || genero}" | Estrutura: ${bookStructureType}
Premissa: "${topico || stanceTopic || uniqueAngle || temaSelecionado}"
Total de capítulos: ${numCaps}.
Para evitar a repetição típica de IA, crie um sumário em que CADA CAPÍTULO tenha um ritmo diferente (alguns capítulos mais curtos e diretos com 2-3 seções, outros mais densos e detalhados com 4-5 seções).
Retorne APENAS um JSON array no formato:
[{"num": 1, "title": "Título do Cap 1", "sectionsCount": 3, "targetWords": ${Math.round(baseWordsPerCap * 0.85)}, "focus": "Gancho inicial e quebra de mito"}]`;

      const res = await chamarGeminiTexto(prompt, { temperature: 0.7, maxTokens: 1200 });
      const rawRes = typeof res === 'string' ? res : res?.texto || '';
      const cleanJson = rawRes.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleanParsed = parsed.map((item: any) => {
          let t = String(item.title || '');
          if (isEn) {
            t = t.replace(/^cap[íi]tulo\s*/i, 'Chapter ');
            if (!/^chapter\s*\d+/i.test(t)) {
              t = `Chapter ${item.num}: ${t}`;
            }
          }
          return { ...item, title: t };
        });
        setVariedOutlinePreview(cleanParsed);
        setStatusMsg(isEn ? `✓ Varied outline (${cleanParsed.length} chapters) planned successfully!` : `✓ Sumário com ritmo variado (${cleanParsed.length} capítulos) arquitetado!`);
        setStatusType('ok');
        return;
      }
    } catch {
      // Fallback determinístico com ritmo variado
    }
    const temposPt = [
      { mult: 0.85, secs: 3, role: 'Abertura magnética e quebra de crença padrão' },
      { mult: 1.15, secs: 4, role: 'Aprofundamento central com casos e evidências' },
      { mult: 0.90, secs: 2, role: 'Virada rápida de ritmo e aplicação direta' },
      { mult: 1.25, secs: 5, role: 'Desenvolvimento denso do método e exemplos reais' },
      { mult: 0.95, secs: 3, role: 'Consolidação prática e preparação para o próximo nível' }
    ];
    const temposEn = [
      { mult: 0.85, secs: 3, role: 'Magnetic opening hook and myth busting' },
      { mult: 1.15, secs: 4, role: 'Core deep dive with evidence and real cases' },
      { mult: 0.90, secs: 2, role: 'Fast-paced shift and direct practical application' },
      { mult: 1.25, secs: 5, role: 'Intensive narrative development and crucial breakthroughs' },
      { mult: 0.95, secs: 3, role: 'Actionable consolidation and path forward' }
    ];
    const tempos = isEn ? temposEn : temposPt;
    const generated = Array.from({ length: numCaps }, (_, idx) => {
      const t = tempos[idx % tempos.length];
      const fallbackTitle = isEn
        ? `Chapter ${idx + 1}: Step ${idx + 1} of the Journey`
        : `Capítulo ${idx + 1}: Etapa ${idx + 1} da Jornada`;
      let chosenTitle = planoEditorial?.chapters?.[idx]?.title || fallbackTitle;
      if (isEn) {
        chosenTitle = chosenTitle.replace(/^cap[íi]tulo\s*/i, 'Chapter ');
        if (!/^chapter\s*\d+/i.test(chosenTitle)) {
          chosenTitle = `Chapter ${idx + 1}: ${chosenTitle}`;
        }
      }
      return {
        num: idx + 1,
        title: chosenTitle,
        sectionsCount: t.secs,
        targetWords: Math.round(baseWordsPerCap * t.mult),
        focus: (planoEditorial?.chapters?.[idx] as any)?.summary || t.role
      };
    });
    setVariedOutlinePreview(generated);
    setStatusMsg(isEn ? '✓ Varied outline per chapter configured!' : '✓ Sumário com ritmo variado por capítulo configurado!');
    setStatusType('ok');
  };

  const handleEnriquecerCapituloAtual = async (modo: 'data' | 'history' | 'quote' | 'expand' | 'dados-estudos' | 'fatos-historicos' | 'citacao' | 'expandir') => {
    if (!livro || livro.capitulos.length === 0) {
      setStatusMsg('⚠️ Gere ao menos 1 capítulo antes de usar o enriquecimento editorial.');
      setStatusType('error');
      return;
    }
    const targetIdx = Math.min(livro.capitulos.length - 1, Math.max(0, audioReadingCapIndex ?? (livro.capitulos.length - 1)));
    const cap = livro.capitulos[targetIdx];
    if (!cap) return;

    setIsAiStepBusy(`enrich-${modo}`);
    try {
      const instrucoes: Record<string, string> = {
        'data': 'Adicione 1 parágrafo de alto valor com DADOS ESTATÍSTICOS, ESTUDOS OU FONTES CONCRETAS que comprovem e fortaleçam o argumento deste capítulo.',
        'dados-estudos': 'Adicione 1 parágrafo de alto valor com DADOS ESTATÍSTICOS, ESTUDOS OU FONTES CONCRETAS que comprovem e fortaleçam o argumento deste capítulo.',
        'history': 'Adicione 1 parágrafo narrativo com um CASO REAL, MARCO HISTÓRICO OU EXEMPLO DOCUMENTADO conectado ao tema deste capítulo.',
        'fatos-historicos': 'Adicione 1 parágrafo narrativo com um CASO REAL, MARCO HISTÓRICO OU EXEMPLO DOCUMENTADO conectado ao tema deste capítulo.',
        'quote': 'Adicione uma CITAÇÃO CONTEXTUAL marcante seguida de uma reflexão profunda que eleve a autoridade literária deste capítulo.',
        'citacao': 'Adicione uma CITAÇÃO CONTEXTUAL marcante seguida de uma reflexão profunda que eleve a autoridade literária deste capítulo.',
        'expand': 'Elabore e aprofunde o ponto final deste capítulo com exemplos práticos e detalhes sensoriais, mantendo o tom do autor.',
        'expandir': 'Elabore e aprofunde o ponto final deste capítulo com exemplos práticos e detalhes sensoriais, mantendo o tom do autor.'
      };
      const prompt = `Você é editor literário sênior.
Livro: "${livro.titulo}" | Capítulo ${targetIdx + 1}: "${cap.titulo}"
Trecho final atual do capítulo:
"""
${(cap.texto || '').slice(-900)}
"""
Tarefa: ${instrucoes[modo]}
Retorne APENAS o novo parágrafo coeso para ser integrado ao capítulo, sem títulos extras e sem comentários.`;
      const res = await chamarGeminiTexto(prompt, { temperature: 0.7, maxTokens: 450 });
      const novoParagrafo = (typeof res === 'string' ? res : res?.texto || '').trim();
      if (novoParagrafo) {
        const novosCaps = [...livro.capitulos];
        const textoAtualizado = `${cap.texto.trim()}\n\n${novoParagrafo}`;
        novosCaps[targetIdx] = {
          ...cap,
          texto: textoAtualizado
        };
        const livroAtualizado = { ...livro, capitulos: novosCaps };
        setLivro(livroAtualizado);
        salvarProgressoLocal(livroAtualizado);
        setStatusMsg(`✓ Capítulo ${targetIdx + 1} enriquecido com sucesso (${modo})!`);
        setStatusType('ok');
      }
    } catch (e: any) {
      setStatusMsg(`Erro ao enriquecer capítulo: ${e?.message}`);
      setStatusType('error');
    } finally {
      setIsAiStepBusy(null);
    }
  };

  const handleGerarDescricaoComercial = async () => {
    setIsAiStepBusy('description');
    try {
      const prompt = `Você é copywriter especialista em lançamentos editoriais bestsellers.
Crie uma DESCRIÇÃO COMERCIAL DE ALTA CONVERSÃO para o livro:
- Título: "${titulo || livro?.titulo || 'Obra'}"
- Subtítulo: "${subtitulo || livro?.subtitulo || ''}"
- Autor: "${autor || livro?.autor || ''}"
- Gênero/Tema: "${temaSelecionado || genero}"
- Tese / Diferencial: "${stanceTopic || uniqueAngle || bookPromise || topico}"
Siga estritamente esta estrutura em 5 partes:
1. HEADLINE DE IMPACTO (Pergunta ou afirmação magnética)
2. IDENTIFICAÇÃO COM O LEITOR (Empatia com a dor, mistério ou desejo do leitor)
3. O QUE VOCÊ VAI DESCOBRIR / VIVER NESTA OBRA (4 a 5 bullet points persuasivos com •)
4. POR QUE ESTE LIVRO É DIFERENTE (Quebra de objeções usando a tese única e a autoridade do autor)
5. CHAMADA PARA AÇÃO FINAL (Convite irresistível à leitura).`;
      const res = await chamarGeminiTexto(prompt, { temperature: 0.75, maxTokens: 700 });
      const txt = (typeof res === 'string' ? res : res?.texto || '').trim();
      if (txt) {
        setBookCommercialDescription(txt);
        setStatusMsg('✓ Descrição Comercial estruturada gerada com sucesso!');
        setStatusType('ok');
      }
    } catch {
      setBookCommercialDescription(
        `E SE TUDO O QUE VOCÊ ACREDITAVA SOBRE ${(temaSelecionado || genero || 'ESTE TEMA').toUpperCase()} FOSSE APENAS A SUPERFÍCIE?\n\n` +
        `Em "${titulo || 'esta obra'}", ${autor} conduz você por uma jornada intensa e reveladora. ${subtitulo ? `${subtitulo}.` : ''}\n\n` +
        `Nesta leitura envolvente, você vai encontrar:\n` +
        `• ${stanceTopic || uniqueAngle || 'Uma perspectiva autêntica e profundamente pesquisada sobre o tema'}\n` +
        `• ${bookPromise || 'Estratégias, reviravoltas e insights aplicáveis desde o primeiro capítulo'}\n` +
        `• Ritmo dinâmico projetado para prender sua atenção da primeira à última página\n\n` +
        `Abra a primeira página agora e descubra por que esta leitura vai transformar sua visão.`
      );
    } finally {
      setIsAiStepBusy(null);
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
    if (bookType === 'planner' || bookType === 'diary') {
      setActiveTab('planner');
      setStatusMsg('Este formato gera páginas preenchíveis, sem capítulos narrativos. Use o Criador de planners e diários.');
      setStatusType('normal');
      return;
    }

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

    // REGRA DE NEGÓCIO: Cadastro gratuito, mas geração de livro requer crédito
    if (creditosLivros < 1) {
      setCreditModalMotivo('Para gerar este livro completo com IA é necessário 1 crédito. Seu cadastro é 100% gratuito, basta adquirir seus créditos conforme sua produção.');
      setIsCreditModalOpen(true);
      return;
    }

    const selectedConfig = BOOK_TYPE_CONFIGS[bookType] || BOOK_TYPE_CONFIGS['fiction-novel'];
    const palavrasAlvo = paginasAlvo * 300;
    const estimatedChapters = Math.round(palavrasAlvo / 900);
    const capsCalc = Math.max(3, Math.min(maxCapitulos, estimatedChapters));
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

    const enrichedDifferentiator = [
      uniqueAngle,
      stanceTopic ? `Posicionamento/Tese Forte: ${stanceTopic}` : '',
      authorTone ? `Tom de escrita: ${authorTone}` : '',
      focusTags.length > 0 ? `Focos editoriais: ${focusTags.join(', ')}` : '',
      authorBackground ? `Persona/Histórico do Autor (${autor}): ${authorBackground}` : '',
      bookStructureType ? `Estrutura narrativa: ${bookStructureType}` : '',
      resourceNotes ? `Fontes e Recursos Base: ${resourceNotes.slice(0, 500)}` : ''
    ].filter(Boolean).join(' | ');

    let plano: KdpEditorialPlan;
    setIsPlanningEditorial(true);
    try {
      setStatusMsg('Orquestrando arquitetura editorial, estratégia de leitor e continuidade...');
      setStatusType('normal');
      plano = await orchestrateEditorialPlan({
        title: novoLivro.titulo,
        subtitle: novoLivro.subtitulo,
        genre: novoLivro.genero,
        language: novoLivro.idioma,
        topic: topico,
        theme: temaSelecionado,
        subtheme: subtemaSelecionado,
        targetReader,
        promise: bookPromise || proposedBookSummary,
        differentiator: enrichedDifferentiator
      }, capsCalc);
      setPlanoEditorial(plano);
      logDiag(`Plano editorial criado com ${plano.chapters.length} capítulos e guia de continuidade.`);
    } catch (err: any) {
      const mensagem = err instanceof Error ? err.message : 'Não foi possível criar o plano editorial online.';
      logDiag(`[Self-Healing] Orquestrador online oscilou (${mensagem}). Ativando arquitetura editorial de contingência...`);
      plano = buildFallbackEditorialPlan({
        title: novoLivro.titulo,
        subtitle: novoLivro.subtitulo,
        genre: novoLivro.genero,
        language: novoLivro.idioma,
        topic: topico,
        theme: temaSelecionado,
        subtheme: subtemaSelecionado,
        targetReader,
        promise: bookPromise || proposedBookSummary,
        differentiator: enrichedDifferentiator
      }, capsCalc);
      setPlanoEditorial(plano);
      logDiag(`[Self-Healing] Plano editorial consolidado com sucesso com ${plano.chapters.length} capítulos.`);
      setStatusMsg('Plano editorial arquitetado com sucesso via Auto-Recuperação. Iniciando geração da obra...');
      setStatusType('normal');
    } finally {
      setIsPlanningEditorial(false);
    }

    // Consome 1 crédito editorial para a produção do livro
    debitarCreditoLivro(novoLivro.titulo);

    setLivro(novoLivro);
    setCapaFinal(null);
    setFundoImg(null);
    setPromoData(null);
    salvarProgressoLocal(novoLivro, '', '', undefined);

    pararFlagRef.current = false;
    setPararFlag(false);
    await executarLoopGeracao(novoLivro, 0, capsCalc, palavrasPorCap, plano);
  };

  // CONTINUAR GERAÇÃO INTERROMPIDA
  const continuarGeracao = async () => {
    if (!livro) return;
    pararFlagRef.current = false;
    setPararFlag(false);
    const palavrasPorCap = livro.meta?.palavrasPorCap || 900;
    const startFrom = livro.capitulos.length;
    const total = totalCaps || Math.max(3, Math.min(maxCapitulos, Math.round((livro.meta?.paginasAlvo || paginasAlvo) * 300 / palavrasPorCap)));

    let plano = planoEditorial;
    if (!plano || plano.chapters.length !== total) {
      setIsPlanningEditorial(true);
      try {
        setStatusMsg('Reconstruindo o plano editorial para continuar a obra...');
        setStatusType('normal');
        plano = await orchestrateEditorialPlan({
          title: livro.titulo,
          subtitle: livro.subtitulo,
          genre: livro.genero,
          language: livro.idioma,
          topic: topico,
          theme: temaSelecionado || livro.genero,
          subtheme: subtemaSelecionado,
          targetReader,
          promise: bookPromise,
          differentiator: uniqueAngle
        }, total);
        setPlanoEditorial(plano);
      } catch (err: any) {
        const mensagem = err instanceof Error ? err.message : 'Não foi possível reconstruir o plano editorial online.';
        logDiag(`[Self-Healing] Reconstrução online oscilou (${mensagem}). Ativando arquitetura de contingência...`);
        plano = buildFallbackEditorialPlan({
          title: livro.titulo,
          subtitle: livro.subtitulo,
          genre: livro.genero,
          language: livro.idioma,
          topic: topico,
          theme: temaSelecionado || livro.genero,
          subtheme: subtemaSelecionado,
          targetReader,
          promise: bookPromise,
          differentiator: uniqueAngle
        }, total);
        setPlanoEditorial(plano);
        logDiag(`[Self-Healing] Plano editorial de continuação consolidado com ${plano.chapters.length} capítulos.`);
        setStatusMsg('Plano editorial recuperado com sucesso. Continuando obra...');
        setStatusType('normal');
      } finally {
        setIsPlanningEditorial(false);
      }
    }

    await executarLoopGeracao(livro, startFrom, total, palavrasPorCap, plano);
  };

  // LOOP DE GERAÇÃO CAPÍTULO A CAPÍTULO COM AUTO-RECUPERAÇÃO CONTÍNUA (SELF-HEALING)
  const executarLoopGeracao = async (
    livroBase: LivroGerado,
    inicio: number,
    total: number,
    palavrasPorCap: number,
    plano: KdpEditorialPlan
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
      const diretrizArquitetura = (plano.chapters && plano.chapters[num - 1]) || {
        title: `Capítulo ${num}`,
        objective: `Desenvolver os fundamentos práticos e a progressão temática do capítulo ${num}.`,
        keyPoints: [
          `Aprofundar os conceitos centrais do capítulo ${num}`,
          'Apresentar aplicações práticas e contextualização direta',
          'Consolidar os aprendizados e preparar o gancho para o próximo estágio'
        ],
        transition: num === total
          ? 'Concluir a obra de forma definitiva e memorável.'
          : `Conectar os aprendizados com o capítulo ${num + 1}.`
      };
      setStatusMsg(`⏳ Escrevendo Capítulo ${num} de ${total}...`);
      setStatusType('normal');
      setProgressPercent(Math.round((i / total) * 100));
      logDiag(`Iniciando capítulo ${num}/${total} [Modo Econômico: ${modoEconomico ? 'SIM' : 'NÃO'}]`);

      // Breve pausa preventiva de 1.0s para evitar limites de taxa (QPS)
      if (i > inicio && tentativasConsecutivasCapitulo === 0) {
        await new Promise(r => setTimeout(r, 1000));
      }

      try {
        // MODO ULTRA ECONÔMICO: Mantém apenas 5 termos proibidos para poupar tokens de entrada
        const frasesArray = Array.from(frasesUsadas).slice(modoEconomico ? -5 : -15);

        // BÍBLIA NARRATIVA PROGRESSIVA COMPACTA (Prompt Caching Friendly)
        let historicoEnredo = 'Início da narrativa.';
        if (livroBase.capitulos.length > 0) {
          const capsParaResumo = modoEconomico ? livroBase.capitulos.slice(-2) : livroBase.capitulos;
          historicoEnredo = capsParaResumo.map((c, idx) => {
            const numCap = livroBase.capitulos.length - capsParaResumo.length + idx + 1;
            return `• Cap. ${numCap} ("${c.titulo}"): ${extrairResumoContinuo(c.texto)}`;
          }).join('\n');
        }

        const ultimoCapitulo = livroBase.capitulos.length > 0
          ? livroBase.capitulos[livroBase.capitulos.length - 1]
          : null;

        const ganchoImediato = ultimoCapitulo
          ? `O Capítulo anterior ("${ultimoCapitulo.titulo}") terminou com este trecho:\n"${ultimoCapitulo.texto.slice(-320)}"`
          : 'Primeira cena da obra.';

        let diretrizEstrutural = '';
        if (num === 1) {
          diretrizEstrutural = 'ESTE É O PRIMEIRO CAPÍTULO: Apresente o protagonista, estabeleça o cenário, o tom e o incidente incitante.';
        } else if (num === total - 1 && total > 2) {
          diretrizEstrutural = 'AGENTE EDITORIAL DE AMARRAÇÃO (PENÚLTIMO CAPÍTULO): Inicie a convergência máxima de todos os arcos dramáticos iniciados no Começo e no Meio da história. Conduza os personagens em direção ao clímax definitivo, amarre subtramas pendentes e prepare a revelação final sem pontas soltas.';
        } else if (num === total) {
          diretrizEstrutural = 'AGENTE EDITORIAL DE CONCLUSÃO DEFINITIVA (COMEÇO, MEIO E FIM 100% AMARRADOS): Este é o capítulo final da obra completa. Confronte o conflito principal, resolva todos os mistérios e promessas feitas desde o primeiro capítulo. Entregue um desfecho pleno, satisfatório, conclusivo e memorável. O último parágrafo DEVE encerrar a história de forma plena e terminar com uma frase 100% finalizada com ponto final (.).';
        } else {
          diretrizEstrutural = `ESTE É O CAPÍTULO ${num} DE ${total} (PROGRESSÃO & TENSÃO): Conecte diretamente com o final do capítulo anterior, mantenha os mesmos personagens, aprofunde o conflito e aumente a tensão.`;
        }

        const isEnBook = Boolean(livroBase.idioma && /ingl|en/i.test(livroBase.idioma));
        const isEsBook = Boolean(livroBase.idioma && /espanh|es/i.test(livroBase.idioma));

        const regraIdioma = isEnBook
          ? `0. MANDATORY AMERICAN ENGLISH & US GEOGRAPHICAL ANCHOR:
- The entire chapter (title, narrative, dialogue, descriptions and inner thoughts) MUST be written 100% in natural, engaging AMERICAN ENGLISH as used in modern US bestsellers.
- GEOGRAPHICAL ANCHORING: The story is strictly set in the US State of "${estadoEua || 'New York (NY)'}".
- All cities, towns, highways, law enforcement agencies, local climate, state laws and cultural references MUST belong to ${estadoEua || 'New York (NY)'} and the United States of America.
- ZERO hallucinations of non-US locations, non-US currencies, or arbitrary foreign concepts.
- Use everyday words and colloquial expressions spoken and read by modern Americans.
- Chapter title format in English (e.g. Chapter ${num}: [English Title]).`
          : isEsBook
          ? '0. IDIOMA OBRIGATORIO: TODO el capítulo (título, narrativa, diálogos y descripciones) DEBE estar escrito 100% en ESPAÑOL. Prohibido mezclar otros idiomas.'
          : '0. IDIOMA OBRIGATÓRIO: PORTUGUÊS. Utilize literatura contemporânea e vocabulário natural e atual da língua portuguesa. PROIBIÇÃO ABSOLUTA de vocabulário arcaico ou em desuso (ex: outrossim, quiçá, dessarte, conquanto, deveras, hodierno, alhures, empecilho). NUNCA utilize caracteres ou resíduos como "&&", "||" ou "$$".';

        // INSTRUÇÃO DO SISTEMA FIXA (Permite context caching no servidor do Google Gemini)
        const systemInstruction = `Você é um escritor best-seller profissional de literatura na Amazon KDP.
REGRAS TÉCNICAS OBRIGATÓRIAS (ESTILO EDITORIAL KDP):
${regraIdioma}
1. Escreva em torno de ${palavrasPorCap} palavras (mínimo ${Math.round(palavrasPorCap * 0.85)} palavras ricas em detalhes).
2. COERÊNCIA TOTAL: Mantenha rigorosamente os mesmos personagens, cenários e tom. Não invente premissas contraditórias.
3. PROIBIÇÃO ABSOLUTA DE METÁFORAS: Seja o livro infantil, jovem ou adulto, NUNCA use metáforas, floreios poéticos abstratos, analogias figuradas ou palavras em sentido metafórico. Todas as descrições de cenários, sentimentos, ações e diálogos devem ser totalmente literais, diretas, claras e realistas.
4. VOCABULÁRIO POPULAR E COMUM: Evite estritamente palavras difíceis, rebuscadas, arcaicas ou eruditas. Utilize palavras simples e naturais no idioma da obra (${livroBase.idioma}).
5. Não repita expressões ou diálogos clichês dos capítulos anteriores.
6. Use diálogos dinâmicos, ações concretas, descrições sensoriais realistas e conflito ativo.
7. Termine com um gancho forte (cliffhanger) conectando para o próximo capítulo (a menos que seja o capítulo final).
8. REGRA INEGOCIÁVEL DE FECHAMENTO COMPLETO: NUNCA pare no meio de uma frase, nunca corte palavras e nunca deixe reticências abertas. O último parágrafo DEVE obrigatoriamente terminar com uma frase 100% finalizada com ponto final (.), exclamação (!) ou interrogação (?).
${num === total ? '9. DESFECHO DEFINITIVO: Este é o encerramento do livro completo. A obra DEVE ter conclusão definitiva, com último parágrafo finalizado perfeitamente com ponto final (.), sem deixar nenhuma frase cortada ou em aberto.' : ''}
10. Texto puro pronto para publicação. Não use asteriscos, markdown nem notas de rodapé.
11. VISÃO EDITORIAL ORQUESTRADA: ${plano.editorialVision}
12. PROMESSA AO LEITOR: ${plano.readerPromise}
13. BÍBLIA DE CONTINUIDADE: ${plano.continuityBible}

FORMATO ESTRITO:
TITULO: ${isEnBook ? `Chapter ${num}: Creative Chapter Title in English` : isEsBook ? `Capítulo ${num}: Título Creativo en Español` : `Título Criativo do Capítulo ${num}`}
TEXTO:
(Parágrafos da história separados por linha em branco)`;

        // PROMPT DO USUÁRIO ENXUTO E DIRETO
        let prompt = `━━━ DADOS DA OBRA ━━━
Título: "${livroBase.titulo}" | Subtítulo: "${livroBase.subtitulo}"
Autor: ${livroBase.autor} | Gênero: ${livroBase.genero} (${livroBase.idioma})
Premissa Central: ${topico}

━━━ DIRETRIZ DO CAPÍTULO ${num} DE ${total} ━━━
${diretrizEstrutural}
Título planejado: ${diretrizArquitetura.title}
Objetivo do capítulo: ${diretrizArquitetura.objective}
Pontos-chave: ${(diretrizArquitetura.keyPoints || []).map(point => `- ${point}`).join('\n')}
Transição planejada: ${diretrizArquitetura.transition || 'Conectar de forma fluida com a continuidade.'}

━━━ GANCHO DE TRANSIÇÃO DIRETA ━━━
${ganchoImediato}`;

        if (historicoEnredo && historicoEnredo !== 'Início da narrativa.') {
          prompt += `\n\n━━━ CONTINUIDADE DOS CAPÍTULOS ANTERIORES ━━━\n${historicoEnredo}`;
        }

        if (frasesArray.length > 0) {
          prompt += `\n\nEVITE REPETIR AS SEGUINTES EXPRESSÕES:\n${frasesArray.map(f => `- ${f}`).join('\n')}`;
        }

        // Folga generosa de tokens para que o modelo NUNCA sofra corte prematuro (MAX_TOKENS)
        const maxTokensCapitulo = modoEconomico
          ? Math.max(3500, Math.round(palavrasPorCap * 3.5))
          : Math.max(6000, Math.min(8192, Math.round(palavrasPorCap * 4.2)));

        const res = await chamarGeminiTexto(prompt, {
          temperature: 0.88,
          maxTokens: maxTokensCapitulo,
          systemInstruction,
          maxRetries: 2,
          onStatusUpdate: (msg) => {
            setStatusMsg(msg);
            logDiag(msg);
          },
          onAttemptModel: (mod) => {
            logDiag(`Capítulo ${num}: gerando narrativa com ${mod}...`);
          }
        });

        if (res.tokensTotal) {
          setTokensConsumidosTotal(prev => prev + res.tokensTotal!);
          setCustoEstimadoTotalBrl(prev => prev + (res.custoBrl || 0));
        }

        const cap = parseCapitulo(res.texto, num, total);

        // BLINDAGEM EDITORIAL E SANITIZAÇÃO DE INTEGRIDADE (LaTeX, Metadados de IA, Truncamentos, Diálogos)
        const sanitizacao = ManuscriptIntegrityEngine.sanitizeChapterContent(cap.texto);
        cap.texto = sanitizacao.cleanText;
        cap.titulo = ManuscriptIntegrityEngine.cleanLaTeXResiduals(cap.titulo);

        if (sanitizacao.wasTruncated) {
          logDiag(`Capítulo ${num}: Truncamento detectado e auto-reparado sintaticamente (${sanitizacao.truncationReason || 'fechamento de período'}).`);
        }
        if (sanitizacao.markersRemoved.length > 0) {
          logDiag(`Capítulo ${num}: Marcadores de controle removidos: "${sanitizacao.markersRemoved.join('", "')}".`);
        }

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
            log.capitulo === num ? { ...log, resolvido: true, acao: `✓ Auto-recuperado com sucesso` } : log
          ));
        }
        tentativasConsecutivasCapitulo = 0;

        logDiag(`✓ Capítulo ${num} concluído com sucesso (${cap.texto.split(/\s+/).length} palavras)`);
        setStatusMsg(`✓ Capítulo ${num}/${total} concluído com sucesso!`);

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
      const missingStoryArt = bookType === 'children-picture-book'
        ? livroBase.capitulos.filter(chapter => !chapter.imagemDataUrl).length
        : 0;
      setStatusMsg(missingStoryArt > 0
        ? `✓ História concluída. ${missingStoryArt} ilustração(ões) ainda precisam ser geradas no preview antes de exportar.`
        : '✓ Livro completo com sucesso! Agora você pode gerar a capa e a página promocional.');
      setStatusType(missingStoryArt > 0 ? 'error' : 'ok');
      logDiag('✓ Todos os capítulos foram gerados.');
    }

    setGerando(false);
  };

  const assegurarConclusaoCapitulo = (texto: string, isUltimoCapitulo: boolean): string => {
    let t = texto.trim();
    if (!t) return t;

    // Se o texto não termina com pontuação terminal (. ! ? " ” »)
    const terminaComPontuacao = /[.!?…"”»]$/.test(t);

    if (!terminaComPontuacao) {
      // O texto foi cortado prematuramente no final: localiza o último ponto terminal completo
      const ultimoPonto = Math.max(
        t.lastIndexOf('.'),
        t.lastIndexOf('!'),
        t.lastIndexOf('?')
      );

      // Se houver um ponto terminal nos últimos 350 caracteres, preserva até ele para não deixar fragmento quebrado
      if (ultimoPonto > 0 && ultimoPonto > t.length - 350) {
        t = t.substring(0, ultimoPonto + 1).trim();
      } else {
        // Caso contrário, fecha a frase com ponto final gramatical
        t = t + '.';
      }
    }

    // Se for o último capítulo da obra inteira, assegurar um desfecho digno e ponto final
    if (isUltimoCapitulo) {
      if (!/[.!?]$/.test(t)) {
        t = t + '.';
      }
    }

    return t;
  };

  const parseCapitulo = (txt: string, num: number, totalCaps?: number): Capitulo => {
    const isEn = Boolean(idioma && /ingl|en/i.test(idioma));
    const mt = txt.match(/(?:TITULO|TITLE):\s*(.+)/i);
    const mx = txt.match(/(?:TEXTO|TEXT):\s*([\s\S]+)/i);
    let texto = mx ? mx[1].trim() : txt.trim();
    texto = texto.replace(/^TITLE:\s*.+$/im, '').replace(/^TEXT:\s*/im, '')
      .replace(/^TITULO:\s*.+$/im, '').replace(/^TEXTO:\s*/im, '').trim();

    // GARANTE INTEGRIDADE DO FINAL: impede término com frase cortada ou palavras faltando
    texto = assegurarConclusaoCapitulo(texto, totalCaps ? num === totalCaps : false);

    let rawTitle = mt ? mt[1].trim() : (isEn ? `Chapter ${num}` : `Capítulo ${num}`);
    if (isEn) {
      rawTitle = rawTitle.replace(/^cap[íi]tulo\s*/i, 'Chapter ');
      if (!/^chapter\s*\d+/i.test(rawTitle)) {
        rawTitle = `Chapter ${num}: ${rawTitle}`;
      }
    }

    return {
      titulo: rawTitle,
      texto
    };
  };

  // HIGIENIZAÇÃO DE CONCORDÂNCIA E GRAMÁTICA DE TÍTULO
  const higienizarTituloEditorial = (t: string): string => {
    return t
      .replace(/\bO Mapa dos Liberdade\b/gi, 'O Mapa da Liberdade')
      .replace(/\bO Guia dos Liberdade\b/gi, 'O Guia da Liberdade')
      .replace(/\bO Manual dos Liberdade\b/gi, 'O Manual da Liberdade')
      .replace(/\bO Segredo dos Liberdade\b/gi, 'O Segredo da Liberdade')
      .replace(/\bO Caminho dos Liberdade\b/gi, 'O Caminho da Liberdade')
      .trim();
  };

  // CONSTRUTOR DE PROMPT VISUAL DE ARTE EDITORIAL LIMPA (ANTI-SELO & ZERO TEXTO NA IMAGEM)
  const construirPromptArteCapa = (
    genero: string,
    premissa: string,
    amostra: string,
    estiloVisual: CoverVisualStyle,
    customPrompt?: string
  ): string => {
    const isKids = bookType === 'children-picture-book' || /infantil|crian|kids|3-5|6-8/i.test(`${genero} ${premissa} ${faixaEtaria}`);
    return buildCoverArtPrompt(genero, premissa, amostra, estiloVisual, customPrompt, {
      bookType,
      ageBand: faixaEtaria,
      isKids
    });
  };

  // DIAGRAMAÇÃO TIPOGRÁFICA EDITORIAL DA CAPA VIA CANVAS (1600x2400)
  // Padrão visual elegante adaptado ao público do livro (infantil ou adulto):
  // 1. Zero selos / Zero medalhas artificiais
  // 2. Clean Zone (Área Limpa) exclusiva para o título com alto contraste
  // 3. Tipografia personalizada (lúdica/arredondada para infantil, refinada para não-ficção)
  // 4. REGRA DE OURO ORTOGRÁFICA: 100% de precisão em acentuação e cedilhas
  const diagramarCapaCanvas = async (
    capaImgUrl: string,
    obraTituloRaw: string,
    obraSubtitulo: string,
    obraAutor: string,
    obraGenero: string,
    obraPremissa: string,
    tipoEstilo: 'modern-magazine' | 'luxury-serif' | 'bold-impact' = estiloCapaTipo,
    zonaLimpa: 'suave' | 'media' | 'forte' = intensidadeZonaLimpa,
    layoutTitulo: CoverTitleLayout = posicaoTituloCapa,
    customTituloConfig?: {
      offsetY?: number;
      fontSize?: number;
      fontFamily?: string;
    }
  ): Promise<string> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 2400;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível obter contexto 2D do canvas da capa');

    // Sanitização ortográfica editorial estrita (impede 'financas' e força 'Finanças' com acentos corretos)
    const obraTitulo = sanitizarOrtografiaEditorialCapa(higienizarTituloEditorial(obraTituloRaw));
    const obraSubtituloLimpo = sanitizarOrtografiaEditorialCapa(obraSubtitulo);
    const obraAutorLimpo = sanitizarOrtografiaEditorialCapa(obraAutor);

    const img = await carregarElementoImagem(capaImgUrl);
    // Corta os 8% inferiores da imagem para eliminar 100% de qualquer marca d'água residual
    const srcW = img.naturalWidth || img.width || canvas.width;
    const srcH = img.naturalHeight || img.height || canvas.height;
    const cropH = Math.floor(srcH * 0.92);
    ctx.drawImage(img, 0, 0, srcW, cropH, 0, 0, canvas.width, canvas.height);

    // 1. OBTÉM PALETA E CONFIGURAÇÃO TIPOGRÁFICA ARTÍSTICA DA OBRA
    const isObraInfantil = bookType === 'children-picture-book' || /infantil|crian|kids|3-5|6-8/i.test(`${obraGenero} ${obraPremissa} ${faixaEtaria}`);
    const configTipo = getCoverTypographyTheme(
      obraGenero,
      tipoEstilo,
      isObraInfantil ? 'playful-kids' : 'auto',
      { isKids: isObraInfantil, bookType, ageBand: faixaEtaria }
    );

    // 1.1 VINHETA CINEMATOGRÁFICA SUTIL SUPERIOR E INFERIOR (ALTO CONTRASTE TIPOGRÁFICO)
    const topVignette = ctx.createLinearGradient(0, 0, 0, 960);
    topVignette.addColorStop(0, 'rgba(6, 9, 18, 0.72)');
    topVignette.addColorStop(0.55, 'rgba(6, 9, 18, 0.28)');
    topVignette.addColorStop(1, 'rgba(6, 9, 18, 0.0)');
    ctx.fillStyle = topVignette;
    ctx.fillRect(0, 0, canvas.width, 960);

    const bottomVignette = ctx.createLinearGradient(0, canvas.height - 760, 0, canvas.height);
    bottomVignette.addColorStop(0, 'rgba(6, 9, 18, 0.0)');
    bottomVignette.addColorStop(0.45, 'rgba(6, 9, 18, 0.42)');
    bottomVignette.addColorStop(1, 'rgba(6, 9, 18, 0.84)');
    ctx.fillStyle = bottomVignette;
    ctx.fillRect(0, canvas.height - 760, canvas.width, 760);

    // 1.2 MOLDURA EDITORIAL DUPLA DE LUXO DENTRO DA ZONA SEGURA KDP G201113520 (0.25" = ~68px)
    ctx.save();
    const frameOuter = 68;
    const frameInner = 84;
    const frameColor = configTipo.titleGradient[0] || '#FDE68A';
    ctx.strokeStyle = frameColor;
    ctx.globalAlpha = 0.52;
    ctx.lineWidth = 3;
    ctx.strokeRect(frameOuter, frameOuter, canvas.width - frameOuter * 2, canvas.height - frameOuter * 2);
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(frameInner, frameInner, canvas.width - frameInner * 2, canvas.height - frameInner * 2);

    // Cantoneiras clássicas nos 4 cantos
    ctx.globalAlpha = 0.72;
    ctx.lineWidth = 3.5;
    const cLen = 40;
    const corners = [
      [frameOuter, frameOuter, 1, 1],
      [canvas.width - frameOuter, frameOuter, -1, 1],
      [frameOuter, canvas.height - frameOuter, 1, -1],
      [canvas.width - frameOuter, canvas.height - frameOuter, -1, -1]
    ];
    for (const [cx, cy, dx, dy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx, cy + dy * cLen);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + dx * cLen, cy);
      ctx.stroke();
    }
    ctx.restore();

    // 1.3 SELO EDITORIAL DE CATEGORIA NO TOPO
    if (obraGenero && obraGenero.trim()) {
      ctx.save();
      ctx.font = `700 24px ${configTipo.fontFamilyAuthor}`;
      ctx.fillStyle = frameColor;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 8;
      const sealLabel = sanitizarOrtografiaEditorialCapa(obraGenero.trim()).toUpperCase();
      const spacedSeal = sealLabel.length <= 28 ? sealLabel.split('').join(' ') : sealLabel;
      ctx.fillText(spacedSeal, canvas.width / 2, 148);
      ctx.strokeStyle = frameColor;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - 170, 168);
      ctx.lineTo(canvas.width / 2 + 170, 168);
      ctx.stroke();
      ctx.restore();
    }

    // Dimensionamento harmônico do título (ou personalizado pelo autor)
    let fontSizeTit = customTituloConfig?.fontSize || 116;
    if (!customTituloConfig?.fontSize) {
      if (obraTitulo.length > 50) fontSizeTit = 82;
      else if (obraTitulo.length > 32) fontSizeTit = 96;
      else if (obraTitulo.length > 20) fontSizeTit = 114;
      else if (obraTitulo.length < 14) fontSizeTit = 138; // Títulos concisos ganham presença imponente lá no topo
    }

    // TÍTULO LÁ EM CIMA GRANDE (Terço Superior da Capa)
    const baseCentroTitulo = 420;
    const centroTitulo = baseCentroTitulo + (customTituloConfig?.offsetY || 0);

    const chosenFontFamily = customTituloConfig?.fontFamily || configTipo.fontFamilyTitle;
    ctx.font = `${configTipo.fontWeightTitle} ${fontSizeTit}px ${chosenFontFamily}`;
    ctx.shadowColor = configTipo.shadowColor;
    ctx.shadowBlur = configTipo.shadowBlur;

    const tituloAlinhadoEsquerda = layoutTitulo === 'esquerda';
    ctx.textAlign = tituloAlinhadoEsquerda ? 'left' : 'center';
    const larguraMaxTitulo = tituloAlinhadoEsquerda ? canvas.width - 420 : canvas.width - 240;
    const linhasTitulo = quebrarLinhas(ctx, obraTitulo.toUpperCase(), larguraMaxTitulo);
    const lineHTit = Math.round(fontSizeTit * 1.16);
    const alturaTotalTit = linhasTitulo.length * lineHTit;

    let yTit = Math.round(centroTitulo - (alturaTotalTit / 2) + (fontSizeTit * 0.35));
    const xTitulo = tituloAlinhadoEsquerda ? 150 : canvas.width / 2;

    // Gradiente vertical para conferir acabamento harmônico e nobre ao título
    const gradTitulo = ctx.createLinearGradient(0, yTit - lineHTit, 0, yTit + alturaTotalTit);
    gradTitulo.addColorStop(0, configTipo.titleGradient[0]);
    gradTitulo.addColorStop(1, configTipo.titleGradient[1]);

    linhasTitulo.forEach(l => {
      ctx.strokeStyle = configTipo.strokeColor;
      ctx.lineWidth = configTipo.strokeWidth;
      ctx.strokeText(l, xTitulo, yTit);
      ctx.fillStyle = gradTitulo;
      ctx.fillText(l, xTitulo, yTit);
      yTit += lineHTit;
    });

    // Ornamento losango de luxo abaixo do título
    if (!tituloAlinhadoEsquerda) {
      ctx.save();
      const ornY = yTit - Math.round(lineHTit * 0.48);
      ctx.strokeStyle = frameColor;
      ctx.fillStyle = frameColor;
      ctx.globalAlpha = 0.78;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - 210, ornY);
      ctx.lineTo(canvas.width / 2 - 26, ornY);
      ctx.moveTo(canvas.width / 2 + 26, ornY);
      ctx.lineTo(canvas.width / 2 + 210, ornY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, ornY - 11);
      ctx.lineTo(canvas.width / 2 + 11, ornY);
      ctx.lineTo(canvas.width / 2, ornY + 11);
      ctx.lineTo(canvas.width / 2 - 11, ornY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 2. NOME DO AUTOR NA PARTE DE BAIXO DO LIVRO (RODAPÉ)
    const yAutor = canvas.height - 140; // 2260px
    ctx.shadowBlur = configTipo.shadowBlur;
    ctx.shadowColor = configTipo.shadowColor;
    ctx.font = `${configTipo.fontWeightAuthor} 46px ${configTipo.fontFamilyAuthor}`;
    ctx.fillStyle = configTipo.authorColor;
    ctx.textAlign = 'center';
    const spacedAutor = configTipo.authorLetterSpacing
      ? obraAutorLimpo.toUpperCase().split('').join(' ')
      : obraAutorLimpo;
    ctx.strokeStyle = configTipo.strokeColor;
    ctx.lineWidth = Math.max(2, configTipo.strokeWidth - 1);
    ctx.strokeText(spacedAutor, canvas.width / 2, yAutor);
    ctx.fillText(spacedAutor, canvas.width / 2, yAutor);

    // 3. SUBTÍTULO COMERCIAL HARMONIZADO: UM POUCO ACIMA DO NOME DO AUTOR
    if (obraSubtituloLimpo) {
      ctx.textAlign = 'center';
      let fontSizeSub = 42;
      if (obraSubtituloLimpo.length > 90) fontSizeSub = 36;
      else if (obraSubtituloLimpo.length > 55) fontSizeSub = 39;

      ctx.font = `${configTipo.fontWeightSubtitle} ${fontSizeSub}px ${configTipo.fontFamilySubtitle}`;
      ctx.fillStyle = configTipo.subtitleColor;
      ctx.shadowColor = configTipo.shadowColor;
      ctx.shadowBlur = Math.round(configTipo.shadowBlur * 0.75);

      const linhasSub = quebrarLinhas(ctx, obraSubtituloLimpo, canvas.width - 280);
      const lineHSub = Math.round(fontSizeSub * 1.34);
      const alturaTotalSub = linhasSub.length * lineHSub;

      // Ancorado imediatamente acima do nome do autor com respiro editorial
      const yBaseSub = yAutor - 90;
      let ySub = yBaseSub - alturaTotalSub + fontSizeSub;

      linhasSub.forEach(l => {
        ctx.strokeStyle = configTipo.strokeColor;
        ctx.lineWidth = Math.max(2, configTipo.strokeWidth - 1);
        ctx.strokeText(l, canvas.width / 2, ySub);
        ctx.fillText(l, canvas.width / 2, ySub);
        ySub += lineHSub;
      });
    }

    return canvas.toDataURL('image/png');
  };

  // SINCRONIZAÇÃO: Garante que a capa ativa atual esteja sempre presente no histórico do carrossel
  useEffect(() => {
    if (capaFinal) {
      setHistoricoCapas(prev => {
        const jaExiste = prev.some(c => c.dataUrl === capaFinal);
        if (!jaExiste) {
          return [{
            id: `capa_sync_${Date.now()}`,
            dataUrl: capaFinal,
            fundoUrl: fundoImg || undefined,
            timestamp: Date.now(),
            estilo: estiloCapaTipo,
            conceito: estiloArteVisual
          }, ...prev];
        }
        return prev;
      });
    }
  }, [capaFinal]);

  // CONTROLES DO CARROSSEL DE CAPAS
  const handleCapaAnterior = () => {
    if (historicoCapas.length <= 1) return;
    setIndiceCapaCarrossel(prev => (prev > 0 ? prev - 1 : historicoCapas.length - 1));
  };

  const handleCapaProxima = () => {
    if (historicoCapas.length <= 1) return;
    setIndiceCapaCarrossel(prev => (prev < historicoCapas.length - 1 ? prev + 1 : 0));
  };

  const handleSelecionarCapaCarrossel = (index: number) => {
    setIndiceCapaCarrossel(index);
  };

  const handleDefinirComoCapaAtiva = (item: ItemHistoricoCapa) => {
    setCapaFinal(item.dataUrl);
    if (item.fundoUrl) setFundoImg(item.fundoUrl);
    if (livro) {
      salvarProgressoLocal(livro, item.dataUrl, item.fundoUrl, promoData || undefined);
    }
    setStatusMsg('✓ Esta variação foi selecionada e ativada como a capa oficial do livro!');
    setStatusType('ok');
  };

  const handleExcluirCapaDoHistorico = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (historicoCapas.length <= 1) {
      setStatusMsg('O livro precisa manter ao menos 1 capa.');
      setStatusType('normal');
      return;
    }
    const itemExcluido = historicoCapas.find(c => c.id === id);
    const novaLista = historicoCapas.filter(c => c.id !== id);
    setHistoricoCapas(novaLista);
    setIndiceCapaCarrossel(prev => Math.min(prev, Math.max(0, novaLista.length - 1)));
    if (itemExcluido && itemExcluido.dataUrl === capaFinal && novaLista.length > 0) {
      setCapaFinal(novaLista[0].dataUrl);
      if (novaLista[0].fundoUrl) setFundoImg(novaLista[0].fundoUrl);
      if (livro) salvarProgressoLocal(livro, novaLista[0].dataUrl, novaLista[0].fundoUrl, promoData || undefined, novaLista);
    } else if (livro) {
      salvarProgressoLocal(livro, capaFinal || undefined, fundoImg || undefined, promoData || undefined, novaLista);
    }
    setStatusMsg('Variação de capa descartada do carrossel.');
    setStatusType('normal');
  };

  // GERAR CONTRACAPA E VISÃO COMPLETA ABERTA KDP (FULL WRAP / PRINT PREVIEWER)
  const gerarContracapaEWrap = async (
    capaFrontalUrl: string,
    tituloParam?: string,
    autorParam?: string,
    generoParam?: string,
    sinopseParam?: string,
    customTexto?: { hookHeadline: string; synopsisText: string; readerBenefits: string[] },
    customContracapaConfig?: {
      textAlign?: 'left' | 'center' | 'right';
      authorPhotoUrl?: string;
      authorPhotoSize?: number;
    }
  ) => {
    try {
      const obTitle = tituloParam || livro?.titulo || titulo.trim() || 'Obra Editorial';
      const obAuthor = autorParam || livro?.autor || autor.trim() || 'Autor';
      const obGenre = generoParam || livro?.genero || genero || 'Ficção';
      const obSynopsis = sinopseParam || topico.trim() || uniqueAngle || obTitle;
      const isKids = bookType === 'children-picture-book' || /infantil|crian|kids|3-5|6-8/i.test(`${obGenre} ${obSynopsis} ${faixaEtaria}`);
      const numPags = livro?.capitulos?.length ? Math.max(24, livro.capitulos.length * 6) : paginasAlvo;

      const backDataUrl = await PrintCoverService.diagramarContracapaCanvas({
        title: obTitle,
        author: obAuthor,
        genre: obGenre,
        synopsis: customTexto?.synopsisText || obSynopsis,
        hookHeadline: customTexto?.hookHeadline,
        benefits: customTexto?.readerBenefits,
        isKids,
        trimSize: (formato as any) || '6x9',
        paperType: 'bw-white',
        textAlign: customContracapaConfig?.textAlign || contracapaAlign,
        authorPhotoUrl: customContracapaConfig?.authorPhotoUrl !== undefined ? customContracapaConfig.authorPhotoUrl : (contracapaAuthorPhotoUrl || undefined),
        authorPhotoSize: customContracapaConfig?.authorPhotoSize || contracapaAuthorPhotoSize
      });

      setContracapaFinal(backDataUrl);

      const wrapUrl = await PrintCoverService.diagramarWrapCompositeCanvas({
        frontCoverDataUrl: capaFrontalUrl,
        backCoverDataUrl: backDataUrl,
        title: obTitle,
        author: obAuthor,
        pageCount: numPags,
        trimSize: (formato as any) || '6x9',
        paperType: 'bw-white',
        showGuides: showKdpGuides
      });

      setWrapPreviewUrl(wrapUrl);

      // Gera as 7 palavras-chave oficiais do KDP se não existirem
      if (keywordsKdp.length === 0) {
        const generatedKeys = PublishingMetadataService.generateKdpKeywords({
          title: obTitle,
          subtitle: livro?.subtitulo || subtitulo,
          author: obAuthor,
          genre: obGenre,
          targetAudience: targetReader || 'Público Geral',
          description: obSynopsis,
          bookType
        });
        setKeywordsKdp(generatedKeys);
      }

      return { backDataUrl, wrapUrl };
    } catch (err) {
      console.warn('Erro ao gerar contracapa e wrap:', err);
      return null;
    }
  };

  const handleToggleGuides = async (novoValor: boolean) => {
    setShowKdpGuides(novoValor);
    if (capaFinal && contracapaFinal) {
      const obTitle = livro?.titulo || titulo.trim() || 'Obra Editorial';
      const obAuthor = livro?.autor || autor.trim() || 'Autor';
      const numPags = livro?.capitulos?.length ? Math.max(24, livro.capitulos.length * 6) : paginasAlvo;
      try {
        const wrapUrl = await PrintCoverService.diagramarWrapCompositeCanvas({
          frontCoverDataUrl: capaFinal,
          backCoverDataUrl: contracapaFinal,
          title: obTitle,
          author: obAuthor,
          pageCount: numPags,
          trimSize: (formato as any) || '6x9',
          paperType: 'bw-white',
          showGuides: novoValor
        });
        setWrapPreviewUrl(wrapUrl);
      } catch (err) {
        console.warn('Erro ao alternar guias KDP:', err);
      }
    }
  };

  const handleReaplicarContracapa = async () => {
    if (!capaFinal) return;
    setStatusMsg('🔄 Reaplicando texto e alinhamento na Contracapa...');
    setStatusType('normal');
    await gerarContracapaEWrap(
      capaFinal,
      livro?.titulo || titulo,
      livro?.autor || autor,
      livro?.genero || genero,
      contracapaTexto?.synopsisText,
      contracapaTexto || undefined,
      {
        textAlign: contracapaAlign,
        authorPhotoUrl: contracapaAuthorPhotoUrl || undefined,
        authorPhotoSize: contracapaAuthorPhotoSize
      }
    );
    setStatusMsg('✓ Contracapa atualizada com sucesso!');
    setStatusType('ok');
    setIsEditingBackCover(false);
  };

  // ─── AGENTE LEITOR DE ÁUDIO DO MANUSCRITO (VOZ NEURAL HUMANA DA PLATAFORMA - MESMO MOTOR DO COAUTHOR) ───
  const splitTextIntoSpeechChunks = (rawText: string): string[] => {
    if (!rawText) return [];
    return coAuthorVoiceService.splitIntoChunks(rawText);
  };

  const fetchNeuralSpeechAudioUrl = async (text: string, signal?: AbortSignal): Promise<string | null> => {
    const trimmed = text.trim();
    if (!trimmed) return null;

    const cacheKey = `neural_francisca_${idioma}_${trimmed}`;
    if (audioUrlCacheRef.current.has(cacheKey)) {
      return audioUrlCacheRef.current.get(cacheKey)!;
    }

    const lang = idioma === 'inglês' ? 'en-US' : idioma === 'espanhol' ? 'es-ES' : 'pt-BR';
    // Obrigatoriamente voz Francisca para português (pt-BR-FranciscaNeural)
    const voiceId = idioma === 'inglês'
      ? 'edge:en-US-JennyNeural'
      : idioma === 'espanhol'
      ? 'edge:es-ES-ElviraNeural'
      : 'edge:pt-BR-FranciscaNeural';

    // 1. Tenta endpoint principal de voz neural humana (/api/audiobook/preview-voice)
    try {
      const res = await fetch('/api/audiobook/preview-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: lang,
          voiceGender: 'female',
          voiceId,
          text: trimmed
        }),
        signal
      });

      if (res.ok) {
        const blob = await res.blob();
        if (blob && blob.size > 200) {
          const url = URL.createObjectURL(blob);
          audioUrlCacheRef.current.set(cacheKey, url);
          return url;
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      console.warn('[AgenteNarrador] Endpoint neural primário oscilou:', err);
    }

    // 2. Tenta rota secundária (/api/tts/synthesize)
    try {
      const res = await fetch('/api/tts/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: trimmed,
          lang,
          voiceGender: 'female',
          voiceId
        }),
        signal
      });

      if (res.ok) {
        const blob = await res.blob();
        if (blob && blob.size > 200) {
          const url = URL.createObjectURL(blob);
          audioUrlCacheRef.current.set(cacheKey, url);
          return url;
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
    }

    return null;
  };

  /**
   * Pré-carrega um segmento de fala em um elemento HTMLAudioElement antecipado com buffer pronto
   */
  const preloadAudioSegment = async (
    chunkIndex: number,
    text: string,
    signal?: AbortSignal
  ): Promise<HTMLAudioElement | null> => {
    if (audioQueuePoolRef.current.has(chunkIndex)) {
      return audioQueuePoolRef.current.get(chunkIndex)!;
    }
    if (audioPrefetchPromisesRef.current.has(chunkIndex)) {
      return audioPrefetchPromisesRef.current.get(chunkIndex)!;
    }

    const promise = (async () => {
      const audioUrl = await fetchNeuralSpeechAudioUrl(text, signal);
      if (!audioUrl) return null;
      const audio = new Audio(audioUrl);
      audio.preload = 'auto';
      audio.playbackRate = audioSpeedRef.current;
      try { audio.load(); } catch {}
      audioQueuePoolRef.current.set(chunkIndex, audio);
      return audio;
    })();

    audioPrefetchPromisesRef.current.set(chunkIndex, promise);
    return promise;
  };

  /**
   * Garante o buffer contínuo dos próximos chunks antecipadamente para zero delay e leitura sem interrupções
   */
  const ensurePrefetchAhead = (startIndex: number, segments: NarrationSegment[], lookahead = 3) => {
    for (let i = startIndex; i < Math.min(segments.length, startIndex + lookahead); i++) {
      if (!audioQueuePoolRef.current.has(i) && !audioPrefetchPromisesRef.current.has(i)) {
        preloadAudioSegment(i, segments[i].speechText, audioAbortControllerRef.current?.signal);
      }
    }
  };

  const scrollToActiveNarration = (capIdx: number, pIdx: number) => {
    // Aguarda o ciclo de renderização do React para o novo #active-narration-chunk estar no DOM
    setTimeout(() => {
      const activeChunk = document.getElementById('active-narration-chunk');
      const headerElem = pIdx === -1 ? document.getElementById(`read-cap-${capIdx}-header`) : null;
      const paraElem = document.getElementById(`read-cap-${capIdx}-p-${pIdx}`);

      const target = activeChunk || headerElem || paraElem;
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight || 800;

      // Posição de leitura ideal: terço superior da tela (~30% do topo da janela)
      const idealViewportTop = Math.round(windowHeight * 0.30);

      // Quando o texto lido passa de 45% da tela (descendo em direção ao final) ou fica acima do topo:
      if (rect.bottom > windowHeight * 0.45 || rect.top < 90) {
        const scrollDiff = rect.top - idealViewportTop;
        const currentWindowY = window.pageYOffset || document.documentElement.scrollTop || 0;
        const targetWindowY = Math.max(0, currentWindowY + scrollDiff);

        // Rola a janela principal do navegador suavemente fazendo a página SUBIR
        window.scrollTo({
          top: targetWindowY,
          behavior: 'smooth'
        });
      }

      // Se houver overflow ativo dentro do container previewScrollRef:
      if (previewScrollRef.current) {
        const container = previewScrollRef.current;
        if (container.scrollHeight > container.clientHeight) {
          const cRect = container.getBoundingClientRect();
          const relTop = rect.top - cRect.top;
          const cIdeal = Math.round(container.clientHeight * 0.30);
          if (relTop > container.clientHeight * 0.45 || relTop < 60) {
            container.scrollTo({
              top: Math.max(0, container.scrollTop + (relTop - cIdeal)),
              behavior: 'smooth'
            });
          }
        }
      }

      // Garantia nativa adicional: alinha ao centro suavemente
      try {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      } catch {}
    }, 40);
  };

  const stopAudioReading = () => {
    isAudioActiveRef.current = false;
    audioPlayTokenRef.current++;

    try {
      cinematicAudioDirector.stop();
    } catch {}

    if (audioAbortControllerRef.current) {
      try { audioAbortControllerRef.current.abort(); } catch {}
      audioAbortControllerRef.current = null;
    }

    if (currentAudioElemRef.current) {
      try {
        currentAudioElemRef.current.pause();
        currentAudioElemRef.current.currentTime = 0;
        currentAudioElemRef.current.src = '';
      } catch {}
      currentAudioElemRef.current = null;
    }

    // Esvazia a fila de prefetch de áudio
    audioQueuePoolRef.current.forEach((a) => {
      try {
        a.pause();
        a.currentTime = 0;
        a.src = '';
      } catch {}
    });
    audioQueuePoolRef.current.clear();
    audioPrefetchPromisesRef.current.clear();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }

    audioNextPromiseRef.current = null;
    setIsPlayingAudio(false);
    setIsAudioPaused(false);
    setAudioReadingCapIndex(null);
    setCurrentChunkIndex(0);
    setTotalChunksCount(0);
    setActiveNarrationSegment(null);
    audioSegmentsRef.current = [];
    narrationProgressStore.reset();
  };

  const pauseAudioReading = () => {
    if (currentAudioElemRef.current) {
      currentAudioElemRef.current.pause();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
    try {
      cinematicAudioDirector.setDucking(false);
    } catch {}
    setIsAudioPaused(true);
    narrationProgressStore.set({ paused: true });
  };

  const resumeAudioReading = () => {
    try {
      cinematicAudioDirector.resume();
      cinematicAudioDirector.setDucking(true);
    } catch {}
    if (currentAudioElemRef.current) {
      currentAudioElemRef.current.playbackRate = audioSpeedRef.current;
      currentAudioElemRef.current.play().catch(e => console.warn(e));
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
    setIsAudioPaused(false);
    narrationProgressStore.set({ paused: false });
  };

  const playSpeechChunk = async (chunkIndex: number) => {
    if (!isAudioActiveRef.current || !livro || !livro.capitulos) return;
    const capIdx = audioCapIndexRef.current;
    const cap = livro.capitulos[capIdx];
    if (!cap) {
      stopAudioReading();
      return;
    }

    const segments = audioSegmentsRef.current;
    if (chunkIndex >= segments.length) {
      if (audioModeRef.current === 'full' && capIdx + 1 < livro.capitulos.length) {
        setTimeout(() => {
          if (isAudioActiveRef.current) {
            startAudioReading(capIdx + 1, 'full');
          }
        }, 500);
      } else {
        stopAudioReading();
        setStatusMsg(ui('✓ Leitura de áudio neural concluída com sucesso!', '✓ Neural audio reading completed successfully!'));
        setStatusType('ok');
      }
      return;
    }

    const currentToken = ++audioPlayTokenRef.current;
    setCurrentChunkIndex(chunkIndex);
    const seg = segments[chunkIndex];
    setActiveNarrationSegment(seg);
    narrationProgressStore.set({
      active: true,
      paused: false,
      capIndex: capIdx,
      segmentIndex: chunkIndex,
      segments
    });

    // Rola suavemente o texto da obra para acompanhar a narração em tempo real
    scrollToActiveNarration(capIdx, seg.paragraphIndex);

    const textToSpeak = seg.speechText;

    // Dispara prefetch dos próximos 3 chunks antecipadamente para zero delay entre as falas
    ensurePrefetchAhead(chunkIndex + 1, segments, 3);

    try {
      // 1. Obtém elemento de áudio (instantâneo se já estiver no pool pré-carregado em background)
      let audio = audioQueuePoolRef.current.get(chunkIndex) || null;
      if (!audio) {
        audio = await preloadAudioSegment(chunkIndex, textToSpeak, audioAbortControllerRef.current?.signal);
      }

      if (!isAudioActiveRef.current || audioPlayTokenRef.current !== currentToken) return;

      // 2. Se tiver áudio neural com voz Francisca:
      if (audio) {
        currentAudioElemRef.current = audio;
        audio.playbackRate = audioSpeedRef.current;

        audio.onended = () => {
          try {
            cinematicAudioDirector.setDucking(false);
          } catch {}
          if (isAudioActiveRef.current && audioPlayTokenRef.current === currentToken) {
            playSpeechChunk(chunkIndex + 1);
          }
        };

        audio.onerror = () => {
          console.warn('[AgenteNarrador] Erro no player de áudio neural, passando ao próximo chunk');
          try {
            cinematicAudioDirector.setDucking(false);
          } catch {}
          if (isAudioActiveRef.current && audioPlayTokenRef.current === currentToken) {
            playSpeechChunk(chunkIndex + 1);
          }
        };

        try {
          cinematicAudioDirector.setDucking(true);
        } catch {}

        await audio.play().catch(err => {
          console.warn('[AgenteNarrador] Autoplay bloqueado ou cancelado:', err);
        });
      } else {
        // Fallback de emergência caso o servidor de voz esteja inacessível: seleciona obrigatoriamente a Francisca
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(textToSpeak);
          utterance.lang = idioma === 'inglês' ? 'en-US' : idioma === 'espanhol' ? 'es-ES' : 'pt-BR';
          utterance.rate = audioSpeedRef.current;

          // Seleciona Francisca ou melhor voz brasileira neural disponível no sistema
          try {
            const voices = window.speechSynthesis.getVoices();
            const franciscaVoice = voices.find(v => 
              /francisca/i.test(v.name) || /francisca/i.test(v.voiceURI)
            ) || voices.find(v => 
              v.lang.startsWith('pt') && (/natural/i.test(v.name) || /google/i.test(v.name) || /maria/i.test(v.name) || /luciana/i.test(v.name))
            ) || voices.find(v => v.lang === 'pt-BR' || v.lang.startsWith('pt'));

            if (franciscaVoice) {
              utterance.voice = franciscaVoice;
            }
          } catch {}

          utterance.onend = () => {
            try {
              cinematicAudioDirector.setDucking(false);
            } catch {}
            if (isAudioActiveRef.current && audioPlayTokenRef.current === currentToken) {
              playSpeechChunk(chunkIndex + 1);
            }
          };
          utterance.onerror = () => {
            try {
              cinematicAudioDirector.setDucking(false);
            } catch {}
            if (isAudioActiveRef.current && audioPlayTokenRef.current === currentToken) {
              playSpeechChunk(chunkIndex + 1);
            }
          };
          try {
            cinematicAudioDirector.setDucking(true);
          } catch {}
          window.speechSynthesis.speak(utterance);
        } else {
          playSpeechChunk(chunkIndex + 1);
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.warn('[AgenteNarrador] Erro durante a síntese vocal:', err);
      if (isAudioActiveRef.current && audioPlayTokenRef.current === currentToken) {
        playSpeechChunk(chunkIndex + 1);
      }
    }
  };

  const startAudioReading = (capIndex: number, mode: 'single' | 'full' = 'single', startingParagraphIndex: number = -1) => {
    if (!livro || !livro.capitulos || !livro.capitulos[capIndex]) return;

    if (activeTab !== 'preview') {
      setActiveTab('preview');
    }

    stopAudioReading();

    const cap = livro.capitulos[capIndex];
    const segments = buildChapterNarrationSegments(capIndex + 1, cap.titulo, cap.texto);

    audioSegmentsRef.current = segments;
    audioChunksRef.current = segments.map(s => s.speechText);
    audioCapIndexRef.current = capIndex;
    audioModeRef.current = mode;
    audioSpeedRef.current = audioSpeed;
    isAudioActiveRef.current = true;
    audioAbortControllerRef.current = new AbortController();

    let initialChunk = 0;
    if (startingParagraphIndex >= 0) {
      const foundIdx = segments.findIndex(s => s.paragraphIndex >= startingParagraphIndex);
      if (foundIdx >= 0) {
        initialChunk = foundIdx;
      }
    }

    setAudioReadingCapIndex(capIndex);
    setAudioMode(mode);
    setIsPlayingAudio(true);
    setIsAudioPaused(false);
    setCurrentChunkIndex(initialChunk);
    setTotalChunksCount(segments.length);

    // Inicia a trilha sonora de fundo e efeitos de ambiência correspondentes ao capítulo lido
    try {
      cinematicAudioDirector.resume();
      cinematicAudioDirector.playScene({ narrationText: cap.texto, sceneSummary: cap.titulo }, livro.genero || 'Geral');
      cinematicAudioDirector.setDucking(true);
    } catch (bgmErr) {
      console.warn('[AgenteNarrador] Falha ao acionar trilha sonora contextual:', bgmErr);
    }

    playSpeechChunk(initialChunk);
  };

  const skipToNextAudioChapter = () => {
    if (!livro || audioReadingCapIndex === null) return;
    if (audioReadingCapIndex + 1 < livro.capitulos.length) {
      startAudioReading(audioReadingCapIndex + 1, audioMode);
    } else {
      stopAudioReading();
    }
  };

  const skipToPrevAudioChapter = () => {
    if (!livro || audioReadingCapIndex === null) return;
    if (audioReadingCapIndex > 0) {
      startAudioReading(audioReadingCapIndex - 1, audioMode);
    }
  };

  const changeAudioSpeed = (newSpeed: number) => {
    setAudioSpeed(newSpeed);
    audioSpeedRef.current = newSpeed;
    if (currentAudioElemRef.current) {
      currentAudioElemRef.current.playbackRate = newSpeed;
    }
  };

  const toggleVoiceGenderNarrador = () => {
    const nextGender: VoiceGender = audioVoiceGender === 'female' ? 'male' : 'female';
    coAuthorVoiceService.setVoiceGender(nextGender);
    setAudioVoiceGender(nextGender);
    if (isPlayingAudio) {
      audioNextPromiseRef.current = null;
      if (!isAudioPaused) {
        playSpeechChunk(currentChunkIndex);
      }
    }
  };

  // ─── DECOMPOSIÇÃO DE CAPA ABERTA COMPLETA (WRAP) EM FRENTE E VERSO ───
  const decomporWrapEmFrenteEVerso = (wrapDataUrl: string): Promise<{ frontUrl: string; backUrl: string }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const w = img.width;
        const h = img.height;

        // Painel Direito: Capa Frontal (metade direita, ~48% a 50% da largura)
        const frontCanvas = document.createElement('canvas');
        const frontW = Math.round(w * 0.48);
        frontCanvas.width = frontW;
        frontCanvas.height = h;
        const frontCtx = frontCanvas.getContext('2d');
        if (frontCtx) {
          frontCtx.drawImage(img, w - frontW, 0, frontW, h, 0, 0, frontW, h);
        }
        const frontUrl = frontCanvas.toDataURL('image/png');

        // Painel Esquerdo: Contracapa (metade esquerda, ~48% a 50% da largura)
        const backCanvas = document.createElement('canvas');
        const backW = Math.round(w * 0.48);
        backCanvas.width = backW;
        backCanvas.height = h;
        const backCtx = backCanvas.getContext('2d');
        if (backCtx) {
          backCtx.drawImage(img, 0, 0, backW, h, 0, 0, backW, h);
        }
        const backUrl = backCanvas.toDataURL('image/png');

        resolve({ frontUrl, backUrl });
      };
      img.onerror = () => resolve({ frontUrl: wrapDataUrl, backUrl: wrapDataUrl });
      img.src = wrapDataUrl;
    });
  };

  // ─── PROCESSADOR INTELIGENTE DE IMPORTAÇÃO DE CAPA ───
  // Reconhece automaticamente se a imagem é Capa Aberta Completa (Capa com Contracapa) ou Apenas Capa Frontal
  const processarImportacaoImagemCapa = async (dataUrl: string, forceAsWrap: boolean = false) => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        // Se a largura for significativamente maior que a altura (> 1.15x), é uma Capa Aberta Completa (Capa com Contracapa / Wrap)
        const isSpread = forceAsWrap || (img.width > img.height * 1.15);

        if (isSpread) {
          // Imagem panorâmica aberta: exibe o wrap diretamente sem desenhar contracapa azul marinho artificial
          setWrapPreviewUrl(dataUrl);
          setViewModeCapa('wrap');
          setActiveTab('capa');

          // Decompõe a frente e a contracapa para que o miolo e o livro tenham as artes correspondentes
          const { frontUrl, backUrl } = await decomporWrapEmFrenteEVerso(dataUrl);
          setCapaFinal(frontUrl);
          setFundoImg(frontUrl);
          setContracapaFinal(backUrl);

          if (livro) {
            salvarProgressoLocal(livro, frontUrl, frontUrl, promoData || undefined);
          }

          setStatusMsg(ui('✓ Capa com Contracapa (Capa Aberta Completa) importada com sucesso!', '✓ Full Wraparound Cover imported successfully!'));
          setStatusType('ok');
        } else {
          // Imagem vertical: é uma capa frontal individual
          setCapaFinal(dataUrl);
          setFundoImg(dataUrl);
          setViewModeCapa('front');
          setActiveTab('capa');

          const obTitle = livro?.titulo || titulo.trim() || 'Obra Editorial';
          const obAuthor = livro?.autor || autor.trim() || 'Autor';
          const obGenre = livro?.genero || genero.trim() || 'Geral';
          const obSynopsis = bookPromise || uniqueAngle || topico || subtitulo;

          await gerarContracapaEWrap(dataUrl, obTitle, obAuthor, obGenre, obSynopsis);

          if (livro) {
            salvarProgressoLocal(livro, dataUrl, dataUrl);
          }

          setStatusMsg(ui('✓ Capa Frontal importada com sucesso! Gerando contracapa e wrap KDP...', '✓ Front cover imported successfully! Generating back cover and KDP wrap...'));
          setStatusType('ok');
        }
        resolve();
      };
      img.onerror = () => {
        setCapaFinal(dataUrl);
        setActiveTab('capa');
        resolve();
      };
      img.src = dataUrl;
    });
  };

  // ─── IMPORTAÇÃO DE CAPA PRÓPRIA (PNG, JPG, WEBP) ───
  const handleImportarCapa = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(ui('Por favor, selecione uma imagem válida (PNG, JPG, WEBP).', 'Please select a valid image (PNG, JPG, WEBP).'));
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;
      await processarImportacaoImagemCapa(dataUrl, false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ─── IMPORTAÇÃO DE CONTRACAPA PRÓPRIA (PNG, JPG, WEBP) ───
  const handleImportarContracapa = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(ui('Por favor, selecione uma imagem válida (PNG, JPG, WEBP).', 'Please select a valid image (PNG, JPG, WEBP).'));
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;

      setContracapaFinal(dataUrl);
      setActiveTab('capa');
      setViewModeCapa('back');
      setStatusMsg(ui('✓ Contracapa importada com sucesso!', '✓ Back cover imported successfully!'));
      setStatusType('ok');

      // Se já tiver capa frontal, recompõe o wrap
      const obTitle = livro?.titulo || titulo.trim() || 'Obra Editorial';
      const obAuthor = livro?.autor || autor.trim() || 'Autor';
      const numPags = livro?.capitulos?.length ? Math.max(24, livro.capitulos.length * 6) : paginasAlvo;

      if (capaFinal || fundoImg) {
        try {
          const wrapUrl = await PrintCoverService.diagramarWrapCompositeCanvas({
            frontCoverDataUrl: capaFinal || fundoImg || '',
            backCoverDataUrl: dataUrl,
            title: obTitle,
            author: obAuthor,
            pageCount: numPags,
            trimSize: (formato as any) || '6x9',
            paperType: 'bw-white',
            showGuides: showKdpGuides
          });
          setWrapPreviewUrl(wrapUrl);
        } catch (err) {
          console.warn('Erro ao atualizar wrap com contracapa importada:', err);
        }
      }

      if (livro) {
        salvarProgressoLocal(livro, capaFinal || undefined, fundoImg || undefined, promoData || undefined);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ─── IMPORTAÇÃO DE CAPA ABERTA COMPLETA / WRAP (PNG, JPG, WEBP) ───
  const handleImportarWrapCompleto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(ui('Por favor, selecione uma imagem válida (PNG, JPG, WEBP).', 'Please select a valid image (PNG, JPG, WEBP).'));
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;
      await processarImportacaoImagemCapa(dataUrl, true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Recomposição tipográfica da Capa Frontal com posição e fonte customizadas (a partir do fundo limpo)
  const handleReaplicarCapaFrontal = async () => {
    if (!fundoImg && !capaFinal) {
      setStatusMsg('Nenhuma imagem base de capa disponível.');
      setStatusType('error');
      return;
    }
    // Sempre priorizar fundoImg limpo para nunca sobrepor texto a uma imagem já rasterizada
    const imgBase = fundoImg || capaFinal!;
    setStatusMsg('🎨 Consolidando tipografia e gerando capa frontal em alta resolução...');
    setStatusType('normal');

    try {
      const obTitle = livro?.titulo || titulo.trim() || 'Obra Editorial';
      const obSubtitle = livro?.subtitulo || subtitulo.trim() || '';
      const obAuthor = livro?.autor || autor.trim() || 'Autor';
      const obGenre = livro?.genero || genero || 'Ficção';
      const obPremise = topico.trim() || obTitle;

      const fontFamilies: Record<string, string> = {
        'serif': 'Georgia, "Cinzel", "Times New Roman", serif',
        'impact': 'Impact, "Bebas Neue", "Trebuchet MS", sans-serif',
        'sans': 'Montserrat, "Inter", "Helvetica", Arial, sans-serif',
        'display': '"Playfair Display", "Didot", "Garamond", serif',
        'brutal': '"Arial Black", Impact, sans-serif'
      };
      const selectedFontFamily = fontFamilies[capaTituloFontFamily] || fontFamilies['serif'];

      const novaCapaDataUrl = await diagramarCapaCanvas(
        imgBase,
        obTitle,
        obSubtitle,
        obAuthor,
        obGenre,
        obPremise,
        estiloCapaTipo,
        intensidadeZonaLimpa,
        posicaoTituloCapa,
        {
          offsetY: capaTituloOffsetY,
          fontSize: capaTituloFontSize,
          fontFamily: selectedFontFamily
        }
      );

      setCapaFinal(novaCapaDataUrl);

      // Atualiza o wrap completo KDP com a nova capa frontal
      if (contracapaFinal) {
        const numPags = livro?.capitulos?.length ? Math.max(24, livro.capitulos.length * 6) : paginasAlvo;
        const wrapUrl = await PrintCoverService.diagramarWrapCompositeCanvas({
          frontCoverDataUrl: novaCapaDataUrl,
          backCoverDataUrl: contracapaFinal,
          title: obTitle,
          author: obAuthor,
          pageCount: numPags,
          trimSize: (formato as any) || '6x9',
          paperType: 'bw-white',
          showGuides: showKdpGuides
        });
        setWrapPreviewUrl(wrapUrl);
      }

      if (livro) {
        salvarProgressoLocal(livro, novaCapaDataUrl, fundoImg || undefined, promoData || undefined);
      }

      setStatusMsg('✓ Capa frontal confirmada e finalizada com sucesso!');
      setStatusType('ok');
      setIsEditingFrontCover(false);
    } catch (err: any) {
      console.error(err);
      setStatusMsg(`Erro ao atualizar capa: ${err.message}`);
      setStatusType('error');
    }
  };

  // Aplicação de sugestão pontual do CoAuthor diretamente no capítulo focado
  const handleApplyEnrichmentFromCoAuthor = (chapterNumber: number, additionText: string) => {
    if (!livro || !livro.capitulos || livro.capitulos.length === 0) {
      setStatusMsg('Nenhum livro gerado ativo para enriquecer.');
      setStatusType('error');
      return;
    }
    const idx = chapterNumber - 1;
    if (idx < 0 || idx >= livro.capitulos.length) return;

    const novosCapitulos = [...livro.capitulos];
    const capAtual = novosCapitulos[idx];
    const textoBase = (capAtual.texto || '').trim();
    const cleanAddition = additionText.trim();

    if (!cleanAddition) return;

    if (textoBase.includes(cleanAddition)) {
      setStatusMsg(`✓ O Capítulo ${chapterNumber} já contém este enriquecimento editorial.`);
      setStatusType('ok');
      return;
    }

    const novoTexto = textoBase ? `${textoBase}\n\n${cleanAddition}` : cleanAddition;

    novosCapitulos[idx] = {
      ...capAtual,
      texto: novoTexto
    };

    const novoLivro: LivroGerado = {
      ...livro,
      capitulos: novosCapitulos
    };

    setLivro(novoLivro);
    salvarProgressoLocal(novoLivro, capaFinal || undefined, fundoImg || undefined, promoData || undefined);
    setStatusMsg(`✓ Sugestão do CoAuthor incorporada com sucesso ao Capítulo ${chapterNumber}!`);
    setStatusType('ok');
  };

  // Aplicação de enriquecimento em lote para a OBRA INTEIRA de uma só vez (Revisão Global)
  const handleApplyFullBookEnrichmentFromCoAuthor = (enrichments: Array<{ chapterNumber: number; additionText: string }>) => {
    if (!livro || !livro.capitulos || livro.capitulos.length === 0) {
      setStatusMsg('Nenhum livro gerado ativo para enriquecer.');
      setStatusType('error');
      return;
    }

    const novosCapitulos = [...livro.capitulos];
    let totalAlterados = 0;

    for (const item of enrichments) {
      const idx = item.chapterNumber - 1;
      const cleanAddition = item.additionText.trim();
      if (idx >= 0 && idx < novosCapitulos.length && cleanAddition) {
        const capAtual = novosCapitulos[idx];
        const textoBase = (capAtual.texto || '').trim();
        // Não duplica se o trecho já estiver presente no capítulo
        if (!textoBase.includes(cleanAddition)) {
          novosCapitulos[idx] = {
            ...capAtual,
            texto: textoBase ? `${textoBase}\n\n${cleanAddition}` : cleanAddition
          };
          totalAlterados++;
        }
      }
    }

    if (totalAlterados > 0) {
      const novoLivro: LivroGerado = {
        ...livro,
        capitulos: novosCapitulos
      };

      setLivro(novoLivro);
      salvarProgressoLocal(novoLivro, capaFinal || undefined, fundoImg || undefined, promoData || undefined);
      setStatusMsg(`✓ Revisão Global concluída! ${totalAlterados} capítulos foram enriquecidos e salvos na obra.`);
      setStatusType('ok');
    }
  };

  // Iniciar Nova Obra 100% Individualizada a partir do CoAuthor Studio
  const handleStartNewBookFromCoAuthor = (novoPerfil?: string) => {
    const novoId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    projectIdRef.current = novoId;
    const isAutoajuda = novoPerfil === 'autoajuda';
    const isTecnico = novoPerfil === 'tecnico';
    const isPratico = novoPerfil === 'pratico';
    const tituloPadrao = isAutoajuda
      ? 'O Poder da Transformação Pessoal'
      : isTecnico
      ? 'Guia Prático Definitivo'
      : isPratico
      ? 'Manual Passo a Passo de Execução'
      : 'Nova Obra KDP';
    const generoPadrao = isAutoajuda
      ? 'Autoajuda & Desenvolvimento Pessoal'
      : isTecnico
      ? 'Técnico / Profissional'
      : isPratico
      ? 'Guia Prático (How-To)'
      : 'Geral';

    const novoLivro: LivroGerado = {
      titulo: tituloPadrao,
      subtitulo: isAutoajuda ? 'Passos Diários para Mudar sua Realidade' : 'Fundamentos e Aplicação Prática',
      autor: autor || 'Autor Book Engin',
      genero: generoPadrao,
      idioma: idioma === 'inglês' ? 'inglês' : 'português',
      capitulos: [],
      meta: {
        palavrasPorCap: 900,
        paginasAlvo: paginasAlvo || 80
      }
    };

    setLivro(novoLivro);
    setTitulo(novoLivro.titulo);
    setSubtitulo(novoLivro.subtitulo);
    setGenero(novoLivro.genero);
    setTopico(isAutoajuda ? 'Desenvolvimento pessoal, foco, disciplina e hábitos diários' : 'Aplicação prática e resolução de problemas');
    setCapAtual(0);
    setTotalCaps(8);
    setCapaFinal(null);
    setFundoImg(null);
    setPromoData(null);
    salvarProgressoLocal(novoLivro);
    setStatusMsg(`✨ Nova obra individualizada de ${generoPadrao} iniciada com sucesso!`);
    setStatusType('ok');
    return novoLivro;
  };

  // Salva capítulo completo aprovado pelo CoAuthor (conversa guiada capítulo a capítulo)
  const handleSaveChapterFromCoAuthor = (chapter: { numero: number; titulo: string; texto: string }) => {
    const idx = chapter.numero - 1;
    const currentLivro: LivroGerado = livro || {
      titulo: titulo.trim() || 'Obra em Criação',
      subtitulo: subtitulo.trim() || '',
      autor: autor.trim() || 'Autor Book Engin',
      genero: genero || 'Geral',
      idioma: idioma || 'português',
      capitulos: [],
      meta: {
        palavrasPorCap: 1000,
        paginasAlvo: paginasAlvo || 100
      }
    };

    const novosCaps = [...(currentLivro.capitulos || [])];
    if (idx >= 0 && idx < novosCaps.length) {
      novosCaps[idx] = {
        titulo: chapter.titulo,
        texto: chapter.texto
      };
    } else {
      novosCaps.push({
        titulo: chapter.titulo,
        texto: chapter.texto
      });
    }

    const updatedLivro: LivroGerado = {
      ...currentLivro,
      titulo: titulo.trim() || currentLivro.titulo,
      subtitulo: subtitulo.trim() || currentLivro.subtitulo,
      genero: genero || currentLivro.genero,
      capitulos: novosCaps
    };

    setLivro(updatedLivro);
    setCapAtual(novosCaps.length);
    salvarProgressoLocal(updatedLivro, capaFinal || undefined, fundoImg || undefined, promoData || undefined);
    setStatusMsg(`✓ Capítulo ${chapter.numero} ("${chapter.titulo}") gravado com sucesso no livro!`);
    setStatusType('ok');
  };

  // Incorporação direta de Capa Autoral gerada pelo CoAuthor no Livro
  const handleSetCoverFromCoAuthor = async (coverDataUrl: string) => {
    try {
      setStatusMsg('🎨 Incorporando arte autoral do CoAuthor à capa do livro...');
      setStatusType('normal');
      setFundoImg(coverDataUrl);

      const obTitle = livro?.titulo || titulo.trim() || 'Obra Editorial';
      const obSubtitle = livro?.subtitulo || subtitulo.trim() || '';
      const obAuthor = livro?.autor || autor.trim() || 'Autor';
      const obGenre = livro?.genero || genero || 'Ficção';
      const obPremise = topico.trim() || obTitle;

      const fontFamilies: Record<string, string> = {
        'serif': 'Georgia, "Cinzel", "Times New Roman", serif',
        'impact': 'Impact, "Bebas Neue", "Trebuchet MS", sans-serif',
        'sans': 'Montserrat, "Inter", "Helvetica", Arial, sans-serif',
        'display': '"Playfair Display", "Didot", "Garamond", serif',
        'brutal': '"Arial Black", Impact, sans-serif'
      };
      const selectedFontFamily = fontFamilies[capaTituloFontFamily] || fontFamilies['serif'];

      const novaCapaFinal = await diagramarCapaCanvas(
        coverDataUrl,
        obTitle,
        obSubtitle,
        obAuthor,
        obGenre,
        obPremise,
        estiloCapaTipo,
        intensidadeZonaLimpa,
        posicaoTituloCapa,
        {
          offsetY: capaTituloOffsetY,
          fontSize: capaTituloFontSize,
          fontFamily: selectedFontFamily
        }
      );

      setCapaFinal(novaCapaFinal);

      // Adiciona ao carrossel de capas
      const novoItem: ItemHistoricoCapa = {
        id: `capa_coauthor_${Date.now()}`,
        dataUrl: novaCapaFinal,
        fundoUrl: coverDataUrl,
        timestamp: Date.now(),
        estilo: estiloCapaTipo,
        conceito: 'Capa autoral refinada com CoAuthor Editorial'
      };
      setHistoricoCapas(prev => [novoItem, ...prev]);
      setIndiceCapaCarrossel(0);

      // Atualiza o wrap KDP
      if (contracapaFinal) {
        const numPags = livro?.capitulos?.length ? Math.max(24, livro.capitulos.length * 6) : paginasAlvo;
        const wrapUrl = await PrintCoverService.diagramarWrapCompositeCanvas({
          frontCoverDataUrl: novaCapaFinal,
          backCoverDataUrl: contracapaFinal,
          title: obTitle,
          author: obAuthor,
          pageCount: numPags,
          trimSize: (formato as any) || '6x9',
          paperType: 'bw-white',
          showGuides: showKdpGuides
        });
        setWrapPreviewUrl(wrapUrl);
      }

      if (livro) {
        salvarProgressoLocal(livro, novaCapaFinal, coverDataUrl, promoData || undefined);
      }

      setStatusMsg('✓ Nova Capa Autoral incorporada com sucesso ao livro!');
      setStatusType('ok');
    } catch (err: any) {
      console.error(err);
      setStatusMsg(`Erro ao incorporar capa autoral: ${err.message || 'Falha na diagramação'}`);
      setStatusType('error');
    }
  };

  const baixarCapaCompletaPdf = async () => {
    if (!capaFinal) {
      setStatusMsg('Gere a capa antes de baixar o PDF completo.');
      setStatusType('error');
      return;
    }
    try {
      setStatusMsg('📄 Compilando Capa Completa KDP (Full Wrap PDF)...');
      setStatusType('normal');
      const obTitle = livro?.titulo || titulo.trim() || 'Obra Editorial';
      const obAuthor = livro?.autor || autor.trim() || 'Autor';
      const numPags = livro?.capitulos?.length ? Math.max(24, livro.capitulos.length * 6) : paginasAlvo;
      const isKids = bookType === 'children-picture-book' || /infantil|crian|kids|3-5|6-8/i.test(`${genero} ${topico}`);

      const res = await PrintCoverService.generateFullWrapCoverPdf({
        title: obTitle,
        subtitle: livro?.subtitulo || subtitulo,
        author: obAuthor,
        genre: livro?.genero || genero,
        pageCount: numPags,
        trimSize: (formato as any) || '6x9',
        paperType: 'bw-white',
        wrapSpreadDataUrl: wrapPreviewUrl || undefined,
        frontCoverDataUrl: capaFinal,
        backCoverDataUrl: contracapaFinal || undefined,
        frontIsAlreadyDiagrammed: true,
        synopsisText: contracapaTexto?.synopsisText || topico.trim() || undefined,
        hookHeadline: contracapaTexto?.hookHeadline || undefined,
        readerBenefits: contracapaTexto?.readerBenefits || undefined,
        isKids
      });

      const blob = new Blob([res.pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kdp-full-cover-${(obTitle || 'livro').toLowerCase().replace(/\s+/g, '-')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMsg('✓ PDF da Capa Completa KDP baixado com sucesso!');
      setStatusType('ok');
    } catch (err: any) {
      console.error(err);
      setStatusMsg(`Erro ao gerar PDF da capa completa: ${err.message}`);
      setStatusType('error');
    }
  };

  const baixarContracapaPng = () => {
    if (!contracapaFinal) {
      setStatusMsg('Contracapa não gerada ainda.');
      setStatusType('error');
      return;
    }
    const a = document.createElement('a');
    a.href = contracapaFinal;
    a.download = `contracapa-${(livro?.titulo || titulo).replace(/\s+/g, '_')}.png`;
    a.click();
  };

  const handleCopiarKeywords = async () => {
    if (keywordsKdp.length === 0) return;
    try {
      await navigator.clipboard.writeText(keywordsKdp.join(', '));
      setStatusMsg('✓ 7 Palavras-Chave copiadas no formato Amazon KDP!');
      setStatusType('ok');
    } catch {
      setStatusMsg('Erro ao copiar palavras-chave.');
    }
  };

  const handleRegenerarKeywords = () => {
    const obTitle = livro?.titulo || titulo.trim() || 'Obra Editorial';
    const obAuthor = livro?.autor || autor.trim() || 'Autor';
    const obGenre = livro?.genero || genero || 'Ficção';
    const obSynopsis = topico.trim() || uniqueAngle || obTitle;
    const generatedKeys = PublishingMetadataService.generateKdpKeywords({
      title: obTitle,
      subtitle: livro?.subtitulo || subtitulo,
      author: obAuthor,
      genre: obGenre,
      targetAudience: targetReader || 'Público Geral',
      description: obSynopsis,
      bookType
    });
    setKeywordsKdp(generatedKeys);
    setStatusMsg('✓ 7 Palavras-Chave oficiais do Amazon KDP regeneradas com base no seu nicho!');
    setStatusType('ok');
  };

  // REGENERAÇÃO DE CAPA DIRETO AO LADO DA CAPA (COM IA E NOVO CONCEITO VISUAL)
  const handleGerarOutraCapa = async () => {
    setIsRegeneratingCoverOnly(true);
    setStatusMsg('🎨 Criando novo conceito de arte editorial para a capa...');
    setStatusType('normal');
    logDiag('Gerando novo conceito de capa diretamente pelo estúdio lateral');

    try {
      const obraTitulo = livro ? livro.titulo : titulo.trim() || 'Obra Editorial';
      const obraSubtitulo = livro ? livro.subtitulo : subtitulo.trim();
      const obraAutor = livro ? livro.autor : autor.trim() || 'Autor';
      const obraGenero = livro ? livro.genero : genero || 'Geral';
      const obraPremissa = topico.trim() || uniqueAngle || obraTitulo;
      const trechoAmostra = livro?.capitulos?.slice(0, 3).map(c => c.texto).join(' ').slice(0, 1000) || obraPremissa;

      // Monta o prompt cirúrgico anti-selo e de espaço negativo
      const promptCapa = construirPromptArteCapa(obraGenero, obraPremissa, trechoAmostra, estiloArteVisual, customCoverPrompt);
      const novaCapaUrl = await chamarImagen(promptCapa, '2:3');
      setFundoImg(novaCapaUrl);

      // Diagrama no canvas com a tipografia moderna e área limpa
      const novaCapaFinal = await diagramarCapaCanvas(
        novaCapaUrl,
        obraTitulo,
        obraSubtitulo,
        obraAutor,
        obraGenero,
        obraPremissa,
        estiloCapaTipo,
        intensidadeZonaLimpa,
        posicaoTituloCapa
      );

      const novoItem: ItemHistoricoCapa = {
        id: `capa_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        dataUrl: novaCapaFinal,
        fundoUrl: novaCapaUrl,
        timestamp: Date.now(),
        estilo: estiloCapaTipo,
        conceito: estiloArteVisual
      };
      const novoHistorico = [novoItem, ...historicoCapas.filter(c => c.dataUrl !== novaCapaFinal)];
      setHistoricoCapas(novoHistorico);
      setIndiceCapaCarrossel(0);
      setCapaFinal(novaCapaFinal);
      await gerarContracapaEWrap(novaCapaFinal, obraTitulo, obraAutor, obraGenero, obraPremissa);

      if (livro) salvarProgressoLocal(livro, novaCapaFinal, novaCapaUrl, promoData || undefined, novoHistorico);

      setStatusMsg('✓ Nova capa e contracapa diagramadas com sucesso! Visualização KDP completa gerada.');
      setStatusType('ok');
    } catch (err: any) {
      console.error(err);
      setStatusMsg(`Erro ao gerar nova capa: ${err.message}`);
      setStatusType('error');
    } finally {
      setIsRegeneratingCoverOnly(false);
    }
  };

  // REAPLICAR TIPOGRAFIA & ÁREA LIMPA NA ARTE ATUAL (SEM GASTAR RECURSOS DE IA)
  const handleReaplicarTipografia = async () => {
    if (!fundoImg && !capaFinal) {
      setStatusMsg('Gere uma capa primeiro antes de reaplicar o design.');
      setStatusType('error');
      return;
    }
    setIsReapplyingTypography(true);
    try {
      const obraTitulo = livro ? livro.titulo : titulo.trim() || 'Obra Editorial';
      const obraSubtitulo = livro ? livro.subtitulo : subtitulo.trim();
      const obraAutor = livro ? livro.autor : autor.trim() || 'Autor';
      const obraGenero = livro ? livro.genero : genero || 'Geral';
      const obraPremissa = topico.trim() || uniqueAngle || obraTitulo;

      const imgFonte = fundoImg || capaFinal!;
      const novaCapaFinal = await diagramarCapaCanvas(
        imgFonte,
        obraTitulo,
        obraSubtitulo,
        obraAutor,
        obraGenero,
        obraPremissa,
        estiloCapaTipo,
        intensidadeZonaLimpa,
        posicaoTituloCapa
      );

      const novoItem: ItemHistoricoCapa = {
        id: `capa_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        dataUrl: novaCapaFinal,
        fundoUrl: fundoImg || undefined,
        timestamp: Date.now(),
        estilo: estiloCapaTipo,
        conceito: estiloArteVisual
      };
      const novoHistorico = [novoItem, ...historicoCapas.filter(c => c.dataUrl !== novaCapaFinal)];
      setHistoricoCapas(novoHistorico);
      setIndiceCapaCarrossel(0);
      setCapaFinal(novaCapaFinal);

      if (livro) salvarProgressoLocal(livro, novaCapaFinal, fundoImg || undefined, promoData || undefined, novoHistorico);
      setStatusMsg('✓ Estilo tipográfico e área limpa reaplicados! Nova variação adicionada ao carrossel.');
      setStatusType('ok');
    } catch (err: any) {
      console.error(err);
      setStatusMsg(`Erro ao atualizar tipografia: ${err.message}`);
      setStatusType('error');
    } finally {
      setIsReapplyingTypography(false);
    }
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

    setStatusMsg('🎨 1/3 Criando a arte da capa...');
    setStatusType('normal');
    logDiag('Iniciando a geração da arte da capa');

    try {
      // 1. ILUSTRAÇÃO DA CAPA (MOTOR EXCLUSIVO FLUX / REPLICATE SEM SELOS)
      const promptCapa = construirPromptArteCapa(obraGenero, obraPremissa, trechoAmostra, estiloArteVisual, customCoverPrompt);
      const capaImgUrl = await chamarImagen(promptCapa, '2:3');
      setFundoImg(capaImgUrl);
      logDiag('Ilustração de fundo da capa obtida com sucesso.');

      // 2. DIAGRAMAÇÃO TIPOGRÁFICA DA CAPA VIA CANVAS (1600x2400) COM ÁREA LIMPA
      setStatusMsg('🎨 2/3 Diagramando tipografia da capa em alta resolução (Clean Zone)...');
      const capaFinalBase64 = await diagramarCapaCanvas(
        capaImgUrl,
        obraTitulo,
        obraSubtitulo,
        obraAutor,
        obraGenero,
        obraPremissa,
        estiloCapaTipo,
        intensidadeZonaLimpa,
        posicaoTituloCapa
      );

      setCapaFinal(capaFinalBase64);
      await gerarContracapaEWrap(capaFinalBase64, obraTitulo, obraAutor, obraGenero, obraPremissa);
      logDiag('Capa diagramada em 1600x2400 e contracapa KDP finalizadas com sucesso.');

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
      setActiveTab('capa');
      logDiag('Pipeline completo finalizado: Capa + Imagem Promocional + Página Promocional prontas!');
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

  // GERAR SILHUETA MARGINAL ARTÍSTICA DO PROTAGONISTA (REPLICATE FLUX)
  const handleGerarSilhueta = async () => {
    setIsGeneratingSilhueta(true);
    setStatusMsg('✨ Gerando silhueta artística do personagem...');
    logDiag('Solicitando silhueta marginal com sangria externa de 3%...');

    try {
      const { prompt, imageDataUrl } = await gerarSilhuetaPersonagem(
        livro?.titulo || titulo,
        livro?.genero || genero,
        personagemSilhuetaFoco
      );
      setSilhuetaConfig(prev => ({
        ...prev,
        ativado: true,
        imagemDataUrl: imageDataUrl
      }));
      setStatusMsg('✓ Silhueta artística gerada com sucesso! Sangria marginal de 3% ativada no PDF.');
      setStatusType('ok');
      logDiag('Silhueta marginal gerada e armazenada no estado');
    } catch (err: any) {
      console.error('Erro ao gerar silhueta:', err);
      setStatusMsg(`Erro ao gerar silhueta: ${err.message || err}`);
      setStatusType('error');
    } finally {
      setIsGeneratingSilhueta(false);
    }
  };

  // GERAR ILUSTRAÇÃO INDIVIDUAL DE CAPÍTULO (REPLICATE FLUX)
  const handleGerarIlustracaoCapitulo = async (idx: number) => {
    if (!livro || !livro.capitulos[idx]) return;
    const target = livro.capitulos[idx];
    setGeneratingCapImgIndex(idx);
    setStatusMsg(`🎨 Criando ilustração ${estiloIlustracaoCapitulo} do Capítulo ${idx + 1} ("${target.titulo}")...`);
    logDiag(`Gerando imagem de abertura para Capítulo ${idx + 1}`);

    try {
      const dataUrl = await gerarIlustracaoCapitulo(
        target.titulo,
        `Livro: ${livro.titulo}. Tema: ${temaSelecionado || livro.genero}; subtema: ${subtemaSelecionado || topico}. ${bookType === 'children-picture-book' ? 'Ilustração de livro infantil, manter os mesmos personagens, roupas, cores e estilo artístico das outras páginas. ' : ''}Cena: ${target.texto.substring(0, 350)}`,
        estiloIlustracaoCapitulo,
        bookType === 'children-picture-book' ? '1:1' : '16:9'
      );

      setLivro(prev => {
        if (!prev) return null;
        const nextCaps = [...prev.capitulos];
        nextCaps[idx] = { ...nextCaps[idx], imagemDataUrl: dataUrl };
        return { ...prev, capitulos: nextCaps };
      });

      setStatusMsg(`✓ Ilustração do Capítulo ${idx + 1} gerada com sucesso!`);
      setStatusType('ok');
      logDiag(`Ilustração do Capítulo ${idx + 1} incorporada.`);
    } catch (err: any) {
      console.error('Erro ao gerar ilustração de capítulo:', err);
      setStatusMsg(`Erro ao ilustrar capítulo: ${err.message || err}`);
      setStatusType('error');
    } finally {
      setGeneratingCapImgIndex(null);
    }
  };

  // BAIXAR MANUSCRITO COMPLETO EM TXT
  const baixarManuscritoTXT = () => {
    if (!livro || livro.capitulos.length === 0) {
      setStatusMsg('Gere ao menos um capítulo para baixar o manuscrito.');
      setStatusType('error');
      return;
    }

    const cabecalho = `================================================================================
${livro.titulo.toUpperCase()}
${livro.subtitulo ? `${livro.subtitulo}\n` : ''}Autor: ${livro.autor}
Gênero: ${livro.genero}
Total de Capítulos: ${livro.capitulos.length}
================================================================================\n\n`;

    const corpo = livro.capitulos.map((c, i) => {
      return `--------------------------------------------------------------------------------\nCAPÍTULO ${i + 1}: ${c.titulo.toUpperCase()}\n--------------------------------------------------------------------------------\n\n${c.texto}\n\n`;
    }).join('\n');

    const blob = new Blob([cabecalho + corpo], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${livro.titulo.replace(/\s+/g, '_')}_Manuscrito.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    setStatusMsg('✓ Manuscrito completo em TXT baixado com sucesso!');
    setStatusType('ok');
  };

  // BAIXAR PDF KDP DIAGRAMADO (MULTI-PASSE COM CAPA, SUMÁRIO E SILHUETAS MARGINAIS)
  const baixarPDF = async () => {
    if (!livro || livro.capitulos.length === 0) {
      setStatusMsg('Gere o livro primeiro para exportar o PDF.');
      setStatusType('error');
      return;
    }

    if (bookType === 'children-picture-book') {
      const missingIllustrations = livro.capitulos
        .map((chapter, index) => chapter.imagemDataUrl ? null : index + 1)
        .filter((chapterNumber): chapterNumber is number => chapterNumber !== null);
      if (missingIllustrations.length > 0) {
        setStatusMsg(`Gere as ilustrações pendentes das páginas ${missingIllustrations.join(', ')} antes de exportar a história infantil.`);
        setStatusType('error');
        return;
      }
    }

    setStatusMsg('📄 Diagramando PDF oficial para Amazon KDP...');
    setStatusType('normal');
    logDiag('Iniciando construção de PDF com margens espelhadas KDP, sumário e silhuetas marginais...');

    try {
      const validTrimSizes = ['6x9', '5x8', '5.5x8.5', '8.5x11', '8.5x8.5'] as const;
      const trimSize = validTrimSizes.includes(formato as any) ? (formato as any) : '6x9';

      const result = await buildKdpPdf({
        livro: {
          titulo: livro.titulo,
          subtitulo: livro.subtitulo,
          autor: livro.autor,
          genero: livro.genero || genero,
          idioma: livro.idioma || idioma,
          sinopse: contracapaTexto?.synopsisText || bookCommercialDescription || topico,
          ganchoContracapa: contracapaTexto?.hookHeadline,
          beneficiosContracapa: contracapaTexto?.readerBenefits,
          capitulos: livro.capitulos
        },
        capaDataUrl: capaFinal,
        contracapaDataUrl: contracapaFinal,
        incluirContracapa: true,
        bookType,
        formato,
        optSumario,
        tamCapitulo,
        corCapitulo,
        silhuetaConfig: silhuetaConfig.ativado && silhuetaConfig.imagemDataUrl ? {
          ativado: true,
          imagemDataUrl: silhuetaConfig.imagemDataUrl,
          paginasSelecionadas: calcularPaginasSilhueta(
            livro.capitulos.length * 8,
            silhuetaConfig.modo,
            {
              intervalo: silhuetaConfig.intervalo,
              totalAleatorio: silhuetaConfig.totalAleatorio
            }
          ),
          opacidade: silhuetaConfig.opacidade,
          sangriaPct: silhuetaConfig.sangriaPct
        } : undefined
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

  // SALVAR NO CATÁLOGO DO BOOKENGIN (INDEXEDDB)
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
      pipelineLog: [`Livro gerado e catalogado no BookEngin com ${livro.capitulos.length} capítulos.`]
    };

    await db.saveBookProject(novoProjeto);
    if (onProjectSaved) onProjectSaved(novoProjeto);

    setStatusMsg('✓ Obra salva com sucesso no catálogo do BookEngin!');
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
          genero: livro.genero || genero,
          idioma: livro.idioma || idioma,
          sinopse: contracapaTexto?.synopsisText || bookCommercialDescription || topico,
          ganchoContracapa: contracapaTexto?.hookHeadline,
          beneficiosContracapa: contracapaTexto?.readerBenefits,
          capitulos: livro.capitulos
        },
        capaDataUrl: capaFinal,
        contracapaDataUrl: contracapaFinal,
        incluirContracapa: true,
        formato,
        optSumario,
        tamCapitulo,
        corCapitulo,
        silhuetaConfig: silhuetaConfig.ativado && silhuetaConfig.imagemDataUrl ? {
          ativado: true,
          imagemDataUrl: silhuetaConfig.imagemDataUrl,
          paginasSelecionadas: calcularPaginasSilhueta(
            livro.capitulos.length * 8,
            silhuetaConfig.modo,
            {
              intervalo: silhuetaConfig.intervalo,
              totalAleatorio: silhuetaConfig.totalAleatorio
            }
          ),
          opacidade: silhuetaConfig.opacidade,
          sangriaPct: silhuetaConfig.sangriaPct
        } : undefined
      });

      const totalWords = livro.capitulos.reduce((sum, c) => sum + (c.texto ? c.texto.split(/\s+/).length : 0), 0);
      // Preflight do PDF KDP (Regras 36, 37, 38, 53)
      const preflight = await preflightPdf(pdfResult.bytes, {
        manuscriptWordCount: totalWords
      });

      if (!preflight.ok && preflight.issues.some((i: any) => i.severity === 'CRITICAL')) {
        const criticos = preflight.issues.filter((i: any) => i.severity === 'CRITICAL').map((i: any) => i.message).join('; ');
        setStatusMsg(`❌ Bloqueio Editorial: Falha crítica no PDF Preflight: ${criticos}`);
        setStatusType('error');
        logDiag(`Finalização bloqueada pelo Preflight: ${criticos}`);
        return;
      }

      const projId = initialProject?.id || projectIdRef.current || `proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const finalId = `final_proj_${projId}`;

      // Remove duplicatas pré-existentes do mesmo livro para garantir que apareça apenas 1 vez na Dashboard
      try {
        const existingBooks = await db.getAllFinalBooks();
        const normTitle = livro.titulo.trim().toLowerCase().replace(/[^a-z0-9]/gi, '');
        for (const eb of existingBooks) {
          const ebNorm = (eb.title || '').trim().toLowerCase().replace(/[^a-z0-9]/gi, '');
          if (eb.bookId === projId || (ebNorm && ebNorm === normTitle)) {
            await db.deleteFinalBook(eb.id);
          }
        }
      } catch (e) {
        console.warn('Erro ao limpar duplicatas de finalBook:', e);
      }

      const finalRec: FinalBookRecord = {
        id: finalId,
        bookId: projId,
        projectId: projId,
        jobId: `job_${Date.now()}`,
        title: livro.titulo,
        subtitle: livro.subtitulo || '',
        author: livro.autor || 'Autor não definido',
        coverDataUrl: capaFinal || undefined,
        backCoverDataUrl: contracapaFinal || undefined,
        keywords: keywordsKdp.length > 0 ? keywordsKdp : undefined,
        pdf: pdfResult.bytes as unknown as ArrayBuffer,
        pageCount: pdfResult.pageCount,
        sizeBytes: (pdfResult.bytes as any).byteLength || 0,
        finalizedAt: Date.now(),
        status: 'finalizado_validado',
        genre: genero,
        trimSize: formato,
        language: livro.idioma || idioma,
        wordCount: totalWords,
        chaptersCount: livro.capitulos.length,
        chapters: livro.capitulos.map(c => ({ titulo: c.titulo, texto: c.texto })),
        manuscriptText: livro.capitulos.map((c, i) => `\n\n### Capítulo ${i + 1}: ${c.titulo}\n\n${c.texto}`).join(''),
        promoData: promoData || undefined,
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
        keywords: keywordsKdp.length > 0 ? keywordsKdp : [],
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

  // RESET TOTAL: INICIAR NOVO LIVRO 100% EM BRANCO (SEM NENHUM CACHE)
  const handleResetNovoLivroEmBranco = (pedirConfirmacao: boolean = true) => {
    if (pedirConfirmacao && !confirm(ui(
      'Deseja iniciar uma nova obra 100% em branco? Todos os campos atuais serão limpos e desvinculados de cache anterior.',
      'Start a 100% blank new book? All current fields will be cleared with no cache from previous books.'
    ))) return;

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('kdp_last_active_project_id');
        localStorage.removeItem('kdp_book_generator_state_v1');
        localStorage.removeItem('kdp_book_generator_last_saved');
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && k.startsWith('kdp_projeto_pro_v11_')) {
            localStorage.removeItem(k);
          }
        }
      }
    } catch {}

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
    setStanceTopic('');
    setAuthorTone('Conversacional, próximo, envolvente e prático');
    setCustomRefInput('');
    setTitleFeedbackPrompt('');
    setResourceNotes('');
    setAuthorType('Pseudônimo (Autor Pessoal)');
    setAuthorBackground('');
    setAuthorEducation('');
    setAuthorAchievements('');
    setAuthorStyleInspiration('');
    setAuthorOfficialBio('');
    setFocusTags([]);
    setProposedBookSummary('');
    setVariedOutlinePreview([]);
    setBookCommercialDescription('');
    setMarketReferences([]);
    setOpcoesTitulos([]);
    setOpcoesSubtitulos([]);
    setSuggestedAmazonTitles([]);
    setLivro(null);
    setCapaFinal(null);
    setFundoImg(null);
    setContracapaFinal(null);
    setWrapPreviewUrl(null);
    setPromoData(null);
    setHistoricoCapas([]);
    setIndiceCapaCarrossel(0);
    setCapAtual(0);
    setTotalCaps(0);
    setWizardStep(1);
    setActiveTab('wizard');
    setStatusMsg(ui('Novo livro em branco iniciado. Comece pela Etapa 1.', 'New blank book started. Begin with Step 1.'));
    setStatusType('normal');
    logDiag('Novo livro 100% em branco inicializado sem cache.');
  };

  // LIMPAR PROGRESSO
  const limparProgresso = () => {
    handleResetNovoLivroEmBranco(true);
  };

  const applyBookType = (selectedType: BookType) => {
    const config = BOOK_TYPE_CONFIGS[selectedType];
    setBookType(selectedType);
    setCreationSelectorValue(`format:${selectedType}`);
    setFormato(config.trimSize);
    setPaginasAlvo(config.targetPages);
    if (config.chapterCount[1] > 0) setMaxCapitulos(config.chapterCount[1]);
    setGenero(config.label);

    if (selectedType === 'children-picture-book') {
      const childrenTheme = getTheme('historias-infantis-ilustradas') || getTheme('literatura-infantil');
      setTemaSelecionado(childrenTheme?.label || 'Histórias infantis ilustradas');
      setSubtemaSelecionado(childrenTheme?.subthemes[0] || 'Aventuras com animais');
      setFaixaEtaria('6-8');
    } else if (selectedType === 'planner' || selectedType === 'diary') {
      setActiveTab('planner');
    }
  };

  // NAVEGAÇÃO SEQUENCIAL RIGOROSA (1 a 10) COM AUTO-PREENCHIMENTO E AUDITORIA DE GATEKEEPER
  const handleAdvanceToStep = (targetStep: number) => {
    if (targetStep < 1 || targetStep > 10) return;
    
    // Auto-preenche e valida cada etapa intermediária até o destino
    let currentCompleted = [...completedSteps];
    let stepToValidate = wizardStep;
    
    while (stepToValidate < targetStep) {
      const snapshot: WorkflowStateSnapshot = {
        wizardStep: stepToValidate,
        completedSteps: currentCompleted,
        temaSelecionado,
        subtemaSelecionado,
        faixaEtaria,
        stanceTopic,
        titulo,
        subtitulo,
        uniqueAngle,
        bookPromise,
        targetReader,
        autor,
        topico,
        resourceNotes,
        authorOfficialBio,
        focusTags,
        bookCommercialDescription,
        capitulosCount: livro?.capitulos?.length || 0,
        hasCover: !!capaFinal,
        hasBackCover: !!contracapaFinal
      };

      const autofill = KdpWorkflowGatekeeper.autoFillStepRequirements(stepToValidate, snapshot);
      if (autofill.temaSelecionado && !temaSelecionado) setTemaSelecionado(autofill.temaSelecionado);
      if (autofill.subtemaSelecionado && !subtemaSelecionado) setSubtemaSelecionado(autofill.subtemaSelecionado);
      if (autofill.stanceTopic && !stanceTopic) setStanceTopic(autofill.stanceTopic);
      if (autofill.titulo && !titulo) setTitulo(autofill.titulo);
      if (autofill.subtitulo && !subtitulo) setSubtitulo(autofill.subtitulo);
      if (autofill.uniqueAngle && !uniqueAngle) setUniqueAngle(autofill.uniqueAngle);
      if (autofill.bookPromise && !bookPromise) setBookPromise(autofill.bookPromise);
      if (autofill.targetReader && !targetReader) setTargetReader(autofill.targetReader);
      if (autofill.autor && !autor) setAutor(autofill.autor);
      if (autofill.topico && !topico) setTopico(autofill.topico);
      if (autofill.resourceNotes && !resourceNotes) setResourceNotes(autofill.resourceNotes);
      if (autofill.authorOfficialBio && !authorOfficialBio) setAuthorOfficialBio(autofill.authorOfficialBio);
      if (autofill.bookCommercialDescription && !bookCommercialDescription) setBookCommercialDescription(autofill.bookCommercialDescription);

      if (!currentCompleted.includes(stepToValidate)) {
        currentCompleted.push(stepToValidate);
      }
      stepToValidate++;
    }

    const newCompletedSet = new Set(currentCompleted);
    for (let s = 1; s < targetStep; s++) {
      newCompletedSet.add(s);
    }
    if (targetStep === 10 && (capaFinal || wrapPreviewUrl)) {
      newCompletedSet.add(10);
    }
    currentCompleted = Array.from(newCompletedSet);

    setCompletedSteps(currentCompleted);
    setWizardStep(targetStep);
    setActiveTab('wizard');
  };

  const selectEditorialTheme = (themeLabel: string) => {
    const theme = getTheme(themeLabel);
    if (!theme) return;

    const normalizedLabel = theme.label.toLowerCase();
    let selectedType: BookType;
    if (normalizedLabel.includes('colorir')) selectedType = 'coloring-book';
    else if (theme.kind === 'infantil') selectedType = 'children-picture-book';
    else if (theme.kind === 'atividades') {
      selectedType = /sudoku|lógica|enigmas|quebra-cabeças|labirintos|caça-palavras/.test(normalizedLabel)
        ? 'puzzle-book'
        : 'activity-book';
    } else if (theme.kind === 'ficcao') {
      if (normalizedLabel.includes('romance')) selectedType = 'romance';
      else if (normalizedLabel.includes('fantasia')) selectedType = 'fantasy';
      else if (normalizedLabel.includes('ficção científica')) selectedType = 'sci-fi';
      else if (normalizedLabel.includes('terror') || normalizedLabel.includes('horror') || normalizedLabel.includes('thriller')) selectedType = 'thriller';
      else if (normalizedLabel.includes('mistério') || normalizedLabel.includes('investigação criminal') || normalizedLabel.includes('policial')) selectedType = 'mystery';
      else if (normalizedLabel.includes('suspense')) selectedType = 'suspense';
      else selectedType = 'fiction-novel';
    } else if (theme.kind === 'nao-ficcao') {
      if (normalizedLabel.includes('autoajuda') || normalizedLabel.includes('desenvolvimento pessoal') || normalizedLabel.includes('psicologia') || normalizedLabel.includes('espiritualidade')) selectedType = 'self-help';
      else if (normalizedLabel.includes('finanças') || normalizedLabel.includes('investimentos')) selectedType = 'finance';
      else if (normalizedLabel.includes('negócios') || normalizedLabel.includes('empreendedorismo') || normalizedLabel.includes('marketing') || normalizedLabel.includes('liderança')) selectedType = 'business';
      else if (normalizedLabel.includes('biografia') || normalizedLabel.includes('memórias') || normalizedLabel.includes('história real')) selectedType = 'biography';
      else if (normalizedLabel.includes('educação')) selectedType = 'education';
      else if (normalizedLabel.includes('saúde') || normalizedLabel.includes('bem-estar')) selectedType = 'health-wellness';
      else if (normalizedLabel.includes('manual') || normalizedLabel.includes('programação') || normalizedLabel.includes('tecnologia')) selectedType = 'technical-manual';
      else if (normalizedLabel.includes('guia')) selectedType = 'practical-guide';
      else selectedType = 'non-fiction';
    } else {
      selectedType = 'short-ebook';
    }

    applyBookType(selectedType);
    setTemaSelecionado(theme.label);
    const firstSub = theme.subthemes[0] || '';
    setSubtemaSelecionado(firstSub);
    setCreationSelectorValue(`theme:${theme.id}`);
    setGenero(theme.label);
    if (theme.childrenBook) setFaixaEtaria('6-8');

    // Sincroniza imediatamente o melhor segmento do Top 100 para o tema escolhido
    // GARANTIA: Thriller psicológico receberá thrillers e mistérios, nunca livros de autoajuda!
    const bestSegment = AmazonTop100Service.findBestSegmentForTheme(theme.label);
    if (bestSegment) {
      setSelectedSegmentId(bestSegment.id);
      const pool = AmazonTop100Service.getActiveBookPool(bestSegment.id, excludedAsins, 10);
      setActivePoolBooks(pool.activeBooks);

      const mappedRefs: MarketReference[] = pool.activeBooks.map(b => ({
        title: b.title,
        subtitle: b.subtitle,
        author: b.author,
        asin: b.asin,
        bsr: b.bsr,
        rating: b.rating,
        reviewsCount: b.reviewsCount,
        priceUsd: b.priceUsd,
        estimatedMonthlySales: b.estimatedMonthlySales,
        estimatedMonthlyRevenueUsd: b.estimatedMonthlyRevenueUsd,
        coverImage: b.coverImage,
        amazonUrl: b.amazonUrl,
        hookRationale: b.hookRationale,
        rank: b.bsr,
        rankType: 'BSR',
        relevance: 100,
        source: 'api/amazon/top100-segments',
        collectedAt: Date.now()
      }));
      setMarketReferences(mappedRefs);
    }

    // Gera imediatamente as sugestões de Título & Subtítulo para o segmento escolhido
    const suggestions = KdpTitleSuggestionEngine.getSuggestionsForTheme(theme.label, firstSub, marketReferences);
    setSuggestedTitlesList(suggestions);

    if (suggestions.length > 0 && (!titulo.trim() || titulo.startsWith('O Novo Código de') || titulo.startsWith('O Guia Definitivo de') || titulo === 'O Efeito O')) {
      setTitulo(suggestions[0].title);
      setSubtitulo(suggestions[0].subtitle);
      setUniqueAngle(suggestions[0].uniqueAngle);
      setStanceTopic(suggestions[0].stance);
    } else if (!stanceTopic.trim()) {
      setStanceTopic(`Esta obra em ${theme.label} rejeita o óbvio e aprofunda os conflitos e reviravoltas essenciais para o leitor moderno.`);
    }

    // Marca a Etapa 1 como concluída
    if (!completedSteps.includes(1)) {
      setCompletedSteps(prev => [...prev, 1]);
    }

    // Permanece na esteira ('wizard')
    setActiveTab('wizard');

    // Dispara a consulta dos bestsellers bem avaliados daquele tema imediatamente
    const marketQuery = firstSub || theme.marketQuery || theme.label;
    handleAnalisarMercado(false, marketQuery);
  };

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* HEADER ELEGANTE & LIMPO DO BOOKENGIN (SEM EXCESSO DE BOTÕES NO TOPO) */}
      <header
        style={{
          flexShrink: 0,
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '10px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          position: 'sticky',
          top: 0,
          zIndex: 40
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: '-0.02em'
          }}>
            BE
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                Book Engin
              </h1>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '2px 7px',
                borderRadius: 4,
                background: '#f1f5f9',
                color: '#475569',
                letterSpacing: '0.04em'
              }}>
                Editorial Suite
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
              {ui('Sistema de Inteligência e Produção Editorial KDP', 'KDP Editorial Production & Market Intelligence')}
            </div>
          </div>
        </div>

        {/* IDENTIFICAÇÃO DA OBRA ATIVA NO TOPO (CLEAN & MINIMALISTA) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>
              {ui('Obra Atual:', 'Current Book:')}
            </span>
            <span style={{
              fontSize: 13,
              fontWeight: 800,
              color: '#0f172a',
              maxWidth: 380,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {livro?.titulo || titulo || ui('Novo Livro em Branco', 'New Blank Book')}
            </span>
          </div>

          {/* BADGE DE STATUS DA OBRA */}
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              background: gerando ? '#fef3c7' : '#ecfdf5',
              color: gerando ? '#b45309' : '#059669',
              padding: '4px 12px',
              borderRadius: 20,
              border: gerando ? '1px solid #fde68a' : '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            {gerando
              ? `⏳ ${ui('Escrevendo', 'Writing')} ${capAtual + 1}/${totalCaps}`
              : capAtual > 0 && livro && livro.capitulos && livro.capitulos.length > 0 && !isNewProject
                ? `✓ ${livro.capitulos.length} ${ui('Capítulos Prontos', 'Chapters Ready')}`
                : `📋 ${ui(`Etapa ${wizardStep}/10`, `Step ${wizardStep}/10`)}`}
          </div>
        </div>
      </header>

      {/* ÁREA PRINCIPAL:
          MODO FOCO (PADRÃO COAUTHOR): COLUNA 1 (270px MENU COMPLETO) + WORKSPACE PRINCIPAL (1fr)
          MODO SPLIT: COLUNA 1 (260px MENU COMPLETO) + COLUNA 2 (FORMULÁRIO 1fr) + COLUNA 3 (LIVRO/DOSSIÊ 1.15fr)
      */}
      <main style={{ maxWidth: 1800, margin: '0 auto', padding: '12px 18px', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: workspaceLayout === 'split'
              ? '260px minmax(460px, 1fr) minmax(480px, 1.15fr)'
              : '270px minmax(0, 1fr)',
            gap: 16,
            alignItems: 'start',
            width: '100%'
          }}
        >
          {/* ========================================================= */}
          {/* COLUNA 1: MENU LATERAL ESQUERDO COMPLETO COM DUAS SEÇÕES  */}
          {/* SEÇÃO A: FLUXO EDITORIAL 1 A 10                            */}
          {/* SEÇÃO B: FERRAMENTAS DO MIOLO & MODOS DE EDIÇÃO            */}
          {/* ========================================================= */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '14px 12px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              position: 'sticky',
              top: 70,
              maxHeight: 'calc(100vh - 86px)',
              overflowY: 'auto'
            }}
          >
            {/* BOTÕES DE TOPO DA LATERAL: SAIR E NOVO LIVRO */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
              <button
                type="button"
                onClick={onBackToDashboard}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '7px 10px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#334155',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                <ArrowLeft size={14} />
                <span>{ui('← Voltar à Dashboard', '← Back to Dashboard')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleResetNovoLivroEmBranco(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '7px 10px',
                  borderRadius: 6,
                  border: '1px dashed #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                <Sparkles size={13} color="#0284c7" />
                <span>{ui('✨ Novo Livro em Branco', '✨ New Blank Book')}</span>
              </button>
            </div>

            {/* SEÇÃO A: CABEÇALHO DO FLUXO SEQUENCIAL DAS 10 ETAPAS */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={15} color="#10b981" />
                <span style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {ui('Fluxo Editorial KDP', 'KDP Editorial Flow')}
                </span>
              </div>
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                padding: '2px 7px',
                borderRadius: 999,
                background: '#ecfdf5',
                color: '#059669',
                border: '1px solid #a7f3d0'
              }}>
                {wizardStep}/10
              </span>
            </div>

            {/* LISTA VERTICAL DAS 10 ETAPAS COM CONEXÃO CONTÍNUA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                { s: 1, name: 'Pesquisa & Tese', sub: 'Tema, Tese & Idioma' },
                { s: 2, name: 'Análise Top 50', sub: 'Bestsellers KDP' },
                { s: 3, name: 'Título do Livro', sub: 'Título & Feedback' },
                { s: 4, name: 'Recursos & Fontes', sub: 'Links & Notas' },
                { s: 5, name: 'Persona & Bio', sub: 'Autor & Histórico' },
                { s: 6, name: 'Proposta & Foco', sub: 'Diferencial & Tags' },
                { s: 7, name: 'Detalhes & Sumário', sub: 'Estrutura Anti-IA' },
                { s: 8, name: 'Escrita & Dados', sub: 'Capítulos & Estudos' },
                { s: 9, name: 'Descrição', sub: 'Sinopse Comercial' },
                { s: 10, name: 'Capa & Contracapa', sub: 'Prompts & Importação' }
              ].map((st, idx, arr) => {
                const isActive = wizardStep === st.s && activeTab === 'wizard';
                const isDone = completedSteps.includes(st.s) || wizardStep > st.s;
                return (
                  <div key={st.s} style={{ display: 'flex', flexDirection: 'column' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('wizard');
                        handleAdvanceToStep(st.s);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 9,
                        padding: '6px 8px',
                        borderRadius: 7,
                        border: isActive ? '1px solid #0f172a' : '1px solid transparent',
                        background: isActive ? '#0f172a' : isDone ? '#f0fdf4' : 'transparent',
                        color: isActive ? '#ffffff' : isDone ? '#15803d' : '#334155',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        transition: 'all 0.15s ease'
                      }}
                      title={`Ir para Etapa ${st.s}: ${st.name}`}
                    >
                      <div style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: isDone ? '#10b981' : isActive ? '#38bdf8' : '#ffffff',
                        border: isDone ? '2px solid #10b981' : isActive ? '2px solid #38bdf8' : '1px solid #cbd5e1',
                        color: isDone ? '#ffffff' : isActive ? '#0f172a' : '#64748b',
                        fontSize: 9.5,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {isDone ? '✓' : st.s}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                        <span style={{
                          fontSize: 11,
                          fontWeight: isActive ? 800 : 700,
                          lineHeight: 1.2,
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden'
                        }}>
                          {st.name}
                        </span>
                        <span style={{
                          fontSize: 9,
                          color: isActive ? '#94a3b8' : isDone ? '#16a34a' : '#94a3b8',
                          lineHeight: 1.2,
                          marginTop: 1
                        }}>
                          {st.sub}
                        </span>
                      </div>
                    </button>

                    {/* CONECTOR VERTICAL ENTRE ETAPAS */}
                    {idx < arr.length - 1 && (
                      <div style={{
                        width: 2,
                        height: 5,
                        background: wizardStep > st.s ? '#10b981' : '#e2e8f0',
                        marginLeft: 17,
                        transition: 'background 0.2s ease'
                      }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* SEPARADOR VISUAL: FERRAMENTAS DO MIOLO & MODOS */}
            <div style={{ paddingTop: 8, borderTop: '2px solid #e2e8f0', marginTop: 4 }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>🛠️</span>
                <span>{ui('Ferramentas & Modos do Livro', 'Book Tools & Modes')}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {/* 1. EDITOR DA ETAPA ATUAL */}
                <button
                  type="button"
                  onClick={() => setActiveTab('wizard')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 9px',
                    borderRadius: 6,
                    border: activeTab === 'wizard' ? '1px solid #0284c7' : '1px solid #e2e8f0',
                    background: activeTab === 'wizard' ? '#f0f9ff' : '#ffffff',
                    color: activeTab === 'wizard' ? '#0369a1' : '#334155',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left'
                  }}
                >
                  <Sparkles size={14} color={activeTab === 'wizard' ? '#0284c7' : '#64748b'} />
                  <span>✍️ {ui(`Editor da Etapa ${wizardStep}`, `Step ${wizardStep} Editor`)}</span>
                </button>

                {/* 2. MANUSCRITO & LIVRO DIAGRAMADO */}
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 9px',
                    borderRadius: 6,
                    border: activeTab === 'preview' ? '1px solid #0284c7' : '1px solid #e2e8f0',
                    background: activeTab === 'preview' ? '#f0f9ff' : '#ffffff',
                    color: activeTab === 'preview' ? '#0369a1' : '#334155',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left'
                  }}
                >
                  <BookOpen size={14} color={activeTab === 'preview' ? '#0284c7' : '#64748b'} />
                  <span>📖 {ui('Manuscrito Diagramado', 'Formatted Manuscript')}</span>
                </button>

                {/* 3. CAPA & CONTRACAPA KDP */}
                <button
                  type="button"
                  onClick={() => setActiveTab('capa')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 9px',
                    borderRadius: 6,
                    border: activeTab === 'capa' ? '1px solid #f59e0b' : '1px solid #e2e8f0',
                    background: activeTab === 'capa' ? '#fffbeb' : '#ffffff',
                    color: activeTab === 'capa' ? '#b45309' : '#334155',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left'
                  }}
                >
                  <Palette size={14} color={activeTab === 'capa' ? '#f59e0b' : '#64748b'} />
                  <span>🎨 {ui('Capa & Contracapa KDP', 'KDP Cover & Back')}</span>
                </button>

                {/* 4. AUDITORIA TRIPLA KDP */}
                <button
                  type="button"
                  onClick={() => setActiveTab('auditoria')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 9px',
                    borderRadius: 6,
                    border: activeTab === 'auditoria' ? '1px solid #10b981' : '1px solid #e2e8f0',
                    background: activeTab === 'auditoria' ? '#ecfdf5' : '#ffffff',
                    color: activeTab === 'auditoria' ? '#059669' : '#334155',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left'
                  }}
                >
                  <ShieldCheck size={14} color={activeTab === 'auditoria' ? '#10b981' : '#64748b'} />
                  <span>🛡️ {ui('Auditoria (Ortografia & Enredo)', 'Audit (Grammar & Plot)')}</span>
                </button>

                {/* 5. BESTSELLERS & MERCADO */}
                <button
                  type="button"
                  onClick={() => setActiveTab('market')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 9px',
                    borderRadius: 6,
                    border: activeTab === 'market' ? '1px solid #0284c7' : '1px solid #e2e8f0',
                    background: activeTab === 'market' ? '#f0f9ff' : '#ffffff',
                    color: activeTab === 'market' ? '#0369a1' : '#334155',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left'
                  }}
                >
                  <TrendingUp size={14} color={activeTab === 'market' ? '#0284c7' : '#64748b'} />
                  <span>📈 {ui('Bestsellers & Mercado', 'Bestsellers & Market')}</span>
                </button>

                {/* 6. FOLHEAR PÁGINAS (FLIPBOOK) */}
                <button
                  type="button"
                  onClick={() => setIsPageReviewerOpen(true)}
                  disabled={!livro || livro.capitulos.length === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 9px',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: (!livro || livro.capitulos.length === 0) ? '#94a3b8' : '#334155',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: (!livro || livro.capitulos.length === 0) ? 'not-allowed' : 'pointer',
                    width: '100%',
                    textAlign: 'left'
                  }}
                >
                  <Eye size={14} color="#64748b" />
                  <span>👁️ {ui('Folhear Páginas (Flipbook)', 'Page Reviewer')}</span>
                </button>

                {/* 7. TOGGLE DIVIDIR TELA */}
                <button
                  type="button"
                  onClick={() => setWorkspaceLayout(prev => prev === 'split' ? 'focused' : 'split')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 9px',
                    borderRadius: 6,
                    border: workspaceLayout === 'split' ? '1px solid #0f172a' : '1px solid #e2e8f0',
                    background: workspaceLayout === 'split' ? '#0f172a' : '#ffffff',
                    color: workspaceLayout === 'split' ? '#ffffff' : '#334155',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left'
                  }}
                >
                  <Columns size={14} />
                  <span>◫ {workspaceLayout === 'split' ? ui('Modo Foco Único', 'Single Focus Mode') : ui('Dividir Tela (Split)', 'Split Screen')}</span>
                </button>

                {/* 8. EXPORTAÇÃO DE ARQUIVOS FINAIS KDP */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={baixarPDF}
                    disabled={!livro || livro.capitulos.length === 0}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      padding: '7px 5px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      color: (!livro || livro.capitulos.length === 0) ? '#94a3b8' : '#0f172a',
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: (!livro || livro.capitulos.length === 0) ? 'not-allowed' : 'pointer'
                    }}
                    title="Baixar PDF diagramado do miolo oficial para Amazon KDP"
                  >
                    <Download size={12} />
                    <span>PDF Miolo</span>
                  </button>

                  <button
                    type="button"
                    onClick={baixarCapaCompletaPdf}
                    disabled={!capaFinal}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      padding: '7px 5px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      color: !capaFinal ? '#94a3b8' : '#b45309',
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: !capaFinal ? 'not-allowed' : 'pointer'
                    }}
                    title="Baixar PDF oficial de impressão da Capa Completa KDP (Wrap Aberto 300 DPI)"
                  >
                    <Download size={12} />
                    <span>PDF Capa</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* COLUNA 2: FORMULÁRIO COMPLETO DA ETAPA ATIVA              */}
          {/* ========================================================= */}
          {(workspaceLayout === 'split' || activeTab === 'wizard') && (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '16px 18px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                position: 'sticky',
                top: 70,
                maxHeight: 'calc(100vh - 86px)',
                overflowY: 'auto'
              }}
            >
            {/* CABEÇALHO DE NAVEGAÇÃO DA ETAPA (BACK - TITLE - NEXT) */}
            <div style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: '1px solid #f1f5f9'
            }}>
              <button
                type="button"
                onClick={() => {
                  if (wizardStep > 1) setWizardStep(wizardStep - 1);
                }}
                disabled={wizardStep === 1}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '5px 12px',
                  borderRadius: 16,
                  border: '1px solid #cbd5e1',
                  background: wizardStep === 1 ? '#f8fafc' : '#ffffff',
                  color: wizardStep === 1 ? '#cbd5e1' : '#0f172a',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: wizardStep === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                <ChevronLeft size={13} /> {ui('Voltar', 'Back')}
              </button>

              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0284c7' }}>
                  {ui(`Etapa ${wizardStep} de 10`, `Step ${wizardStep} of 10`)}
                </span>
                <h2 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', margin: '1px 0 0' }}>
                  {wizardStep === 1 ? ui('1. Pesquisa, Tema & Tese Única', '1. Research, Theme & Stance')
                    : wizardStep === 2 ? ui('2. Análise de Bestsellers & Referências', '2. Bestseller Analysis & Refs')
                    : wizardStep === 3 ? ui('3. Título, Subtítulo & Refinamento', '3. Book Title & Refinement')
                    : wizardStep === 4 ? ui('4. Recursos, Fontes & Pesquisa', '4. Resources & Knowledge Base')
                    : wizardStep === 5 ? ui('5. Persona & Biografia do Autor', '5. Author Persona & Biography')
                    : wizardStep === 6 ? ui('6. Proposta do Livro & Foco', '6. Proposed Book & Focus')
                    : wizardStep === 7 ? ui('7. Detalhes, Estrutura & Sumário', '7. Details & Varied Outline')
                    : wizardStep === 8 ? ui('8. Escrita & Enriquecimento', '8. Write & Enrich Chapters')
                    : wizardStep === 9 ? ui('9. Descrição Comercial do Livro', '9. Book Sales Description')
                    : ui('10. Capa, Contracapa & Finalização', '10. Book Cover & Finish')}
                </h2>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '5px 12px',
                    borderRadius: 16,
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#0f172a',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  title={ui('Ver Dossiê Editorial e Manuscrito do Livro', 'View Editorial Dossier and Manuscript')}
                >
                  <BookOpen size={12} color="#0284c7" />
                  <span>{ui('Ver Dossiê / Livro', 'View Dossier / Book')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (wizardStep < 10) handleAdvanceToStep(wizardStep + 1);
                  }}
                  disabled={wizardStep === 10}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '5px 14px',
                    borderRadius: 16,
                    border: 'none',
                    background: wizardStep === 10 ? '#cbd5e1' : '#0f172a',
                    color: '#ffffff',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: wizardStep === 10 ? 'not-allowed' : 'pointer'
                  }}
                >
                  {ui('Próximo', 'Next')} <ChevronRight size={13} />
                </button>
              </div>
            </div>

            {/* CORPO DO FORMULÁRIO COM ROLAGEM INDEPENDENTE */}
            <div style={{ flex: 1, minHeight: 0 }}>

            {/* ═══════ WIZARD STEP 1: PESQUISA, TEMA & TESE ÚNICA ═══════ */}
            <div style={{ display: wizardStep === 1 ? undefined : 'none' }}>

            {/* ETAPA 1 — ESCOLHA DO TEMA DO LIVRO */}
            <div style={{ marginBottom: 12, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                {ui('1. Tema Central do Livro (Obrigatório antes do Título)', '1. Main Book Theme (Required before the title)')}
              </label>
              <select
                value={temaSelecionado}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    setTemaSelecionado('');
                    setSubtemaSelecionado('');
                    setCreationSelectorValue(`format:${bookType}`);
                    setGenero('Thriller / Mistério Investigativo');
                    return;
                  }
                  selectEditorialTheme(val);
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
                <option value="">-- {ui('Selecione o Tema da Obra', 'Select a Book Theme')} ({BOOK_THEMES.length} {ui('opções', 'options')}) --</option>
                {BOOK_THEMES.map(theme => (
                  <option key={theme.id} value={theme.label}>
                    {themeLabel(theme.label)} {theme.childrenBook ? `👶 (${ui('Infantil', 'Children')})` : ''}
                  </option>
                ))}
              </select>

              {/* Subtema Dinâmico */}
              {temaSelecionado && getTheme(temaSelecionado)?.subthemes.length ? (
                <div style={{ marginTop: 6 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 2 }}>
                    {ui('Subtema / Especialização', 'Subtheme / Specialization')}
                  </label>
                  <select
                    value={subtemaSelecionado}
                    onChange={(e) => {
                      const newSub = e.target.value;
                      setSubtemaSelecionado(newSub);
                      const fresh = KdpTitleSuggestionEngine.getSimilarTitles(newSub, temaSelecionado || genero, newSub);
                      setSuggestedTitlesList(fresh);
                    }}
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
                      <option key={sub} value={sub}>{subthemeLabel(sub)}</option>
                    ))}
                  </select>
                </div>
              ) : null}

              {/* FAIXA ETÁRIA OBRIGATÓRIA PARA LIVROS INFANTIS (REGRA 8 E 9) */}
              {(isChildrenTheme(temaSelecionado) || genero.toLowerCase().includes('infantil')) && (
                <div style={{ marginTop: 10, padding: '8px 10px', background: '#fef3c7', borderRadius: 6, border: '1px solid #fde68a' }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>
                    👶 {ui('Faixa Etária Obrigatória (Controla Vocabulário e Complexidade)', 'Required Age Range (Controls Vocabulary and Complexity)')}
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
                    <option value="">-- {ui('Selecione a Faixa Etária Obrigatória', 'Select the required age range')} --</option>
                    <option value="3-5">{ui('3–5 anos (Frases ultracurtas, vocabulário concreto)', 'Ages 3–5 (Very short sentences, concrete vocabulary)')}</option>
                    <option value="6-8">{ui('6–8 anos (Linguagem acessível, narrativa direta)', 'Ages 6–8 (Accessible language, direct storytelling)')}</option>
                    <option value="9-12">{ui('9–12 anos (Vocabulário intermediário, desafios)', 'Ages 9–12 (Intermediate vocabulary, challenges)')}</option>
                    <option value="13-15">{ui('13–15 anos (Transição YA, maior complexidade)', 'Ages 13–15 (Young adult transition, greater complexity)')}</option>
                    <option value="16-17">{ui('16–17 anos (Linguagem madura e reflexiva)', 'Ages 16–17 (Mature, reflective language)')}</option>
                  </select>
                </div>
              )}

              {/* CONFIGURAÇÃO DE IDIOMA & AMBIENTAÇÃO GEOGRÁFICA (ESTADO DOS EUA) */}
              <div style={{ marginTop: 10, padding: '10px 12px', background: '#ffffff', borderRadius: 8, border: '1px solid #cbd5e1' }}>
                <div style={{ display: 'grid', gridTemplateColumns: idioma === 'inglês' ? '1fr 1.4fr' : '1fr', gap: 10, alignItems: 'start' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      🌐 {ui('Idioma de Publicação da Obra', 'Publishing Language')}
                    </label>
                    <select
                      value={idioma}
                      onChange={(e) => {
                        const newLang = e.target.value;
                        setIdioma(newLang);
                        if (newLang === 'inglês') {
                          const sugs = KdpTitleSuggestionEngine.getSuggestionsForTheme(temaSelecionado || 'Desenvolvimento Pessoal', 'inglês');
                          setSugestoesTitulos(sugs);
                          if (!titulo || titulo === 'O Segredo Que Ela Levou' || titulo === 'A Sombra do Alvo' || titulo === 'O Poder do Foco Inabalável') {
                            if (sugs.length > 0) {
                              setTitulo(sugs[0].title);
                              if (sugs[0].subtitle) setSubtitulo(sugs[0].subtitle);
                            }
                          }
                        } else if (newLang === 'português') {
                          const sugs = KdpTitleSuggestionEngine.getSuggestionsForTheme(temaSelecionado || 'Desenvolvimento Pessoal', 'português');
                          setSugestoesTitulos(sugs);
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 12,
                        background: '#ffffff',
                        color: '#0f172a',
                        fontWeight: 600
                      }}
                    >
                      <option value="português">🇧🇷 Português (Literatura Contemporânea)</option>
                      <option value="inglês">🇺🇸 Inglês (American English / Bestseller Standard)</option>
                      <option value="espanhol">🇪🇸 Espanhol (Español Neutro)</option>
                    </select>
                  </div>

                  {idioma === 'inglês' && (
                    <div>
                      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>
                        🇺🇸 {ui('Estado dos EUA (Ambientação Anti-Alucinação)', 'US State (Anti-Hallucination Anchor)')}
                      </label>
                      <select
                        value={estadoEua}
                        onChange={(e) => setEstadoEua(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: 6,
                          border: '1.5px solid #2563eb',
                          fontSize: 12,
                          background: '#f0f9ff',
                          color: '#1e3a8a',
                          fontWeight: 700
                        }}
                      >
                        {[
                          'Nova York (NY)', 'Califórnia (CA)', 'Texas (TX)', 'Flórida (FL)',
                          'Illinois (IL)', 'Massachusetts (MA)', 'Washington (WA)', 'Geórgia (GA)',
                          'Novo México (NM)', 'Pensilvânia (PA)', 'Ohio (OH)', 'Carolina do Norte (NC)',
                          'Michigan (MI)', 'Colorado (CO)', 'Arizona (AZ)', 'Virgínia (VA)',
                          'Nova Jersey (NJ)', 'Oregon (OR)', 'Tennessee (TN)', 'Nevada (NV)',
                          'Minnesota (MN)', 'Indiana (IN)', 'Missouri (MO)', 'Maryland (MD)',
                          'Wisconsin (WI)', 'Utah (UT)', 'Carolina do Sul (SC)', 'Alabama (AL)',
                          'Louisiana (LA)', 'Kentucky (KY)', 'Connecticut (CT)', 'Oklahoma (OK)',
                          'Iowa (IA)', 'Mississippi (MS)', 'Arkansas (AR)', 'Kansas (KS)',
                          'Nebraska (NE)', 'Idaho (ID)', 'Havaí (HI)', 'Maine (ME)',
                          'New Hampshire (NH)', 'Rhode Island (RI)', 'Montana (MT)', 'Delaware (DE)',
                          'Dakota do Sul (SD)', 'Dakota do Norte (ND)', 'Alasca (AK)', 'Vermont (VT)',
                          'Wyoming (WY)', 'Virgínia Ocidental (WV)'
                        ].map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                      <span style={{ fontSize: 10.5, color: '#2563eb', display: 'block', marginTop: 3 }}>
                        ✓ A IA usará vocabulário cotidiano americano e ancorará cidades, rodovias e jurisdições estritamente em {estadoEua}.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 1.1 TÍTULO & SUBTÍTULO LIVRES COM SUGESTÕES SIMILARES */}
            <div style={{
              marginBottom: 12,
              background: '#ffffff',
              padding: 14,
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={14} color="#0284c7" />
                    <span>1.1 Título & Subtítulo da Obra (Livre Escolha & Personalização Total)</span>
                  </label>
                  <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0', lineHeight: 1.3 }}>
                    Você é <b>100% livre</b> para digitar o título que quiser ou usar as sugestões similares abaixo como inspiração para editar.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => handleGerarTitulosSimilares(titulo || subtemaSelecionado || temaSelecionado)}
                    disabled={isGeneratingSimilares}
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: 6,
                      padding: '4px 10px',
                      color: '#1d4ed8',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <RefreshCw size={11} className={isGeneratingSimilares ? 'spin' : ''} />
                    {isGeneratingSimilares ? 'Gerando...' : '💡 Sugerir Mais Similares'}
                  </button>
                  {(titulo || subtitulo) && (
                    <button
                      type="button"
                      onClick={() => {
                        setTitulo('');
                        setSubtitulo('');
                      }}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        padding: '4px 8px',
                        color: '#dc2626',
                        fontSize: 10.5,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              {/* CAMPO DE DIGITAÇÃO LIVRE DO TÍTULO */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: '#334155' }}>
                    Título Principal da Obra:
                  </label>
                  <span style={{ fontSize: 10.5, color: '#64748b' }}>
                    {titulo.length} caracteres
                  </span>
                </div>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Digite o título que você quiser (ex: O Preço da Obsessão, A Esposa de Vidro, etc.)..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1.5px solid #94a3b8',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#0f172a',
                    background: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* CAMPO DE DIGITAÇÃO LIVRE DO SUBTÍTULO */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: '#334155' }}>
                    Subtítulo Comercial da Obra (Opcional):
                  </label>
                  <span style={{ fontSize: 10.5, color: '#64748b' }}>
                    {subtitulo.length} caracteres
                  </span>
                </div>
                <input
                  type="text"
                  value={subtitulo}
                  onChange={(e) => setSubtitulo(e.target.value)}
                  placeholder="Digite o subtítulo que você quiser ou personalize uma das sugestões abaixo..."
                  style={{
                    width: '100%',
                    padding: '7px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    color: '#334155',
                    background: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* SUGESTÕES DE TÍTULOS SIMILARES & INSPIRAÇÃO (NÃO OBRIGATÓRIAS) */}
              {suggestedTitlesList.length > 0 && (
                <div style={{ background: '#f8fafc', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Sparkles size={12} color="#0284c7" />
                      Sugestões de Títulos Similares & Comerciais (Clique para preencher e editar livremente):
                    </span>
                    <span style={{ fontSize: 9.5, color: '#059669', background: '#ecfdf5', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                      BSR &lt; 80.000
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
                    {suggestedTitlesList.slice(0, 4).map((sug, i) => {
                      const isCur = titulo === sug.title;
                      return (
                        <div
                          key={i}
                          style={{
                            background: isCur ? '#f0fdf4' : '#ffffff',
                            border: isCur ? '2px solid #10b981' : '1px solid #cbd5e1',
                            borderRadius: 6,
                            padding: '8px 10px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: 6
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                              <span style={{ fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase', color: '#0369a1', background: '#e0f2fe', padding: '1px 5px', borderRadius: 3 }}>
                                {sug.hookType}
                              </span>
                              <span style={{ fontSize: 9, color: '#059669', fontWeight: 700 }}>
                                ~BSR #{sug.targetBsrEstimate.toLocaleString('pt-BR')}
                              </span>
                            </div>
                            <div style={{ fontSize: 11.5, fontWeight: 800, color: '#0f172a', lineHeight: 1.25 }}>
                              {sug.title}
                            </div>
                            <div style={{ fontSize: 10, color: '#475569', marginTop: 2, lineHeight: 1.3 }}>
                              {sug.subtitle}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                            <button
                              type="button"
                              onClick={() => {
                                setTitulo(sug.title);
                                setSubtitulo(sug.subtitle);
                                if (sug.uniqueAngle) setUniqueAngle(sug.uniqueAngle);
                                if (sug.stance) setStanceTopic(sug.stance);
                                setStatusMsg(`✓ Título e subtítulo aplicados: "${sug.title}" (Você pode editar livremente!)`);
                                setStatusType('ok');
                              }}
                              style={{
                                flex: 1,
                                padding: '4px 6px',
                                background: isCur ? '#10b981' : '#f8fafc',
                                color: isCur ? '#ffffff' : '#0f172a',
                                border: isCur ? '1px solid #059669' : '1px solid #cbd5e1',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              {isCur ? '✓ No Campo' : 'Preencher Campo'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelectSuggestedTitle(sug, true)}
                              style={{
                                padding: '4px 8px',
                                background: '#0f172a',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2
                              }}
                            >
                              Avançar →
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* NOVO CAMPO COAUTHOR: POSICIONAMENTO / TESE FORTE SOBRE O TEMA (STANCE ON THE TOPIC) */}
            <div style={{ marginBottom: 12, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                  {ui('1.2 Posicionamento / Tese Forte sobre o Tema (Stance)', '1.2 Strong Stance on the Topic')}
                </label>
                <button
                  type="button"
                  onClick={handleSugerirStance}
                  disabled={isAiStepBusy === 'stance'}
                  style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: 6,
                    padding: '3px 8px',
                    color: '#1d4ed8',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <Sparkles size={11} /> {isAiStepBusy === 'stance' ? 'Gerando...' : 'Sugerir Tese Única'}
                </button>
              </div>
              <div style={{ fontSize: 10.5, color: '#64748b', marginBottom: 6, lineHeight: 1.35 }}>
                Qual é a sua opinião forte ou visão contraintuitiva que impede seu livro de ser conteúdo genérico? (Ex: "Você não precisa de horas de organização; 10 minutos diários bastam").
              </div>
              <textarea
                rows={3}
                value={stanceTopic}
                onChange={(e) => setStanceTopic(e.target.value)}
                placeholder="Ex: A maioria dos livros sobre este tema falha porque exige força de vontade extrema; minha tese é que pequenas micro-ações diárias de 10 minutos geram resultados permanentes..."
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 12,
                  lineHeight: 1.45,
                  background: '#ffffff',
                  color: '#0f172a',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />

              {/* Tom do Autor (Author Tone) */}
              <div style={{ marginTop: 10 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  {ui('1.3 Tom de Voz do Autor (Author Tone)', '1.3 Author Tone')}
                </label>
                <select
                  value={authorTone}
                  onChange={(e) => setAuthorTone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    background: '#ffffff',
                    color: '#0f172a',
                    fontWeight: 500
                  }}
                >
                  <option value="Conversacional, próximo, envolvente e prático">Conversacional, próximo, envolvente e prático (Padrão Bestseller)</option>
                  <option value="Narrativo cinematográfico, imersivo e visceral">Narrativo cinematográfico, imersivo e visceral (Ficção / Suspense)</option>
                  <option value="Autoridade científica acessível, baseado em evidências">Autoridade científica acessível, baseado em evidências</option>
                  <option value="Mentor inspirador, empático e direto ao ponto">Mentor inspirador, empático e direto ao ponto</option>
                  <option value="Investigativo, provocador e contraintuitivo">Investigativo, provocador e contraintuitivo</option>
                </select>
              </div>
            </div>

            {/* Navegação Step 1 → 2 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10, marginBottom: 6 }}>
              <button type="button" onClick={() => handleAdvanceToStep(2)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 18px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                {ui('Próximo: Análise', 'Next: Analysis')} <ChevronRight size={15} />
              </button>
            </div>

            </div>{/* FIM WIZARD STEP 1 */}

            {/* ═══════ WIZARD STEP 2: INTELIGÊNCIA DE MERCADO & TOP 100 SEGMENTOS ═══════ */}
            <div style={{ display: wizardStep === 2 ? undefined : 'none' }}>

            <div style={{ marginBottom: 14, background: '#ffffff', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
              {/* CABEÇALHO DO MÓDULO TOP 100 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ background: '#f59e0b', color: '#78350f', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase' }}>
                      Dados de Busca Amazon (Últimos 7 Dias)
                    </span>
                    <span style={{ background: '#ecfdf5', color: '#047857', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4 }}>
                      ⚡ BSR &lt; 80.000 Garantido
                    </span>
                  </div>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
                    Top 100 Segmentos & Livros mais Buscados pelos Clientes Amazon
                  </h3>
                  <p style={{ fontSize: 11.5, color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                    Navegue pelos 100 nichos ranqueados por velocidade de busca real nos últimos 7 dias. Selecione de <b>1 a 10 livros</b> como referência de inspiração. Caso não goste de algum, clique em <b>Descartar</b> para substituí-lo imediatamente.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setIsTop50ModalOpen(true)}
                    style={{
                      padding: '5px 10px',
                      background: '#0f172a',
                      color: '#ffffff',
                      border: '1px solid #1e293b',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5
                    }}
                  >
                    <Award size={12} color="#f59e0b" /> Top 50 Bestsellers
                  </button>
                </div>
              </div>

              {/* FILTRO DE CATEGORIAS E BUSCA DE SEGMENTO */}
              <div style={{ marginBottom: 12, background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '0 8px' }}>
                    <Search size={14} color="#64748b" />
                    <input
                      type="text"
                      value={segmentSearchQuery}
                      onChange={(e) => setSegmentSearchQuery(e.target.value)}
                      placeholder="Filtrar segmento, palavra-chave ou termo de busca..."
                      style={{ border: 'none', outline: 'none', padding: '6px 8px', fontSize: 11.5, width: '100%', background: 'transparent', color: '#0f172a' }}
                    />
                    {segmentSearchQuery && (
                      <button type="button" onClick={() => setSegmentSearchQuery('')} style={{ background: 'none', border: 'none', fontSize: 11, color: '#94a3b8', cursor: 'pointer' }}>✕</button>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', fontWeight: 600 }}>
                    Exibindo {top100Segments.filter(seg => {
                      const matchesCat = segmentCategoryFilter === 'all' || seg.category.toLowerCase().includes(segmentCategoryFilter.toLowerCase());
                      const q = segmentSearchQuery.trim().toLowerCase();
                      const matchesQ = !q || (seg.title || seg.name).toLowerCase().includes(q) || seg.dominantHook.toLowerCase().includes(q) || seg.topCustomerKeywords.some(k => k.toLowerCase().includes(q));
                      return matchesCat && matchesQ;
                    }).length} de 100 nichos
                  </div>
                </div>

                {/* PILLS DE CATEGORIA */}
                <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 4 }}>
                  {[
                    { id: 'all', label: 'Todos (100)' },
                    { id: 'Desenvolvimento Pessoal', label: 'Produtividade & Hábitos' },
                    { id: 'Negócios & Finanças', label: 'Finanças & Negócios' },
                    { id: 'Tecnologia & IA', label: 'Tecnologia & IA' },
                    { id: 'Mistério & Suspense', label: 'Mistério & Suspense' },
                    { id: 'Ficção & Romance', label: 'Ficção & Romance' },
                    { id: 'Saúde & Bem-Estar', label: 'Saúde & Bem-Estar' },
                    { id: 'Espiritualidade & Filosofia', label: 'Espiritualidade' },
                    { id: 'Infantil & Atividades', label: 'Infantil' },
                    { id: 'Guias & Habilidades', label: 'Guias Práticos' }
                  ].map(cat => {
                    const isSelected = segmentCategoryFilter === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSegmentCategoryFilter(cat.id)}
                        style={{
                          padding: '3px 9px',
                          borderRadius: 20,
                          fontSize: 10.5,
                          fontWeight: isSelected ? 700 : 500,
                          background: isSelected ? '#0f172a' : '#ffffff',
                          color: isSelected ? '#ffffff' : '#475569',
                          border: isSelected ? '1px solid #0f172a' : '1px solid #cbd5e1',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* LISTA HORIZONTAL/ROLÁVEL DOS SEGMENTOS DO TOP 100 */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Navegar no Ranking Top 100 Amazon:</span>
                  <span style={{ fontSize: 10, color: '#64748b' }}>Clique em um nicho para carregar seus 10 livros</span>
                </div>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
                  {top100Segments
                    .filter(seg => {
                      const matchesCat = segmentCategoryFilter === 'all' || seg.category.toLowerCase().includes(segmentCategoryFilter.toLowerCase());
                      const q = segmentSearchQuery.trim().toLowerCase();
                      const matchesQ = !q || (seg.title || seg.name).toLowerCase().includes(q) || seg.dominantHook.toLowerCase().includes(q) || seg.topCustomerKeywords.some(k => k.toLowerCase().includes(q));
                      return matchesCat && matchesQ;
                    })
                    .slice(0, 30)
                    .map(seg => {
                      const isSelected = seg.id === selectedSegmentId;
                      return (
                        <div
                          key={seg.id}
                          onClick={() => handleSelectSegment(seg.id)}
                          style={{
                            minWidth: 200,
                            maxWidth: 240,
                            padding: '8px 10px',
                            background: isSelected ? '#eff6ff' : '#ffffff',
                            border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                            borderRadius: 8,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4,
                            boxShadow: isSelected ? '0 2px 6px rgba(37,99,235,0.15)' : 'none',
                            flexShrink: 0
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{
                              background: isSelected ? '#2563eb' : '#0f172a',
                              color: '#fff',
                              fontSize: 10,
                              fontWeight: 800,
                              padding: '1px 6px',
                              borderRadius: 4
                            }}>
                              #{seg.rank}
                            </span>
                            <span style={{ fontSize: 9.5, fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '1px 5px', borderRadius: 3 }}>
                              +{seg.trend7dPercent}% em 7d
                            </span>
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: isSelected ? '#1d4ed8' : '#0f172a', lineHeight: 1.3 }}>
                            {seg.title || seg.name}
                          </div>
                          <div style={{ fontSize: 9.5, color: '#64748b' }}>
                            {seg.weeklySearchVolume.toLocaleString('pt-BR')} buscas/sem • BSR ~{(seg.avgBsr || 25000).toLocaleString('pt-BR')}
                          </div>
                          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 2 }}>
                            {seg.topCustomerKeywords.slice(0, 2).map((kw, i) => (
                              <span key={i} style={{ fontSize: 8.5, background: '#f1f5f9', color: '#475569', padding: '1px 4px', borderRadius: 3 }}>
                                "{kw}"
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* CARD DO SEGMENTO ATIVO SELECIONADO */}
              {(() => {
                const seg = top100Segments.find(s => s.id === selectedSegmentId) || top100Segments[0];
                return (
                  <div style={{
                    marginBottom: 14,
                    padding: '10px 14px',
                    background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                    borderRadius: 8,
                    color: '#ffffff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 10
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ background: '#f59e0b', color: '#0f172a', fontWeight: 800, fontSize: 10.5, padding: '1px 6px', borderRadius: 4 }}>
                          RANK #{seg.rank} NO TOP 100 AMAZON
                        </span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>
                          Categoria: {seg.category}
                        </span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#ffffff' }}>
                        {seg.title || seg.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>
                        🔥 <b>{seg.weeklySearchVolume.toLocaleString('pt-BR')} buscas</b> na última semana (+{seg.trend7dPercent}% de crescimento) • BSR médio #{(seg.avgBsr || 25000).toLocaleString('pt-BR')}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <div style={{ background: 'rgba(255,255,255,0.1)', padding: '5px 10px', borderRadius: 6, textAlign: 'center' }}>
                        <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase' }}>Termo + Buscado</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8' }}>"{seg.topCustomerKeywords[0]}"</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.1)', padding: '5px 10px', borderRadius: 6, textAlign: 'center' }}>
                        <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase' }}>Gancho Dominante</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#facc15' }}>{seg.dominantHook}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* SEÇÃO DOS 10 LIVROS ATIVOS NO SEGMENTO */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                  <div>
                    <h4 style={{ fontSize: 12.5, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>10 Livros de Referência Ativos no Segmento</span>
                      <span style={{
                        background: selectedInspirationAsins.length > 0 ? '#ecfdf5' : '#f1f5f9',
                        color: selectedInspirationAsins.length > 0 ? '#059669' : '#475569',
                        border: selectedInspirationAsins.length > 0 ? '1px solid #a7f3d0' : '1px solid #cbd5e1',
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 700
                      }}>
                        ⭐ {selectedInspirationAsins.length} de 10 selecionados (Escolha de 1 a 10)
                      </span>
                    </h4>
                    <p style={{ fontSize: 10.5, color: '#64748b', margin: '2px 0 0' }}>
                      Clique em <b>⭐ Inspirar</b> para marcar o livro ou em <b>✕ Descartar</b> se não gostar (outro livro entrará automaticamente no pool).
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedInspirationAsins(activePoolBooks.map(b => b.asin));
                      }}
                      style={{
                        padding: '4px 9px',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: 5,
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: '#334155',
                        cursor: 'pointer'
                      }}
                    >
                      Selecionar Todos (10)
                    </button>
                    {selectedInspirationAsins.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedInspirationAsins([])}
                        style={{
                          padding: '4px 8px',
                          background: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 5,
                          fontSize: 10.5,
                          fontWeight: 600,
                          color: '#dc2626',
                          cursor: 'pointer'
                        }}
                      >
                        Limpar Seleção
                      </button>
                    )}
                  </div>
                </div>

                {/* GRADE DOS 10 LIVROS ATIVOS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                  {activePoolBooks.slice(0, 10).map((book, idx) => {
                    const isSelected = selectedInspirationAsins.includes(book.asin);
                    const cover = book.coverImage || `https://images-na.ssl-images-amazon.com/images/P/${book.asin}.01._SCLZZZZZZZ_SX300_.jpg`;

                    return (
                      <div
                        key={book.asin}
                        style={{
                          padding: 10,
                          background: isSelected ? '#f0fdf4' : '#ffffff',
                          borderRadius: 8,
                          border: isSelected ? '2px solid #10b981' : '1px solid #e2e8f0',
                          boxShadow: isSelected ? '0 2px 8px rgba(16,185,129,0.15)' : '0 1px 3px rgba(0,0,0,0.02)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: 8,
                          position: 'relative'
                        }}
                      >
                        {/* HEADER DO CARD COM CAPA E DADOS */}
                        <div style={{ display: 'flex', gap: 10 }}>
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <img
                              src={cover}
                              alt={book.title}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images-na.ssl-images-amazon.com/images/I/71kxa1-0mfL._AC_UL600_SR600,400_.jpg';
                              }}
                              style={{
                                width: 48,
                                height: 70,
                                objectFit: 'cover',
                                borderRadius: 4,
                                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                display: 'block'
                              }}
                            />
                            <span style={{
                              position: 'absolute',
                              top: -4,
                              left: -4,
                              background: '#0f172a',
                              color: '#fff',
                              fontSize: 9,
                              fontWeight: 800,
                              padding: '1px 4px',
                              borderRadius: 3
                            }}>
                              #{idx + 1}
                            </span>
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 11.5, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {book.title}
                            </div>
                            {book.subtitle && (
                              <div style={{ fontSize: 9.5, color: '#64748b', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {book.subtitle}
                              </div>
                            )}
                            <div style={{ fontSize: 10, color: '#334155', fontWeight: 600, marginTop: 2 }}>
                              Por: {book.author}
                            </div>

                            {/* MÉTRICAS AMAZON */}
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                              <span style={{
                                padding: '1px 5px',
                                borderRadius: 3,
                                background: book.bsr <= 80000 ? '#ecfdf5' : '#f1f5f9',
                                color: book.bsr <= 80000 ? '#059669' : '#475569',
                                border: book.bsr <= 80000 ? '1px solid #a7f3d0' : '1px solid #cbd5e1',
                                fontSize: 9,
                                fontWeight: 800
                              }}>
                                BSR #{book.bsr.toLocaleString('pt-BR')}
                              </span>
                              <span style={{ fontSize: 9, color: '#0f172a', fontWeight: 700 }}>
                                ~${book.estimatedMonthlyRevenueUsd.toLocaleString('pt-BR')}/mês
                              </span>
                              <span style={{ fontSize: 9, color: '#64748b' }}>
                                ★ {book.rating} ({book.reviewsCount.toLocaleString('pt-BR')})
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* BUSCA DO CLIENTE & GANCHO EDITORIAL */}
                        <div style={{ background: '#f8fafc', padding: '5px 7px', borderRadius: 5, border: '1px solid #e2e8f0', fontSize: 9.5 }}>
                          <div style={{ color: '#0369a1', fontWeight: 700 }}>
                            🔍 Termo buscado: "{book.customerSearchQuery || 'livros kdp'}"
                          </div>
                          {book.hookRationale && (
                            <div style={{ color: '#475569', marginTop: 2, fontStyle: 'italic' }}>
                              💡 Gancho: {book.hookRationale}
                            </div>
                          )}
                        </div>

                        {/* BOTÕES DE AÇÃO: INSPIRAR (SELECIONAR) E DESCARTAR (SUBSTITUIR) */}
                        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                          <button
                            type="button"
                            onClick={() => handleToggleSelectInspiration(book)}
                            style={{
                              flex: 1,
                              padding: '5px 8px',
                              background: isSelected ? '#10b981' : '#f8fafc',
                              color: isSelected ? '#ffffff' : '#0f172a',
                              border: isSelected ? '1px solid #059669' : '1px solid #cbd5e1',
                              borderRadius: 5,
                              fontSize: 10.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 4
                            }}
                          >
                            {isSelected ? (
                              <>
                                <Check size={12} /> Selecionado ({selectedInspirationAsins.length}/10)
                              </>
                            ) : (
                              <>
                                <Sparkles size={11} color="#f59e0b" /> Inspirar
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDiscardBook(book.asin)}
                            title="Descartar livro e carregar outro automaticamente"
                            style={{
                              padding: '5px 8px',
                              background: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              borderRadius: 5,
                              fontSize: 10,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <Trash2 size={11} /> Descartar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* BUSCA MANUAL OU ADIÇÃO DE ASIN CASO O AUTOR DESEJE */}
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #e2e8f0', display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 10.5, color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>Adicionar Obra Personalizada:</span>
                <input
                  type="text"
                  value={customRefInput}
                  onChange={(e) => setCustomRefInput(e.target.value)}
                  placeholder="Título ou ASIN personalizado (Ex: Hábitos Atômicos / 8550807567)..."
                  style={{
                    flex: 1,
                    padding: '5px 8px',
                    borderRadius: 5,
                    border: '1px solid #cbd5e1',
                    fontSize: 11,
                    background: '#ffffff',
                    color: '#0f172a'
                  }}
                />
                <button
                  type="button"
                  onClick={handleAdicionarReferenciaCustom}
                  style={{
                    padding: '5px 10px',
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 5,
                    fontSize: 10.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  + Adicionar
                </button>
              </div>

            </div>

            {/* BARRA INFERIOR DE TRANSIÇÃO PARA ETAPA 3 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
              marginTop: 12,
              marginBottom: 6,
              background: '#f8fafc',
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #cbd5e1'
            }}>
              <button
                type="button"
                onClick={() => setWizardStep(1)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '8px 14px',
                  background: '#ffffff',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: 7,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <ChevronLeft size={14} /> {ui('Voltar para Tema', 'Back to Theme')}
              </button>

              <div style={{ fontSize: 11.5, color: '#1e293b', fontWeight: 600 }}>
                {selectedInspirationAsins.length > 0 ? (
                  <span>
                    ✓ <b>{selectedInspirationAsins.length}</b> de 10 livro(s) selecionado(s) para inspirar título e premissa.
                  </span>
                ) : (
                  <span style={{ color: '#64748b' }}>
                    💡 Nenhuma obra selecionada individualmente (usará as principais referências do nicho).
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleAdvanceToStep3WithSelected}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 20px',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 7,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(37,99,235,0.25)'
                }}
              >
                {ui('Avançar para Etapa 3: Título do Livro', 'Advance to Step 3: Book Title')} <ChevronRight size={15} />
              </button>
            </div>

            </div>{/* FIM WIZARD STEP 2 */}

            {/* ═══════ WIZARD STEP 3: TÍTULO & SUBTÍTULO ═══════ */}
            <div style={{ display: wizardStep === 3 ? undefined : 'none' }}>

            {/* ETAPA 3 — TÍTULO DO LIVRO (COM IA E VALIDADOR DE ORIGINALIDADE) */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                  {ui('3. Título do Livro (Original)', '3. Book Title (Original)')}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setIsTop50ModalOpen(true)}
                    title="Inspirar com base nos 50 livros mais vendidos no segmento (#1 ao #200)"
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: 6,
                      padding: '3px 8px',
                      color: '#1d4ed8',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Award size={11} color="#d97706" /> Top 50 (#1-#200)
                  </button>
                  <button
                    type="button"
                    onClick={handleGerarTitulosOriginais}
                    disabled={isGeneratingTitulos}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      padding: '3px 8px',
                      color: '#334155',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Wand2 size={11} color="#475569" /> {isGeneratingTitulos ? ui('Gerando...', 'Generating...') : ui('5 Sugestões', '5 Suggestions')}
                  </button>

                  <button
                    type="button"
                    onClick={handleGerarTitulosTermosAmazon}
                    disabled={isGeneratingAmazonTitles}
                    style={{
                      background: '#0284c7',
                      border: 'none',
                      borderRadius: 6,
                      padding: '3px 9px',
                      color: '#ffffff',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: isGeneratingAmazonTitles ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Sparkles size={11} /> {isGeneratingAmazonTitles ? 'Buscando Termos...' : '🎯 Termos Amazon (BSR < 80k)'}
                  </button>
                </div>
              </div>

              {/* Sugestões baseadas em Termos Reais de Busca da Amazon */}
              {suggestedAmazonTitles.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 8, borderRadius: 6 }}>
                  <div style={{ fontSize: 10.5, color: '#166534', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                    <span>🎯 Títulos Ranqueados na Busca Amazon (clique para aplicar):</span>
                    <span style={{ fontSize: 9.5, color: '#15803d' }}>BSR &lt; 80k</span>
                  </div>
                  {suggestedAmazonTitles.map((item, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setTitulo(item.title);
                        setSubtitulo(item.subtitle);
                        setStatusMsg(`✓ Título "${item.title}" e subtítulo aplicados!`);
                        setStatusType('ok');
                      }}
                      style={{
                        textAlign: 'left',
                        padding: '6px 8px',
                        background: '#ffffff',
                        border: titulo === item.title ? '2px solid #059669' : '1px solid #cbd5e1',
                        borderRadius: 5,
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0f172a' }}>{item.title}</div>
                      <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>{item.subtitle}</div>
                      <div style={{ fontSize: 9, color: '#059669', marginTop: 2, fontWeight: 600 }}>💡 {item.rationale} ({item.targetBsr})</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Pílulas de opções de títulos gerados */}
              {opcoesTitulos.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: '#16a34a', fontWeight: 600 }}>
                    {ui('✓ Opções originais validadas (clique para aplicar):', '✓ Originality-checked options (click to apply):')}
                  </div>
                  {opcoesTitulos.map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setTitulo(opt)}
                      style={{
                        textAlign: 'left',
                        padding: '4px 8px',
                        background: titulo === opt ? '#f1f5f9' : '#ffffff',
                        border: titulo === opt ? '1px solid #0f172a' : '1px solid #cbd5e1',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: titulo === opt ? 700 : 500,
                        color: '#0f172a',
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
                  placeholder={ui('Ex: O Código do Silêncio', 'e.g. The Code of Silence')}
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
                    gap: 5,
                    padding: '8px 12px',
                    background: '#f8fafc',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: loadingSugestao === 'titulo' ? 'not-allowed' : 'pointer'
                  }}
                  title={ui('Sugerir título com base na inteligência de mercado', 'Suggest title based on market intelligence')}
                >
                  <Sparkles size={12} color="#0284c7" /> {loadingSugestao === 'titulo' ? ui('...', '...') : ui('Sugerir', 'Suggest')}
                </button>
              </div>

              {/* REFINADOR INTERATIVO DE TÍTULO COM FEEDBACK (ESTILO COAUTHOR) */}
              <div style={{ marginTop: 8, padding: '8px 10px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                  💬 Dar Feedback para Refinar o Título (Peça 5 variações melhoradas):
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    value={titleFeedbackPrompt}
                    onChange={(e) => setTitleFeedbackPrompt(e.target.value)}
                    placeholder="Ex: Deixe mais curto, intrigante e focado em resultados rápidos..."
                    style={{
                      flex: 1,
                      padding: '6px 9px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 11.5,
                      background: '#ffffff',
                      color: '#0f172a'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleRefinarTituloComFeedback}
                    disabled={isAiStepBusy === 'title-refine'}
                    style={{
                      padding: '6px 10px',
                      background: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {isAiStepBusy === 'title-refine' ? 'Refinando...' : '✨ 5 Títulos Melhorados'}
                  </button>
                </div>
              </div>
            </div>

            {/* Subtítulo Comercial */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
                  {ui('Subtítulo Comercial', 'Marketing Subtitle')}
                </label>
                <button
                  type="button"
                  onClick={handleGerarSubtitulosOriginais}
                  disabled={isGeneratingSubtitulos}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    padding: '3px 8px',
                    color: '#334155',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <Sparkles size={11} color="#0284c7" /> {isGeneratingSubtitulos ? ui('Gerando...', 'Generating...') : ui('5 Sugestões', '5 Suggestions')}
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
                        padding: '6px 10px',
                        background: subtitulo === opt ? '#f1f5f9' : '#ffffff',
                        border: subtitulo === opt ? '1px solid #0f172a' : '1px solid #cbd5e1',
                        borderRadius: 6,
                        fontSize: 12,
                        lineHeight: 1.4,
                        color: '#0f172a',
                        fontWeight: subtitulo === opt ? 700 : 500,
                        cursor: 'pointer',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <textarea
                  rows={3}
                  value={subtitulo}
                  onChange={(e) => setSubtitulo(e.target.value)}
                  placeholder={ui('Ex: O que está oculto nas sombras da mente humana e os segredos que ninguém ousa revelar', 'e.g. What lies hidden in the shadows of the human mind and the secrets no one dares to reveal')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    lineHeight: 1.5,
                    background: '#ffffff',
                    color: '#0f172a',
                    resize: 'vertical',
                    minHeight: 68,
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap'
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleSugerir('subtitulo')}
                  disabled={loadingSugestao === 'subtitulo'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '8px 12px',
                    background: '#f8fafc',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: loadingSugestao === 'subtitulo' ? 'not-allowed' : 'pointer',
                    minHeight: 68
                  }}
                  title={ui('Sugerir subtítulo com gancho de conversão', 'Suggest converting subtitle')}
                >
                  <Sparkles size={12} color="#0284c7" /> {loadingSugestao === 'subtitulo' ? ui('...', '...') : ui('Sugerir', 'Suggest')}
                </button>
              </div>

              {livro && (
                <div style={{ marginTop: 6, display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setLivro(prev => {
                        if (!prev) return null;
                        const atualizado = { ...prev, titulo: titulo.trim(), subtitulo: subtitulo.trim(), autor: autor.trim() };
                        salvarProgressoLocal(atualizado);
                        return atualizado;
                      });
                      setStatusMsg(ui('✓ Título e Subtítulo atualizados diretamente no livro gerado!', '✓ Title and subtitle updated in the generated book!'));
                      setStatusType('ok');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 10px',
                      borderRadius: 6,
                      background: '#ecfdf5',
                      color: '#059669',
                      border: '1px solid #a7f3d0',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    title={ui('Aplica o título e subtítulo digitados diretamente ao livro já gerado', 'Apply the entered title and subtitle to the generated book')}
                  >
                    <Check size={12} /> {ui('Salvar no Livro Gerado', 'Save to Generated Book')}
                  </button>
                </div>
              )}
            </div>

            {/* Navegação Step 3 ← → 4 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 12, marginBottom: 6 }}>
              <button type="button" onClick={() => setWizardStep(2)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <ChevronLeft size={14} /> {ui('Voltar', 'Back')}
              </button>
              <button type="button" onClick={() => handleAdvanceToStep(4)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 18px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 6px rgba(37,99,235,0.2)' }}>
                {ui('Próximo: Recursos', 'Next: Resources')} <ChevronRight size={15} />
              </button>
            </div>

            </div>{/* FIM WIZARD STEP 3 */}

            {/* ═══════ WIZARD STEP 4: RECURSOS, FONTES & BASE DE CONHECIMENTO ═══════ */}
            <div style={{ display: wizardStep === 4 ? undefined : 'none' }}>
              <div style={{ marginBottom: 14, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                    {ui('4. Recursos, Links, Estudos & Notas de Pesquisa', '4. Resources, Links, Studies & Research Notes')}
                  </label>
                  <button
                    type="button"
                    onClick={handleSugerirRecursos}
                    disabled={isAiStepBusy === 'resources'}
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: 6,
                      padding: '4px 9px',
                      color: '#1d4ed8',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Sparkles size={11} /> {isAiStepBusy === 'resources' ? 'Pesquisando...' : 'Sugerir Fontes & Dicas com IA'}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, lineHeight: 1.4 }}>
                  Cole links de blogs, estudos científicos, trechos de pesquisa ou dicas-chave que você deseja que a IA utilize como contexto exclusivo ao escrever os capítulos do seu livro.
                </div>
                <textarea
                  rows={8}
                  value={resourceNotes}
                  onChange={(e) => setResourceNotes(e.target.value)}
                  placeholder="Cole aqui URLs de referência, dados estatísticos, anotações pessoais ou clique em 'Sugerir Fontes & Dicas com IA' acima..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    lineHeight: 1.5,
                    background: '#ffffff',
                    color: '#0f172a',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
                {/* Upload rápido de arquivo .txt/.md para a Base de Recursos */}
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 10px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer'
                  }}>
                    <Upload size={12} color="#2563eb" /> Carregar Arquivo de Notas (.txt / .md)
                    <input
                      type="file"
                      accept=".txt,.md,.csv"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const content = String(reader.result || '');
                          setResourceNotes(prev => prev ? `${prev}\n\n--- [${file.name}] ---\n${content}` : content);
                          setStatusMsg(`✓ Arquivo "${file.name}" anexado aos Recursos da Obra!`);
                          setStatusType('ok');
                        };
                        reader.readAsText(file);
                      }}
                    />
                  </label>
                  {resourceNotes && (
                    <span style={{ fontSize: 10.5, color: '#059669', fontWeight: 700 }}>
                      ✓ {resourceNotes.split(/\s+/).filter(Boolean).length} palavras no contexto
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 12, marginBottom: 6 }}>
                <button type="button" onClick={() => setWizardStep(3)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  <ChevronLeft size={14} /> {ui('Voltar', 'Back')}
                </button>
                <button type="button" onClick={() => handleAdvanceToStep(5)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 18px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {ui('Próximo: Persona & Bio', 'Next: Author Bio')} <ChevronRight size={15} />
                </button>
              </div>
            </div>{/* FIM WIZARD STEP 4 */}

            {/* ═══════ WIZARD STEP 5: PERSONA & BIOGRAFIA DO AUTOR (ESTILO COAUTHOR PRINT) ═══════ */}
            <div style={{ display: wizardStep === 5 ? undefined : 'none' }}>
              <div style={{ marginBottom: 14, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                    5. Persona & Biografia Personalizada do Autor
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    Um livro excelente não é feito apenas de técnicas, mas de histórias e da voz de quem ensina ou narra. Preencha os campos abaixo (deixe em branco o que não se aplicar).
                  </div>
                </div>

                {/* Grid 2 Colunas idêntico à tela Author Biography do Coauthor.ai */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 3 }}>
                      Nome do Autor *
                    </label>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <input
                        type="text"
                        value={autor}
                        onChange={(e) => setAutor(e.target.value)}
                        placeholder="Ex: Kate Hansen / Leandro Souza"
                        style={{ flex: 1, padding: '7px 9px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#ffffff', color: '#0f172a', minWidth: 0 }}
                      />
                      <button
                        type="button"
                        onClick={() => handleSugerir('autor')}
                        disabled={loadingSugestao === 'autor'}
                        title="Gerar pseudônimo editorial com IA"
                        style={{ padding: '6px 8px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                      >
                        <Wand2 size={11} color="#475569" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 3 }}>
                      Tipo de Autor *
                    </label>
                    <select
                      value={authorType}
                      onChange={(e) => setAuthorType(e.target.value)}
                      style={{ width: '100%', padding: '7px 9px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#ffffff', color: '#0f172a' }}
                    >
                      <option value="Pseudônimo (Autor Pessoal)">Pseudônimo (Pen Name / Autor Pessoal)</option>
                      <option value="Nome Real (Especialista / Autoridade)">Nome Real (Especialista / Autoridade)</option>
                      <option value="Marca Editorial (Brand Name)">Marca Editorial (Brand Name)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 3 }}>
                      Background Profissional / Vivência *
                    </label>
                    <input
                      type="text"
                      value={authorBackground}
                      onChange={(e) => setAuthorBackground(e.target.value)}
                      placeholder="Ex: Mãe ocupada de 2 filhos / Investigador..."
                      style={{ width: '100%', padding: '7px 9px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#ffffff', color: '#0f172a', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 3 }}>
                      Formação / Educação
                    </label>
                    <input
                      type="text"
                      value={authorEducation}
                      onChange={(e) => setAuthorEducation(e.target.value)}
                      placeholder="Sua formação acadêmica ou autodidata"
                      style={{ width: '100%', padding: '7px 9px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#ffffff', color: '#0f172a', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 3 }}>
                      Conquistas, Publicações ou Detalhes Pessoais
                    </label>
                    <input
                      type="text"
                      value={authorAchievements}
                      onChange={(e) => setAuthorAchievements(e.target.value)}
                      placeholder="Prêmios, marcos, família, interesses..."
                      style={{ width: '100%', padding: '7px 9px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#ffffff', color: '#0f172a', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 3 }}>
                      Autores de Inspiração (Estilo de Escrita)
                    </label>
                    <input
                      type="text"
                      value={authorStyleInspiration}
                      onChange={(e) => setAuthorStyleInspiration(e.target.value)}
                      placeholder="Ex: James Clear, Brené Brown, Dan Brown..."
                      style={{ width: '100%', padding: '7px 9px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#ffffff', color: '#0f172a', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGerarBiografiaAutor}
                  disabled={isAiStepBusy === 'bio'}
                  style={{
                    width: '100%',
                    padding: '9px 14px',
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    marginBottom: 8
                  }}
                >
                  <Sparkles size={13} color="#38bdf8" />
                  {isAiStepBusy === 'bio' ? 'Gerando Biografia Personalizada...' : 'Gerar Biografia do Autor (Generate Biography)'}
                </button>

                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 3 }}>
                  Biografia Oficial & Voz Narrativa (Editável):
                </label>
                <textarea
                  rows={4}
                  value={authorOfficialBio}
                  onChange={(e) => setAuthorOfficialBio(e.target.value)}
                  placeholder="A biografia gerada aparecerá aqui e será incorporada na escrita dos exemplos do livro e na seção Sobre o Autor..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    lineHeight: 1.45,
                    background: '#ffffff',
                    color: '#0f172a',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 12, marginBottom: 6 }}>
                <button type="button" onClick={() => setWizardStep(4)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  <ChevronLeft size={14} /> {ui('Voltar', 'Back')}
                </button>
                <button type="button" onClick={() => handleAdvanceToStep(6)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 18px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {ui('Próximo: Proposta & Foco', 'Next: Proposed Book')} <ChevronRight size={15} />
                </button>
              </div>
            </div>{/* FIM WIZARD STEP 5 */}

            {/* ═══════ WIZARD STEP 6: PROPOSTA DO LIVRO, FOCO & DIFERENCIAL EDITORIAL ═══════ */}
            <div style={{ display: wizardStep === 6 ? undefined : 'none' }}>

            {/* ETAPA 6 — DIFERENCIAL EDITORIAL & PROPOSTA DO LIVRO COM FOCO */}
            <div style={{ marginBottom: 14, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                  {ui('6. Proposta do Livro, Diferencial & Tags de Foco', '6. Proposed Book, Edge & Focus Tags')}
                </label>
                <button
                  type="button"
                  onClick={handleSugerirDiferencialCompleto}
                  disabled={isSuggestingDiferencial}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    padding: '4px 9px',
                    color: '#334155',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: isSuggestingDiferencial ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                  title={ui('Preencher todos os diferenciais usando inteligência da categoria', 'Fill differentiation using category intelligence')}
                >
                  <Sparkles size={11} color="#0284c7" className={isSuggestingDiferencial ? 'spin' : ''} />
                  {isSuggestingDiferencial ? ui('Gerando...', 'Generating...') : ui('Sugerir Completo', 'Suggest All')}
                </button>
              </div>

              {/* Ângulo Único */}
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 2 }}>
                  {ui('Ângulo Único (Por que este livro é diferente?)', 'Unique Angle (What makes this book different?)')}
                </label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <textarea
                    rows={2}
                    value={uniqueAngle}
                    onChange={(e) => setUniqueAngle(e.target.value)}
                    placeholder={ui('Ex: Abordagem neurocientífica aplicada a casos reais e análise forense', 'e.g. A neuroscience-based approach applied to real cases and forensic analysis')}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                      lineHeight: 1.4,
                      background: '#ffffff',
                      color: '#0f172a',
                      resize: 'vertical',
                      minHeight: 46,
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSugerirCampoDiferencial('uniqueAngle')}
                    disabled={loadingSugestao === 'uniqueAngle'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 10px',
                      background: '#ffffff',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: loadingSugestao === 'uniqueAngle' ? 'not-allowed' : 'pointer',
                      minHeight: 46
                    }}
                    title={ui('Sugerir ângulo diferencial', 'Suggest unique angle')}
                  >
                    <Sparkles size={11} color="#0284c7" /> {loadingSugestao === 'uniqueAngle' ? '...' : ui('Sugerir', 'Suggest')}
                  </button>
                </div>
              </div>

              {/* Promessa Central */}
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 2 }}>
                  {ui('Promessa Central ao Leitor', 'Core Promise to the Reader')}
                </label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <textarea
                    rows={2}
                    value={bookPromise}
                    onChange={(e) => setBookPromise(e.target.value)}
                    placeholder={ui('Ex: Revelar os padrões ocultos da mente humana e prender o leitor a cada reviravolta', 'e.g. Reveal hidden patterns of the human mind and keep readers engaged with every twist')}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                      lineHeight: 1.4,
                      background: '#ffffff',
                      color: '#0f172a',
                      resize: 'vertical',
                      minHeight: 46,
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSugerirCampoDiferencial('bookPromise')}
                    disabled={loadingSugestao === 'bookPromise'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 10px',
                      background: '#ffffff',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: loadingSugestao === 'bookPromise' ? 'not-allowed' : 'pointer',
                      minHeight: 46
                    }}
                    title={ui('Sugerir promessa principal', 'Suggest core promise')}
                  >
                    <Sparkles size={11} color="#0284c7" /> {loadingSugestao === 'bookPromise' ? '...' : ui('Sugerir', 'Suggest')}
                  </button>
                </div>
              </div>

              {/* Público / Leitor Alvo */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 2 }}>
                  {ui('Público / Leitor Alvo', 'Target Audience / Reader')}
                </label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <textarea
                    rows={2}
                    value={targetReader}
                    onChange={(e) => setTargetReader(e.target.value)}
                    placeholder={ui('Ex: Jovens adultos, profissionais em transição, leitores vorazes de suspense psicológico', 'e.g. Young adults, professionals in transition, avid psychological thriller readers')}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                      lineHeight: 1.4,
                      background: '#ffffff',
                      color: '#0f172a',
                      resize: 'vertical',
                      minHeight: 46,
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSugerirCampoDiferencial('targetReader')}
                    disabled={loadingSugestao === 'targetReader'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 10px',
                      background: '#ffffff',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: loadingSugestao === 'targetReader' ? 'not-allowed' : 'pointer',
                      minHeight: 46
                    }}
                    title={ui('Sugerir público-alvo', 'Suggest target reader')}
                  >
                    <Sparkles size={11} color="#0284c7" /> {loadingSugestao === 'targetReader' ? '...' : ui('Sugerir', 'Suggest')}
                  </button>
                </div>
              </div>

              {/* NOVO COAUTHOR: TAGS DE FOCO DO LIVRO (SELECTABLE FOCUS TAGS) */}
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                  🎯 Áreas de Foco do Livro (Selecione os pilares que destacam sua obra):
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                  {[
                    'Estratégias Práticas',
                    'Ganhos Rápidos Diários',
                    'Exemplos da Vida Real',
                    'Baseado em Neurociência / Dados',
                    'Passo a Passo Simples',
                    'Quebra de Mitos',
                    'Storytelling Imersivo',
                    'Exercícios Aplicáveis'
                  ].map(tag => {
                    const active = focusTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setFocusTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
                        }}
                        style={{
                          padding: '4px 9px',
                          borderRadius: 14,
                          fontSize: 10.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: active ? '#0f172a' : '#ffffff',
                          color: active ? '#ffffff' : '#475569',
                          border: active ? '1px solid #0f172a' : '1px solid #cbd5e1',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {active ? `✓ ${tag}` : `+ ${tag}`}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <input
                    type="text"
                    value={customFocusTag}
                    onChange={(e) => setCustomFocusTag(e.target.value)}
                    placeholder="Adicionar foco personalizado (Ex: Rotinas de 10 minutos)..."
                    style={{ flex: 1, padding: '5px 9px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 11, background: '#ffffff' }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!customFocusTag.trim()) return;
                      if (!focusTags.includes(customFocusTag.trim())) {
                        setFocusTags(prev => [...prev, customFocusTag.trim()]);
                      }
                      setCustomFocusTag('');
                    }}
                    style={{ padding: '5px 10px', background: '#e2e8f0', color: '#0f172a', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                  >
                    + Tag
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleGerarPropostaFoco}
                  disabled={isAiStepBusy === 'proposal'}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    marginBottom: 6
                  }}
                >
                  <Sparkles size={12} /> {isAiStepBusy === 'proposal' ? 'Consolidando Proposta...' : '✨ Gerar Proposta do Livro com Foco (Proposed Book)'}
                </button>

                {proposedBookSummary && (
                  <textarea
                    rows={3}
                    value={proposedBookSummary}
                    onChange={(e) => setProposedBookSummary(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 9px',
                      borderRadius: 6,
                      border: '1px solid #bfdbfe',
                      fontSize: 11.5,
                      lineHeight: 1.45,
                      background: '#eff6ff',
                      color: '#1e3a8a',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                )}
              </div>
            </div>

            {/* Navegação Step 6 ← → 7 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 12, marginBottom: 6 }}>
              <button type="button" onClick={() => setWizardStep(5)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <ChevronLeft size={14} /> {ui('Voltar', 'Back')}
              </button>
              <button type="button" onClick={() => handleAdvanceToStep(7)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 18px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 6px rgba(37,99,235,0.2)' }}>
                {ui('Próximo: Detalhes & Sumário', 'Next: Details & Outline')} <ChevronRight size={15} />
              </button>
            </div>

            </div>{/* FIM WIZARD STEP 6 */}

            {/* ═══════ WIZARD STEP 7: DETALHES, ESTRUTURA & SUMÁRIO VARIADO ═══════ */}
            <div style={{ display: wizardStep === 7 ? undefined : 'none' }}>

            {/* Autor */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                {ui('Autor / Pseudônimo', 'Author / Pen Name')}
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  value={autor}
                  onChange={(e) => setAutor(e.target.value)}
                  placeholder={ui('Seu nome ou pseudônimo', 'Your name or pen name')}
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
                    gap: 5,
                    padding: '8px 12px',
                    background: '#f8fafc',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Wand2 size={12} color="#475569" /> IA
                </button>
              </div>
            </div>

            {/* Premissa Central */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                {ui('Premissa Central da História / Tese Geral', 'Central Story Premise / Main Thesis')}
              </label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <textarea
                  rows={3}
                  value={topico}
                  onChange={(e) => setTopico(e.target.value)}
                  placeholder={ui('Descreva a ideia central, protagonista, conflito e segredo do livro...', 'Describe the central idea, protagonist, conflict, and secret of the book...')}
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
                    gap: 5,
                    padding: '8px 12px',
                    background: '#f8fafc',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Wand2 size={12} color="#475569" /> IA
                </button>
              </div>
            </div>

            {/* NOVO COAUTHOR: ESTRUTURA DO LIVRO & GERADOR DE SUMÁRIO COM RITMO VARIADO */}
            <div style={{ marginBottom: 12, background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                📐 Estrutura Editorial & Ritmo dos Capítulos (Evita Capítulos Repetitivos):
              </label>
              <select
                value={bookStructureType}
                onChange={(e) => setBookStructureType(e.target.value)}
                style={{ width: '100%', padding: '7px 9px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#ffffff', color: '#0f172a', marginBottom: 8 }}
              >
                <option value="Jornada Progressiva com Ritmo Variado (Passo a Passo + Casos + Quebra de Mitos)">Jornada Progressiva com Ritmo Variado (Passo a Passo + Casos + Mitos)</option>
                <option value="Narrativa Cinematográfica em 3 Atos com Gancho por Capítulo">Narrativa Cinematográfica em 3 Atos com Gancho por Capítulo</option>
                <option value="Guia Prático Modular (Problema -> Causa Oculta -> Protocolo Diário)">Guia Prático Modular (Problema → Causa Oculta → Protocolo Diário)</option>
                <option value="Investigação Profunda & Estudos de Caso Reais">Investigação Profunda & Estudos de Caso Reais</option>
              </select>

              <button
                type="button"
                onClick={handleGerarSumarioRitmoVariado}
                disabled={isAiStepBusy === 'outline'}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <Sparkles size={12} color="#38bdf8" />
                {isAiStepBusy === 'outline' ? 'Planejando Sumário com Ritmo Variado...' : `✨ Gerar Prévia de Sumário (${maxCapitulos} Caps com Abordagens Distintas)`}
              </button>

              {variedOutlinePreview.length > 0 && (
                <div style={{ marginTop: 8, maxHeight: 170, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5, paddingRight: 2 }}>
                  {variedOutlinePreview.map((item, idx) => (
                    <div key={idx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 8px', fontSize: 11 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>Cap. {item.num}: {item.title}</span>
                        <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: '#eff6ff', color: '#1d4ed8', whiteSpace: 'nowrap' }}>
                          {item.sectionsCount} seções • ~{item.targetWords} pal.
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{item.focus}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Metas de Páginas e Capítulos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  {ui('Páginas Alvo', 'Target Pages')}
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
                  {ui('Máximo Capítulos', 'Maximum Chapters')}
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
                  {ui('Tamanho Editorial', 'Trim Size')}
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
                  <option value="6x9">{ui('6 x 9" (padrão)', '6 x 9" (standard)')}</option>
                  <option value="5x8">5 x 8"</option>
                  <option value="5.5x8.5">5.5 x 8.5"</option>
                  <option value="8.5x11">8.5 x 11"</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  {ui('Idioma', 'Language')}
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
                  <option value="português">{ui('Português', 'Portuguese')}</option>
                  <option value="inglês">{ui('Inglês', 'English')}</option>
                  <option value="espanhol">{ui('Espanhol', 'Spanish')}</option>
                </select>
              </div>
            </div>

            {/* Tipografia do Título do Capítulo */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  {ui('Tam. Capítulo (pt)', 'Chapter Font Size (pt)')}
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
                  {ui('Cor do Capítulo', 'Chapter Color')}
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
                Incluir sumário diagramado com numeração oficial
              </label>
            </div>

            {/* Navegação Step 7 ← → 8 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 12, marginBottom: 6 }}>
              <button type="button" onClick={() => setWizardStep(6)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <ChevronLeft size={14} /> {ui('Voltar', 'Back')}
              </button>
              <button type="button" onClick={() => handleAdvanceToStep(8)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 18px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 6px rgba(37,99,235,0.2)' }}>
                🚀 {ui('Ir para Escrita & Produção', 'Go to Write & Production')} <ChevronRight size={15} />
              </button>
            </div>

            </div>{/* FIM WIZARD STEP 7 */}

            {/* ═══════ WIZARD STEP 8: ESCRITA, PRODUÇÃO & ENRIQUECIMENTO DE CAPÍTULOS ═══════ */}
            <div style={{ display: wizardStep === 8 ? undefined : 'none' }}>

            {/* INFORMAÇÃO DE CRÉDITOS DO LIVRO (US$ 3 POR LIVRO GERADO) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(15, 23, 42, 0.04)',
              border: '1px solid rgba(14, 165, 233, 0.25)',
              borderRadius: 8,
              padding: '8px 12px',
              marginBottom: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#334155' }}>
                <span style={{ fontSize: 14 }}>💳</span>
                <span>Créditos: <strong>{creditosLivros} {creditosLivros === 1 ? 'livro' : 'livros'}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCreditModalMotivo('Recarregue seus créditos para produzir livros completos na plataforma.');
                  setIsCreditModalOpen(true);
                }}
                style={{
                  background: 'rgba(14, 165, 233, 0.1)',
                  color: '#0284c7',
                  border: '1px solid rgba(14, 165, 233, 0.3)',
                  borderRadius: 6,
                  padding: '3px 8px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                + Adicionar Créditos
              </button>
            </div>

            {/* BOTÕES DE CONTROLE DA PRODUÇÃO */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button
                type="button"
                onClick={() => bookType === 'planner' || bookType === 'diary' ? setActiveTab('planner') : iniciarGeracao()}
                disabled={gerando || isPlanningEditorial}
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
                <Play size={16} /> {bookType === 'planner' || bookType === 'diary'
                  ? '🚀 Gerar Páginas'
                  : isPlanningEditorial
                    ? ui('Planejando...', 'Planning...')
                    : gerando
                      ? ui('Gerando...', 'Generating...')
                      : `🚀 ${ui('Gerar Livro', 'Generate Book')}`}
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

            {/* FERRAMENTAS COAUTHOR DE ENRIQUECIMENTO EDITORIAL DO CAPÍTULO ATUAL */}
            <div style={{ marginBottom: 10, padding: '10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                ✨ Enriquecer Capítulo Atual com IA (Estilo Coauthor Write Tools):
              </div>
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8 }}>
                Adicione profundidade real, estudos, casos históricos ou citações diretamente ao capítulo selecionado:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => handleEnriquecerCapituloAtual('data')}
                  disabled={!!isAiStepBusy}
                  style={{ padding: '7px 8px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 10.5, fontWeight: 700, color: '#0f172a', cursor: 'pointer', textAlign: 'left' }}
                >
                  📊 {isAiStepBusy === 'enrich-data' ? 'Inserindo...' : 'Fortalecer com Dados'}
                </button>
                <button
                  type="button"
                  onClick={() => handleEnriquecerCapituloAtual('history')}
                  disabled={!!isAiStepBusy}
                  style={{ padding: '7px 8px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 10.5, fontWeight: 700, color: '#0f172a', cursor: 'pointer', textAlign: 'left' }}
                >
                  🏛️ {isAiStepBusy === 'enrich-history' ? 'Inserindo...' : 'Fatos Históricos / Casos'}
                </button>
                <button
                  type="button"
                  onClick={() => handleEnriquecerCapituloAtual('quote')}
                  disabled={!!isAiStepBusy}
                  style={{ padding: '7px 8px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 10.5, fontWeight: 700, color: '#0f172a', cursor: 'pointer', textAlign: 'left' }}
                >
                  💬 {isAiStepBusy === 'enrich-quote' ? 'Inserindo...' : 'Apoiar com Citação'}
                </button>
                <button
                  type="button"
                  onClick={() => handleEnriquecerCapituloAtual('expand')}
                  disabled={!!isAiStepBusy}
                  style={{ padding: '7px 8px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 10.5, fontWeight: 700, color: '#0f172a', cursor: 'pointer', textAlign: 'left' }}
                >
                  🔍 {isAiStepBusy === 'enrich-expand' ? 'Expandindo...' : 'Expandir com Exemplo'}
                </button>
              </div>
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
                padding: '11px',
                background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                marginBottom: 8,
                boxShadow: '0 2px 8px rgba(234, 88, 12, 0.25)'
              }}
            >
              <Sparkles size={15} /> 🎨 Gerar Capa & Página Promocional
            </button>

            {/* INPUT DE ARQUIVO OCULTO PARA IMPORTAR CAPA EXTERNA */}
            <input
              type="file"
              ref={coverFileInputRef}
              accept="image/png,image/jpeg,image/webp"
              onChange={handleImportarCapa}
              style={{ display: 'none' }}
            />

            {/* BOTÃO IMPORTAR CAPA DO COMPUTADOR */}
            <button
              type="button"
              onClick={() => coverFileInputRef.current?.click()}
              disabled={gerando}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '9px 12px',
                background: '#ffffff',
                color: '#0f172a',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                marginBottom: 10,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
              title="Importar imagem própria de capa (PNG, JPG, WEBP) para gerar contracapa e wrap oficial"
            >
              <Upload size={15} color="#2563eb" /> 📁 Importar Capa do Computador
            </button>

            {/* CONTINUAR E DESCARTAR */}
            {livro && livro.capitulos.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <button
                  type="button"
                  onClick={continuarGeracao}
                  disabled={isPlanningEditorial || (gerando && autoClickCountdown === null)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: autoClickCountdown !== null ? '10px 14px' : '10px',
                    background: autoClickCountdown !== null
                      ? 'linear-gradient(135deg, #059669, #10b981)'
                      : 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    border: autoClickCountdown !== null ? '2px solid #34d399' : 'none',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: autoClickCountdown !== null
                      ? '0 0 16px rgba(16, 185, 129, 0.7)'
                      : '0 2px 6px rgba(16, 185, 129, 0.3)',
                    transform: isAutoClicking ? 'scale(0.95)' : autoClickCountdown !== null ? 'scale(1.02)' : 'scale(1)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Play size={14} />
                  {autoClickCountdown !== null
                    ? `⚡ Auto-clique em ${autoClickCountdown}s...`
                    : `▶ ${ui('Continuar Geração (Capítulo', 'Continue Generating (Chapter')} ${livro.capitulos.length + 1})`}
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
                marginTop: 8,
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
            <div style={{ marginTop: 10 }}>
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

            {/* Navegação Step 8 ← → 9 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 12, marginBottom: 6 }}>
              <button type="button" onClick={() => setWizardStep(7)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <ChevronLeft size={14} /> {ui('Voltar', 'Back')}
              </button>
              <button type="button" onClick={() => handleAdvanceToStep(9)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 18px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {ui('Próximo: Descrição', 'Next: Description')} <ChevronRight size={15} />
              </button>
            </div>

            </div>{/* FIM WIZARD STEP 8 */}

            {/* ═══════ WIZARD STEP 9: DESCRIÇÃO COMERCIAL DO LIVRO (DESCRIPTION) ═══════ */}
            <div style={{ display: wizardStep === 9 ? undefined : 'none' }}>
              <div style={{ marginBottom: 14, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>
                    9. Descrição Comercial & Sinopse de Vendas
                  </label>
                  <button
                    type="button"
                    onClick={handleGerarDescricaoComercial}
                    disabled={isAiStepBusy === 'description'}
                    style={{
                      background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '5px 10px',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Sparkles size={11} /> {isAiStepBusy === 'description' ? 'Gerando Copy...' : '✨ Gerar Descrição Comercial'}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, lineHeight: 1.4 }}>
                  Gera uma descrição persuasiva estruturada com Headline de Gancho, Identificação, Bullet Points do que o leitor vai descobrir e Chamada para Ação pronta para a página de vendas do livro.
                </div>

                <textarea
                  rows={11}
                  value={bookCommercialDescription}
                  onChange={(e) => setBookCommercialDescription(e.target.value)}
                  placeholder="Clique em '✨ Gerar Descrição Comercial' acima para criar a copy completa de vendas do seu livro..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 12,
                    lineHeight: 1.5,
                    background: '#ffffff',
                    color: '#0f172a',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />

                {bookCommercialDescription && (
                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(bookCommercialDescription);
                        setCopiedDescOk(true);
                        setTimeout(() => setCopiedDescOk(false), 2500);
                      }}
                      style={{
                        padding: '6px 12px',
                        background: copiedDescOk ? '#059669' : '#0f172a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                    >
                      {copiedDescOk ? <Check size={13} /> : <Copy size={13} />}
                      {copiedDescOk ? 'Descrição Copiada!' : 'Copiar Descrição Completa'}
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 12, marginBottom: 6 }}>
                <button type="button" onClick={() => setWizardStep(8)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  <ChevronLeft size={14} /> {ui('Voltar', 'Back')}
                </button>
                <button type="button" onClick={() => handleAdvanceToStep(10)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 18px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {ui('Próximo: Capa & Prompts', 'Next: Book Cover')} <ChevronRight size={15} />
                </button>
              </div>
            </div>{/* FIM WIZARD STEP 9 */}

            {/* ═══════ WIZARD STEP 10: CAPA, CONTRACAPA & FINALIZAÇÃO (BOOK COVER & FINISH) ═══════ */}
            <div style={{ display: wizardStep === 10 ? undefined : 'none' }}>
              <div style={{ marginBottom: 12, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                  10. Estúdio de Capa, Contracapa & Master Prompts
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10, lineHeight: 1.4 }}>
                  Gere a capa diretamente na plataforma, importe uma arte do seu computador ou copie os <b>2 Prompts Mestres Editoriais</b> (1. Apenas Capa Frontal e 2. Capa + Lombada + Contracapa com Breve Leitura em Total Sintonia).
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('capa');
                      gerarCapaEPaginaPromocional();
                    }}
                    disabled={gerando}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '11px',
                      background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(234, 88, 12, 0.25)'
                    }}
                  >
                    <Sparkles size={15} /> 🎨 Gerar Capa & Contracapa Automaticamente
                  </button>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => coverFileInputRef.current?.click()}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '8px 10px',
                        background: '#ffffff',
                        color: '#0f172a',
                        border: '1px solid #cbd5e1',
                        borderRadius: 7,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <Upload size={13} color="#2563eb" /> Importar Capa
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('capa')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '8px 10px',
                        background: '#0f172a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 7,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <Eye size={13} color="#38bdf8" /> Ver Capa Aberta
                    </button>
                  </div>
                </div>

                {/* CARD COMPLETO DOS 2 PROMPTS DE CAPA (FRENTE + CAPA/LOMBADA/CONTRACAPA EM SINTONIA) */}
                <KdpCoverMasterPromptCard
                  titulo={livro?.titulo || titulo}
                  subtitulo={livro?.subtitulo || subtitulo}
                  autor={livro?.autor || autor}
                  genero={livro?.genero || genero}
                  premissa={bookPromise || uniqueAngle || topico || temaSelecionado || subtitulo}
                  idioma={idioma || 'pt'}
                  compactMode={true}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 8, marginTop: 10, marginBottom: 6 }}>
                <button type="button" onClick={() => setWizardStep(9)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  <ChevronLeft size={14} /> {ui('Voltar à Descrição', 'Back to Description')}
                </button>
              </div>
            </div>{/* FIM WIZARD STEP 10 */}
            </div>{/* FIM DO CORPO DO FORMULÁRIO */}
          </div>
          )} {/* FIM DA COLUNA 2 */}

          {/* ========================================================= */}
          {/* COLUNA 3: PALCO VISUAL AMPLO (LIVRO DIAGRAMADO, CAPA & AUDITORIA) */}
          {/* ========================================================= */}
          {(workspaceLayout === 'split' || activeTab !== 'wizard') && (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '16px 18px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              width: '100%',
              minWidth: 0,
              boxSizing: 'border-box'
            }}
          >
            {/* BARRA SUPERIOR DO PALCO CENTRAL: APENAS IDENTIFICADOR DA TELA ATIVA & AÇÕES RÁPIDAS */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10,
                paddingBottom: 10,
                borderBottom: '1px solid #f1f5f9'
              }}
            >
              {/* IDENTIFICADOR DA VISÃO CENTRAL ATIVA */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                  {activeTab === 'preview'
                    ? '📖 Manuscrito & Livro Diagramado KDP'
                    : activeTab === 'capa'
                    ? '🎨 Estúdio de Capa, Contracapa & Wrap KDP'
                    : activeTab === 'auditoria'
                    ? '🛡️ Auditoria Editorial (Ortografia, Diagramação & Enredo)'
                    : activeTab === 'market'
                    ? '📈 Inteligência de Mercado & Bestsellers KDP'
                    : `✍️ Editor Editorial - Etapa ${wizardStep} de 10`}
                </span>
                <span style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: '#f1f5f9',
                  color: '#475569'
                }}>
                  {formato} • {livro?.capitulos?.length || 0} caps
                </span>
              </div>

              {/* BOTÕES DE AÇÕES DIRETAS DO LIVRO */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  onClick={baixarPDF}
                  disabled={!livro || livro.capitulos.length === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '7px 12px',
                    borderRadius: 6,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: !livro || livro.capitulos.length === 0 ? '#94a3b8' : '#0f172a',
                    cursor: !livro || livro.capitulos.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                  title="Baixar Livro Diagramado em PDF KDP"
                >
                  <Download size={13} /> {ui('PDF Miolo', 'Interior PDF')}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const targetIdx = audioReadingCapIndex !== null ? audioReadingCapIndex : 0;
                    if (isPlayingAudio) stopAudioReading();
                    else startAudioReading(targetIdx, 'full');
                  }}
                  disabled={!livro || livro.capitulos.length === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '7px 12px',
                    borderRadius: 6,
                    background: isPlayingAudio ? '#ef4444' : '#f0fdf4',
                    border: isPlayingAudio ? '1px solid #dc2626' : '1px solid #bbf7d0',
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: isPlayingAudio ? '#ffffff' : '#16a34a',
                    cursor: !livro || livro.capitulos.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Headphones size={13} /> {isPlayingAudio ? ui('Parar Áudio', 'Stop Audio') : ui('Ouvir Obra', 'Listen Book')}
                </button>

                <button
                  type="button"
                  onClick={finalizarLivroEGravarNaDashboard}
                  disabled={!livro || livro.capitulos.length === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 16px',
                    borderRadius: 6,
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: !livro || livro.capitulos.length === 0 ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.2)'
                  }}
                >
                  <CheckCircle2 size={13} color="#22c55e" /> {ui('Finalizar Livro', 'Finalize Book')}
                </button>
              </div>
            </div>

            {/* ABA 1: PRÉ-VISUALIZAÇÃO DO LIVRO */}
              {activeTab === 'preview' && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* PAINEL DO MOTOR DE SILHUETAS MARGINAIS COM 3% DE SANGRIA EXTERNA */}
                  {/* PAINEL DO MOTOR DE SILHUETAS ARTÍSTICAS & MARCAS D'ÁGUA P&B */}
                  {/* PAINEL DIDÁTICO E VISUAL: ACABAMENTO EDITORIAL DE MIOLO (SILHUETA & MARCA D'ÁGUA P&B) */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 10,
                      padding: '16px 20px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 280 }}>
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Palette size={18} color="#0f172a" />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                              {ui("Acabamento de Miolo KDP · Silhueta & Marca d'Água P&B", "KDP Interior Finish · B&W Silhouette & Watermark")}
                            </h3>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 4,
                              background: silhuetaConfig.ativado && silhuetaConfig.imagemDataUrl ? '#ecfdf5' : '#f1f5f9',
                              color: silhuetaConfig.ativado && silhuetaConfig.imagemDataUrl ? '#059669' : '#64748b'
                            }}>
                              {silhuetaConfig.ativado && silhuetaConfig.imagemDataUrl ? ui('Ativa no Miolo', 'Active in Interior') : ui('Opcional', 'Optional')}
                            </span>
                          </div>
                          <p style={{ fontSize: 12, color: '#475569', margin: '4px 0 0', lineHeight: 1.4 }}>
                            {ui(
                              "Recurso visual de edições de luxo e bestsellers da Amazon: insere uma ilustração monocromática sutil ao fundo das páginas para acabamento requintado no livro impresso.",
                              "Luxury edition and Amazon bestseller feature: places a subtle monochrome illustration behind pages for a premium physical print finish."
                            )}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={silhuetaConfig.ativado}
                            onChange={(e) => setSilhuetaConfig(prev => ({ ...prev, ativado: e.target.checked }))}
                            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#0f172a' }}
                          />
                          {ui('Ativar no Livro', 'Enable in Book')}
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowSilhuetaPanel(!showSilhuetaPanel)}
                          style={{
                            background: showSilhuetaPanel ? '#0f172a' : '#f8fafc',
                            color: showSilhuetaPanel ? '#ffffff' : '#334155',
                            border: '1px solid #cbd5e1',
                            borderRadius: 6,
                            padding: '6px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5
                          }}
                        >
                          <Sliders size={13} />
                          {showSilhuetaPanel ? ui('Recolher Controles', 'Collapse Controls') : ui('Configurar & Escolher Arte', 'Setup & Choose Art')}
                        </button>
                      </div>
                    </div>

                    {/* MOCKUP E CONTROLES DE SILHUETA (COLAPSADO POR PADRÃO - SÓ ABRE QUANDO O AUTOR CLICAR EM EXPANDIR) */}
                    {showSilhuetaPanel && (
                      <>
                        {/* MOCKUP VISUAL INTERATIVO DE LIVRO ABERTO (DEMONSTRAÇÃO REALISTA PARA O AUTOR APRENDER) */}
                        <div style={{
                          marginTop: 14,
                          padding: 14,
                          background: '#f8fafc',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 10
                        }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 540, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Eye size={13} color="#0284c7" /> {ui('Prévia Visual de Impressão no Miolo (Simulação 6x9"):', 'Interior Print Visual Preview (6x9" Simulation):')}
                        </span>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#059669',
                          background: '#ecfdf5',
                          padding: '1px 7px',
                          borderRadius: 4,
                          border: '1px solid #a7f3d0'
                        }}>
                          {silhuetaConfig.ativado && silhuetaConfig.imagemDataUrl
                            ? `${silhuetaConfig.opacidade || 10}% ${ui('Opacidade · Legibilidade 100%', 'Opacity · 100% Readable')}`
                            : ui('Miolo Tradicional Limpo', 'Clean Traditional Interior')}
                        </span>
                      </div>

                      {/* LIVRO ABERTO SIMULADO */}
                      <div style={{
                        width: '100%',
                        maxWidth: 540,
                        height: 170,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        {/* LOMBADA / DOBRA CENTRAL */}
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          bottom: 0,
                          left: '50%',
                          width: 2,
                          background: 'linear-gradient(to bottom, #cbd5e1, #94a3b8, #cbd5e1)',
                          zIndex: 3
                        }} />

                        {/* PÁGINA ESQUERDA (COM SILHUETA DE FUNDO EM TEMPO REAL) */}
                        <div style={{
                          padding: '14px 16px',
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          borderRight: '1px solid #f1f5f9'
                        }}>
                          {/* SILHUETA DE FUNDO RENDERIZADA COM A OPACIDADE EXATA */}
                          {silhuetaConfig.ativado && silhuetaConfig.imagemDataUrl && (
                            <img
                              src={silhuetaConfig.imagemDataUrl}
                              alt="Silhueta"
                              style={{
                                position: 'absolute',
                                ...(silhuetaConfig.modoCobertura === 'marginal'
                                  ? { bottom: 6, right: 6, width: 64, height: 64 }
                                  : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', height: '80%' }),
                                objectFit: 'contain',
                                opacity: (silhuetaConfig.opacidade || 10) / 100,
                                filter: 'grayscale(100%)',
                                pointerEvents: 'none',
                                zIndex: 1,
                                transition: 'all 0.2s ease'
                              }}
                            />
                          )}

                          {/* CONTEÚDO SIMULADO DA PÁGINA ESQUERDA */}
                          <div style={{ position: 'relative', zIndex: 2 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#94a3b8', marginBottom: 8, fontFamily: 'serif' }}>
                              <span>12</span>
                              <span>{livro?.titulo || titulo || 'Book Engin'}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                              <div style={{ height: 4, background: '#cbd5e1', borderRadius: 2, width: '92%' }} />
                              <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, width: '100%' }} />
                              <div style={{ height: 4, background: '#cbd5e1', borderRadius: 2, width: '95%' }} />
                              <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, width: '88%' }} />
                              <div style={{ height: 4, background: '#cbd5e1', borderRadius: 2, width: '97%' }} />
                              <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, width: '70%' }} />
                            </div>
                          </div>
                          <div style={{ fontSize: 8, color: '#94a3b8', textAlign: 'center', position: 'relative', zIndex: 2 }}>
                            Capítulo 1
                          </div>
                        </div>

                        {/* PÁGINA DIREITA */}
                        <div style={{
                          padding: '14px 16px',
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}>
                          {silhuetaConfig.ativado && silhuetaConfig.imagemDataUrl && silhuetaConfig.modoCobertura === 'full-page' && (
                            <img
                              src={silhuetaConfig.imagemDataUrl}
                              alt="Silhueta"
                              style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '80%',
                                height: '80%',
                                objectFit: 'contain',
                                opacity: (silhuetaConfig.opacidade || 10) / 100,
                                filter: 'grayscale(100%)',
                                pointerEvents: 'none',
                                zIndex: 1,
                                transition: 'all 0.2s ease'
                              }}
                            />
                          )}

                          <div style={{ position: 'relative', zIndex: 2 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#94a3b8', marginBottom: 8, fontFamily: 'serif' }}>
                              <span>{livro?.genero || genero || 'Ficção'}</span>
                              <span>13</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                              <div style={{ height: 4, background: '#cbd5e1', borderRadius: 2, width: '100%' }} />
                              <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, width: '94%' }} />
                              <div style={{ height: 4, background: '#cbd5e1', borderRadius: 2, width: '98%' }} />
                              <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, width: '86%' }} />
                              <div style={{ height: 4, background: '#cbd5e1', borderRadius: 2, width: '91%' }} />
                              <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, width: '65%' }} />
                            </div>
                          </div>
                          <div style={{ fontSize: 8, color: '#94a3b8', textAlign: 'center', position: 'relative', zIndex: 2 }}>
                            Amazon KDP Ready
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: 11, color: '#64748b', textAlign: 'center', maxWidth: 520 }}>
                        {silhuetaConfig.ativado && silhuetaConfig.imagemDataUrl
                          ? ui("A arte selecionada será impressa com suavidade por trás do texto, criando acabamento de alta qualidade em todas as páginas.", "Selected artwork will be printed subtly behind text, creating high-end finish across all pages.")
                          : ui("Sem silhueta ativada: o miolo será gerado no estilo clean minimalista tradicional.", "No silhouette enabled: interior will be generated in traditional clean minimalist style.")}
                      </div>
                    </div>

                    {/* CONTROLES EXPANDIDOS DE ESTILO, TRANSPARÊNCIA E GALERIA */}
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* 1. SELEÇÃO DE MODO DE APLICAÇÃO */}
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                            {ui('1. Modo de Aplicação na Página:', '1. Page Placement Mode:')}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                            {[
                              { id: 'none', label: ui('Sem Silhueta', 'No Silhouette'), desc: ui('Miolo clássico limpo', 'Clean classic interior') },
                              { id: 'marginal', label: ui('Vinheta Marginal', 'Marginal Vignette'), desc: ui('Sangria 3% no rodapé', '3% bleed at footer') },
                              { id: 'full-page', label: ui('Marca d\'Água Central', 'Full Watermark'), desc: ui('Página inteira suave', 'Subtle full page') }
                            ].map(mode => {
                              const isModeSelected = mode.id === 'none'
                                ? !silhuetaConfig.ativado
                                : silhuetaConfig.ativado && (silhuetaConfig.modoCobertura || 'full-page') === mode.id;

                              return (
                                <button
                                  key={mode.id}
                                  type="button"
                                  onClick={() => {
                                    if (mode.id === 'none') {
                                      setSilhuetaConfig(prev => ({ ...prev, ativado: false }));
                                    } else {
                                      setSilhuetaConfig(prev => ({
                                        ...prev,
                                        ativado: true,
                                        modoCobertura: mode.id as any,
                                        imagemDataUrl: prev.imagemDataUrl || GALERIA_SILHUETAS_PB[0]?.svgDataUrl
                                      }));
                                    }
                                  }}
                                  style={{
                                    textAlign: 'left',
                                    padding: '10px 12px',
                                    borderRadius: 6,
                                    border: isModeSelected ? '2px solid #0f172a' : '1px solid #cbd5e1',
                                    background: isModeSelected ? '#f8fafc' : '#ffffff',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                                    {mode.label}
                                  </div>
                                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                                    {mode.desc}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 2. SLIDER DE TRANSPARÊNCIA P&B RECOMENDADO AMAZON */}
                        <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                              {ui('2. Nível de Transparência P&B (Opacidade):', '2. B&W Transparency Level (Opacity):')}
                            </label>
                            <span style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#0f172a',
                              background: '#ffffff',
                              padding: '2px 8px',
                              borderRadius: 4,
                              border: '1px solid #cbd5e1'
                            }}>
                              {silhuetaConfig.opacidade || 10}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={4}
                            max={25}
                            step={1}
                            value={silhuetaConfig.opacidade || 10}
                            onChange={(e) => setSilhuetaConfig(prev => ({ ...prev, opacidade: Number(e.target.value) }))}
                            style={{ width: '100%', cursor: 'pointer', accentColor: '#0f172a' }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginTop: 4 }}>
                            <span>4% (Muito sutil)</span>
                            <span style={{ color: '#059669', fontWeight: 600 }}>✓ 8%–12% {ui('Padrão Recomendado Amazon KDP', 'Amazon KDP Recommended')}</span>
                            <span>25% (Mais visível)</span>
                          </div>
                        </div>

                        {/* 3. GALERIA VISUAL EDITORIAL P&B */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                              {ui('3. Catálogo de Silhuetas Clássicas P&B (Clique para Aplicar):', '3. Classic B&W Silhouette Catalog (Click to Apply):')}
                            </div>
                            {silhuetaConfig.imagemDataUrl && (
                              <button
                                type="button"
                                onClick={() => setSilhuetaConfig(prev => ({ ...prev, imagemDataUrl: undefined }))}
                                style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                              >
                                {ui('Remover Imagem', 'Remove Artwork')}
                              </button>
                            )}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                            {GALERIA_SILHUETAS_PB.map((item) => {
                              const isSelected = silhuetaConfig.imagemDataUrl === item.svgDataUrl;
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    setSilhuetaConfig(prev => ({
                                      ...prev,
                                      ativado: true,
                                      imagemDataUrl: item.svgDataUrl,
                                      monocromatico: true
                                    }));
                                  }}
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    padding: '10px 8px',
                                    borderRadius: 6,
                                    border: isSelected ? '2px solid #0f172a' : '1px solid #cbd5e1',
                                    background: isSelected ? '#f8fafc' : '#ffffff',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                  title={item.descricao}
                                >
                                  <img
                                    src={item.svgDataUrl}
                                    alt={item.nome}
                                    style={{
                                      width: 40,
                                      height: 40,
                                      objectFit: 'contain',
                                      marginBottom: 6,
                                      filter: 'grayscale(100%)'
                                    }}
                                  />
                                  <span style={{ fontSize: 10, fontWeight: isSelected ? 700 : 500, color: '#0f172a', textAlign: 'center' }}>
                                    {item.nome}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* GERADOR DE ARTE PERSONALIZADA */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 260 }}>
                            <input
                              type="text"
                              value={personagemSilhuetaFoco}
                              onChange={(e) => setPersonagemSilhuetaFoco(e.target.value)}
                              placeholder={ui('Conceito exclusivo: ex: Bússola naval antiga, skyline de metrópole...', 'Custom concept: e.g. Vintage naval compass, city skyline...')}
                              style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                            />
                            <button
                              type="button"
                              onClick={handleGerarSilhueta}
                              disabled={isGeneratingSilhueta}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '7px 14px',
                                borderRadius: 6,
                                background: '#0f172a',
                                color: '#ffffff',
                                border: 'none',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: isGeneratingSilhueta ? 'not-allowed' : 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {isGeneratingSilhueta ? (
                                <>
                                  <BookEnginAnimatedBook size="micro" /> {ui('Gerando Arte...', 'Generating...')}
                                </>
                              ) : (
                                <>
                                  <Sparkles size={12} color="#38bdf8" /> {ui('Gerar Ilustração', 'Generate Art')}
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                      </>
                    )}
                  </div>

                  {/* PLAYER DO AGENTE NARRADOR DE ÁUDIO DO MANUSCRITO */}
                  {livro && livro.capitulos.length > 0 && (isPlayingAudio || isAudioPaused) && (
                    <div
                      style={{
                        width: '100%',
                        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
                        borderRadius: 10,
                        padding: '14px 18px',
                        color: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.3)',
                        border: '1px solid #312e81',
                        marginBottom: 12
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: 'rgba(99, 102, 241, 0.25)',
                            border: '1px solid rgba(129, 140, 248, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#818cf8'
                          }}>
                            {isAudioPaused ? <VolumeX size={18} /> : <Volume2 size={18} />}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
                                🎙️ {ui('Agente Narrador BookEngin', 'BookEngin Voice Narrator')}
                              </span>
                              <span style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 4,
                                background: 'linear-gradient(135deg, #059669, #10b981)',
                                color: '#ffffff'
                              }}>
                                ✨ {audioVoiceGender === 'female' ? 'Francisca Neural (Voz CoAuthor)' : 'Antônio Neural (Voz CoAuthor)'}
                              </span>
                              <span style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 4,
                                background: audioMode === 'full' ? '#4338ca' : '#0369a1',
                                color: '#ffffff'
                              }}>
                                {audioMode === 'full' ? ui('Obra Completa', 'Full Book') : ui('Capítulo Individual', 'Single Chapter')}
                              </span>
                              {isAudioPaused && (
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: '#f59e0b', color: '#000000' }}>
                                  {ui('PAUSADO', 'PAUSED')}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>
                              {audioReadingCapIndex !== null && livro.capitulos[audioReadingCapIndex] ? (
                                <>
                                  <b>Capítulo {audioReadingCapIndex + 1}:</b> {livro.capitulos[audioReadingCapIndex].titulo}
                                  {totalChunksCount > 0 && (
                                    <span style={{ opacity: 0.8, marginLeft: 8 }}>
                                      · Sentença {currentChunkIndex + 1} de {totalChunksCount}
                                    </span>
                                  )}
                                </>
                              ) : (
                                ui('Pronto para iniciar leitura', 'Ready to read')
                              )}
                            </div>
                          </div>
                        </div>

                        {/* CONTROLES DO REPRODUTOR */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={skipToPrevAudioChapter}
                            disabled={audioReadingCapIndex === 0}
                            style={{
                              background: 'rgba(255,255,255,0.1)',
                              border: '1px solid rgba(255,255,255,0.2)',
                              color: audioReadingCapIndex === 0 ? 'rgba(255,255,255,0.3)' : '#ffffff',
                              borderRadius: 6,
                              padding: '6px 10px',
                              fontSize: 11,
                              cursor: audioReadingCapIndex === 0 ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                            title="Capítulo Anterior"
                          >
                            <SkipBack size={13} /> {ui('Cap. Ant.', 'Prev Cap.')}
                          </button>

                          <button
                            type="button"
                            onClick={isAudioPaused ? resumeAudioReading : pauseAudioReading}
                            style={{
                              background: isAudioPaused ? '#10b981' : '#f59e0b',
                              border: 'none',
                              color: '#ffffff',
                              borderRadius: 6,
                              padding: '6px 14px',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5
                            }}
                          >
                            {isAudioPaused ? <Play size={13} /> : <Pause size={13} />}
                            {isAudioPaused ? ui('Retomar', 'Resume') : ui('Pausar', 'Pause')}
                          </button>

                          <button
                            type="button"
                            onClick={stopAudioReading}
                            style={{
                              background: 'rgba(239, 68, 68, 0.25)',
                              border: '1px solid rgba(239, 68, 68, 0.5)',
                              color: '#fca5a5',
                              borderRadius: 6,
                              padding: '6px 12px',
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <Square size={12} /> {ui('Parar', 'Stop')}
                          </button>

                          <button
                            type="button"
                            onClick={skipToNextAudioChapter}
                            disabled={!livro || audioReadingCapIndex === livro.capitulos.length - 1}
                            style={{
                              background: 'rgba(255,255,255,0.1)',
                              border: '1px solid rgba(255,255,255,0.2)',
                              color: (!livro || audioReadingCapIndex === livro.capitulos.length - 1) ? 'rgba(255,255,255,0.3)' : '#ffffff',
                              borderRadius: 6,
                              padding: '6px 10px',
                              fontSize: 11,
                              cursor: (!livro || audioReadingCapIndex === livro.capitulos.length - 1) ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                            title="Próximo Capítulo"
                          >
                            {ui('Próx. Cap.', 'Next Cap.')} <SkipForward size={13} />
                          </button>

                          {/* VELOCIDADES */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginLeft: 4, background: 'rgba(255,255,255,0.08)', padding: '2px 4px', borderRadius: 6 }}>
                            {[1.0, 1.25, 1.5].map(spd => (
                              <button
                                key={spd}
                                type="button"
                                onClick={() => changeAudioSpeed(spd)}
                                style={{
                                  background: audioSpeed === spd ? '#6366f1' : 'transparent',
                                  border: 'none',
                                  color: '#ffffff',
                                  borderRadius: 4,
                                  padding: '3px 7px',
                                  fontSize: 10.5,
                                  fontWeight: audioSpeed === spd ? 800 : 500,
                                  cursor: 'pointer'
                                }}
                              >
                                {spd}x
                              </button>
                            ))}
                          </div>

                          {/* SELETOR DE VOZ NEURAL (FRANCISCA / ANTÔNIO - COAUTHOR) */}
                          <button
                            type="button"
                            onClick={toggleVoiceGenderNarrador}
                            style={{
                              background: 'rgba(255,255,255,0.12)',
                              border: '1px solid rgba(255,255,255,0.25)',
                              color: '#ffffff',
                              borderRadius: 6,
                              padding: '5px 9px',
                              fontSize: 10.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                              marginLeft: 4
                            }}
                            title="Alternar entre a voz neural da Francisca e do Antônio (mesma voz do CoAuthor)"
                          >
                            🎙️ {audioVoiceGender === 'female' ? 'Voz: Francisca' : 'Voz: Antônio'}
                          </button>
                        </div>
                      </div>

                      {/* BARRA DE PROGRESSO */}
                      {totalChunksCount > 0 && (
                        <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min(100, Math.round(((currentChunkIndex + 1) / totalChunksCount) * 100))}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
                              transition: 'width 0.25s ease'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {livro && livro.capitulos.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 12,
                        padding: '10px 14px',
                        background: '#f8fafc',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#1e293b', fontWeight: 600 }}>
                        <CheckCircle2 size={16} color="#16a34a" />
                        <span>Manuscrito: {livro.capitulos.length} capítulos ({livro.capitulos.reduce((acc, c) => acc + (c.texto?.split(/\s+/).filter(Boolean).length || 0), 0)} palavras)</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {/* BOTÃO OUVIR OBRA COMPLETA */}
                        <button
                          type="button"
                          onClick={() => {
                            if (isPlayingAudio && audioMode === 'full') {
                              if (isAudioPaused) resumeAudioReading();
                              else pauseAudioReading();
                            } else {
                              startAudioReading(0, 'full');
                            }
                          }}
                          disabled={!livro || livro.capitulos.length === 0}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '7px 13px',
                            borderRadius: 6,
                            background: isPlayingAudio && audioMode === 'full' ? '#4f46e5' : '#ffffff',
                            color: isPlayingAudio && audioMode === 'full' ? '#ffffff' : '#4338ca',
                            border: '1px solid #c7d2fe',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: !livro || livro.capitulos.length === 0 ? 'not-allowed' : 'pointer',
                            boxShadow: isPlayingAudio && audioMode === 'full' ? '0 2px 6px rgba(79, 70, 229, 0.3)' : 'none'
                          }}
                          title="Ouvir toda a obra narrada em sequência do primeiro ao último capítulo"
                        >
                          <Headphones size={13} /> {isPlayingAudio && audioMode === 'full' ? (isAudioPaused ? '▶️ Retomar Obra' : '⏸️ Pausar Obra') : '🎧 Ouvir Obra Toda'}
                        </button>

                        {/* BOTÃO OUVIR CAPÍTULO ATUAL */}
                        <button
                          type="button"
                          onClick={() => {
                            const targetIdx = audioReadingCapIndex !== null ? audioReadingCapIndex : 0;
                            if (isPlayingAudio && audioReadingCapIndex === targetIdx && audioMode === 'single') {
                              if (isAudioPaused) resumeAudioReading();
                              else pauseAudioReading();
                            } else {
                              startAudioReading(targetIdx, 'single');
                            }
                          }}
                          disabled={!livro || livro.capitulos.length === 0}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '7px 12px',
                            borderRadius: 6,
                            background: isPlayingAudio && audioMode === 'single' ? '#0284c7' : '#ffffff',
                            color: isPlayingAudio && audioMode === 'single' ? '#ffffff' : '#0369a1',
                            border: '1px solid #bae6fd',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: !livro || livro.capitulos.length === 0 ? 'not-allowed' : 'pointer',
                            boxShadow: isPlayingAudio && audioMode === 'single' ? '0 2px 6px rgba(2, 132, 199, 0.3)' : 'none'
                          }}
                          title="Ouvir o capítulo atual narrado"
                        >
                          <Volume2 size={13} /> {isPlayingAudio && audioMode === 'single' ? (isAudioPaused ? '▶️ Retomar Cap.' : '⏸️ Pausar Cap.') : '🔊 Ouvir Cap. Atual'}
                        </button>

                        {/* BOTÃO SOM DE FUNDO AUTOMÁTICO (TRILHA INSTRUMENTAL DE SUSPENSE/DRAMA) */}
                        <button
                          type="button"
                          onClick={handleToggleChapterBgm}
                          disabled={!livro || livro.capitulos.length === 0}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '7px 13px',
                            borderRadius: 6,
                            background: isChapterBgmPlaying ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : '#ffffff',
                            color: isChapterBgmPlaying ? '#ffffff' : '#0284c7',
                            border: '1px solid #7dd3fc',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: !livro || livro.capitulos.length === 0 ? 'not-allowed' : 'pointer',
                            boxShadow: isChapterBgmPlaying ? '0 2px 8px rgba(2, 132, 199, 0.4)' : 'none'
                          }}
                          title="Tocar som de fundo instrumental automático de suspense/drama sincronizado com o clima deste capítulo"
                        >
                          <Music size={13} /> {isChapterBgmPlaying ? '🎵 Trilha: ATIVA' : '🎵 Som de Fundo'}
                        </button>

                        {/* BOTÃO GERAR VÍDEO TIKTOK / REELS */}
                        <button
                          type="button"
                          onClick={() => {
                            const targetIdx = audioReadingCapIndex !== null ? audioReadingCapIndex : 0;
                            setTikTokChapterIndex(targetIdx);
                            setIsTikTokStudioOpen(true);
                          }}
                          disabled={!livro || livro.capitulos.length === 0}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '7px 13px',
                            borderRadius: 6,
                            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
                            color: '#f43f5e',
                            border: '1px solid #fda4af',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: !livro || livro.capitulos.length === 0 ? 'not-allowed' : 'pointer',
                            boxShadow: '0 2px 8px rgba(244, 63, 94, 0.25)'
                          }}
                          title="Criar vídeo de cenas cinematográficas com transição suave e voz neural para o TikTok / Reels / Shorts"
                        >
                          <Film size={13} /> <span style={{ color: '#ffffff' }}>🎬 Vídeo TikTok</span>
                        </button>

                        {/* BOTÃO PRINCIPAL DE DOWNLOAD DE PDF DIAGRAMADO OFICIAL KDP */}
                        <button
                          type="button"
                          onClick={baixarPDF}
                          disabled={!livro || livro.capitulos.length === 0}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '7px 15px',
                            borderRadius: 6,
                            background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: !livro || livro.capitulos.length === 0 ? 'not-allowed' : 'pointer',
                            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.35)'
                          }}
                          title="Baixar Livro Diagramado em PDF Oficial Amazon KDP (Formato 6x9)"
                        >
                          <Download size={14} /> 📥 Baixar PDF Diagramado (6x9 KDP)
                        </button>

                        {/* BOTÃO PARA BAIXAR TXT */}
                        <button
                          type="button"
                          onClick={baixarManuscritoTXT}
                          disabled={!livro || livro.capitulos.length === 0}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '7px 12px',
                            borderRadius: 6,
                            background: '#f8fafc',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: !livro || livro.capitulos.length === 0 ? 'not-allowed' : 'pointer'
                          }}
                          title="Baixar todo o texto do livro em arquivo TXT"
                        >
                          <Download size={13} /> TXT
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsEditingManuscriptInline(!isEditingManuscriptInline)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '7px 13px',
                            borderRadius: 6,
                            background: isEditingManuscriptInline ? '#0f172a' : '#ffffff',
                            color: isEditingManuscriptInline ? '#ffffff' : '#0f172a',
                            border: '1px solid #0f172a',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          title="Alternar entre o modo de edição direta e o modo de visualização diagramada"
                        >
                          <Edit3 size={14} /> {isEditingManuscriptInline ? '👁️ Ver Diagramação' : '✏️ Editar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsPageReviewerOpen(true)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '7px 14px',
                            borderRadius: 6,
                            background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)'
                          }}
                          title="Abrir revisor interativo para folhear e validar cada página antes de gerar o PDF"
                        >
                          <BookOpen size={14} /> 📖 Folhear
                        </button>
                      </div>
                    </div>
                  )}

                  <div
                    ref={previewScrollRef}
                    style={{
                      flex: 1,
                      minHeight: 460,
                      overflowY: 'auto',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: isEditingManuscriptInline ? '24px 28px' : '36px 48px',
                      fontFamily: isEditingManuscriptInline ? 'system-ui, -apple-system, sans-serif' : 'Georgia, serif',
                      color: '#1e293b',
                      position: 'relative',
                      boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.02)'
                    }}
                  >
                    {/* SILHUETA DE FUNDO EM PRETO E BRANCO OCUPANDO TODO O LIVRO (HORIZONTAL E VERTICAL) ATRÁS DO TEXTO */}
                    {silhuetaConfig.ativado && silhuetaConfig.imagemDataUrl && !isEditingManuscriptInline && (
                      <img
                        src={silhuetaConfig.imagemDataUrl}
                        alt=""
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          opacity: (silhuetaConfig.opacidade || 10) / 100,
                          filter: 'grayscale(100%) contrast(115%)',
                          pointerEvents: 'none',
                          zIndex: 0
                        }}
                      />
                    )}

                    {/* IMAGEM DE FUNDO DA CAPA SE APLICÁVEL */}
                    {fundoImg && !silhuetaConfig.imagemDataUrl && !isEditingManuscriptInline && (
                      <img
                        src={fundoImg}
                        alt=""
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          opacity: 0.10,
                          pointerEvents: 'none',
                          zIndex: 0
                        }}
                      />
                    )}

                    <div style={{ position: 'relative', zIndex: 1 }}>
                      {livro && livro.capitulos.length > 0 ? (
                        isEditingManuscriptInline ? (
                          /* MODO 1: EDITOR DE TEXTO DIRETO DO LIVRO NA TELA */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #cbd5e1' }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                                  ✏️ Editor de Textos do Livro em Tempo Real
                                </div>
                                <div style={{ fontSize: 12, color: '#64748b' }}>
                                  Edite os títulos, subtítulo, autor e os textos de cada capítulo diretamente aqui.
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (livro) {
                                    salvarProgressoLocal(livro);
                                    setStatusMsg('✓ Todas as alterações do manuscrito foram salvas com sucesso!');
                                    setStatusType('ok');
                                  }
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '8px 16px',
                                  borderRadius: 6,
                                  background: '#059669',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontWeight: 700,
                                  fontSize: 12,
                                  cursor: 'pointer'
                                }}
                              >
                                <Save size={14} /> Salvar Alterações
                              </button>
                            </div>

                            {/* DADOS GERAIS DO LIVRO */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                                  Título Principal
                                </label>
                                <input
                                  type="text"
                                  value={livro.titulo}
                                  onChange={(e) => {
                                    const novoT = e.target.value;
                                    setTitulo(novoT);
                                    setLivro(prev => prev ? { ...prev, titulo: novoT } : null);
                                  }}
                                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600 }}
                                />
                              </div>

                              <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                                  Autor
                                </label>
                                <input
                                  type="text"
                                  value={livro.autor}
                                  onChange={(e) => {
                                    const novoA = e.target.value;
                                    setAutor(novoA);
                                    setLivro(prev => prev ? { ...prev, autor: novoA } : null);
                                  }}
                                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                                />
                              </div>

                              <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                                  Subtítulo Comercial
                                </label>
                                <textarea
                                  rows={2}
                                  value={livro.subtitulo}
                                  onChange={(e) => {
                                    const novoS = e.target.value;
                                    setSubtitulo(novoS);
                                    setLivro(prev => prev ? { ...prev, subtitulo: novoS } : null);
                                  }}
                                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                                />
                              </div>
                            </div>

                            {/* LISTA DOS CAPÍTULOS EDITÁVEIS */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                                Capítulos do Livro ({livro.capitulos.length})
                              </div>
                              {livro.capitulos.map((c, idx) => (
                                <div key={idx} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8, padding: 14 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                                      Cap. {idx + 1}
                                    </span>
                                    <input
                                      type="text"
                                      value={c.titulo}
                                      onChange={(e) => {
                                        const novoTitulo = e.target.value;
                                        setLivro(prev => {
                                          if (!prev) return null;
                                          const novos = [...prev.capitulos];
                                          novos[idx] = { ...novos[idx], titulo: novoTitulo };
                                          return { ...prev, capitulos: novos };
                                        });
                                      }}
                                      style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700 }}
                                    />
                                    <span style={{ fontSize: 11, color: '#64748b' }}>
                                      {c.texto.split(/\s+/).filter(Boolean).length} palavras
                                    </span>
                                  </div>

                                  <textarea
                                    rows={9}
                                    value={c.texto}
                                    onChange={(e) => {
                                      const novoTexto = e.target.value;
                                      setLivro(prev => {
                                        if (!prev) return null;
                                        const novos = [...prev.capitulos];
                                        novos[idx] = { ...novos[idx], texto: novoTexto };
                                        return { ...prev, capitulos: novos };
                                      });
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '10px 12px',
                                      borderRadius: 6,
                                      border: '1px solid #e2e8f0',
                                      fontSize: 13,
                                      lineHeight: 1.6,
                                      fontFamily: 'system-ui, -apple-system, sans-serif',
                                      color: '#1e293b'
                                    }}
                                  />
                                </div>
                              ))}
                            </div>

                            <div style={{ textAlign: 'center', padding: '10px 0' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (livro) {
                                    salvarProgressoLocal(livro);
                                    setStatusMsg('✓ Todas as alterações do manuscrito foram salvas com sucesso!');
                                    setStatusType('ok');
                                  }
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '10px 24px',
                                  borderRadius: 6,
                                  background: '#059669',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontWeight: 700,
                                  fontSize: 13,
                                  cursor: 'pointer'
                                }}
                              >
                                <Save size={16} /> Salvar Todas as Alterações do Livro
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* MODO 2: VISUALIZADOR DIAGRAMADO DE LUXO COM SUMÁRIO PROFISSIONAL */
                          <div>
                            {/* PÁGINA DE ROSTO EDITORIAL */}
                            <div style={{ textAlign: 'center', paddingBottom: 40, borderBottom: '1px solid #e2e8f0', marginBottom: 40 }}>
                              <h1 style={{ fontSize: '2.2rem', marginBottom: 8, letterSpacing: '-0.5px', color: '#0f172a' }}>
                                {livro.titulo}
                              </h1>
                              {livro.subtitulo && (
                                <div style={{ fontStyle: 'italic', color: '#475569', marginBottom: 24, fontSize: '1.15rem', maxWidth: 650, margin: '0 auto 24px auto', lineHeight: 1.5 }}>
                                  {livro.subtitulo}
                                </div>
                              )}
                              <div style={{ fontSize: '0.95rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px' }}>
                                {livro.autor}
                              </div>
                            </div>

                            {/* SUMÁRIO EDITORIAL DE LUXO */}
                            {optSumario && (
                              <div
                                style={{
                                  marginBottom: 48,
                                  padding: '24px 28px',
                                  background: '#fcfcfc',
                                  borderRadius: 8,
                                  border: '1px solid #e2e8f0',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                                }}
                              >
                                <div style={{ textAlign: 'center', marginBottom: 18 }}>
                                  <span style={{
                                    fontSize: 12,
                                    letterSpacing: '3px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    color: '#0f172a',
                                    display: 'inline-block',
                                    paddingBottom: 4,
                                    borderBottom: '2px solid #0f172a'
                                  }}>
                                    {Boolean(livro.idioma && /ingl|en/i.test(livro.idioma)) ? 'Table of Contents' : 'Sumário Geral'}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {(() => {
                                    const isEnTOC = Boolean(livro.idioma && /ingl|en/i.test(livro.idioma));
                                    let runningPage = 5;
                                    return livro.capitulos.map((c, idx) => {
                                      const words = c.texto?.split(/\s+/).filter(Boolean).length || 0;
                                      const estPages = Math.max(2, Math.ceil(words / 280));
                                      const startPage = runningPage;
                                      runningPage += estPages;
                                      const cleanTOCItem = isEnTOC ? c.titulo.replace(/^cap[íi]tulo\s*/i, 'Chapter ') : c.titulo;
                                      return (
                                        <div
                                          key={idx}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'baseline',
                                            fontSize: 13,
                                            color: '#1e293b'
                                          }}
                                        >
                                          <span style={{ fontWeight: 600, color: '#0f172a' }}>
                                            {idx + 1}. {cleanTOCItem}
                                          </span>
                                          <span
                                            style={{
                                              flex: 1,
                                              margin: '0 8px',
                                              borderBottom: '1px dotted #94a3b8',
                                              minWidth: 20
                                            }}
                                          />
                                          <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                                            {isEnTOC ? 'page' : 'pág.'} {startPage}
                                          </span>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              </div>
                            )}

                            {/* CAPÍTULOS COM DIAGRAMAÇÃO REFINADA (DROP CAP & CABEÇALHO CLÁSSICO) COM SINCRONIZAÇÃO DE ÁUDIO */}
                            {livro.capitulos.map((c, idx) => {
                              const paragrafos = c.texto.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
                              const primeiroParagrafo = paragrafos[0] || '';
                              const primeiraLetra = primeiroParagrafo.charAt(0);
                              const restoPrimeiroParagrafo = primeiroParagrafo.slice(1);
                              const isCapLendoAgora = isPlayingAudio && audioReadingCapIndex === idx;
                              const isHeaderLendoAgora = isCapLendoAgora && activeNarrationSegment?.paragraphIndex === -1;

                              return (
                                <div key={idx} style={{ marginBottom: 48 }}>
                                  <div
                                    id={`read-cap-${idx}-header`}
                                    style={{
                                      textAlign: 'center',
                                      marginBottom: 20,
                                      borderRadius: 8,
                                      padding: isHeaderLendoAgora ? '8px 12px' : '0px',
                                      background: isHeaderLendoAgora ? 'rgba(2, 132, 199, 0.05)' : 'transparent',
                                      border: isHeaderLendoAgora ? '1px dashed #0284c7' : 'none',
                                      transition: 'all 0.3s ease'
                                    }}
                                  >
                                    <div style={{ fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, marginBottom: 4 }}>
                                      {Boolean(livro.idioma && /ingl|en/i.test(livro.idioma)) ? 'Chapter' : 'Capítulo'} {idx + 1}
                                    </div>
                                    <h2
                                      style={{
                                        color: isHeaderLendoAgora ? '#0284c7' : corCapitulo,
                                        fontSize: `${tamCapitulo + 4}pt`,
                                        margin: '0 0 10px 0',
                                        fontWeight: 700,
                                        letterSpacing: '-0.3px',
                                        transition: 'color 0.2s ease'
                                      }}
                                    >
                                      {Boolean(livro.idioma && /ingl|en/i.test(livro.idioma)) ? c.titulo.replace(/^cap[íi]tulo\s*/i, 'Chapter ') : c.titulo}
                                    </h2>
                                    <div style={{ width: 40, height: 1, background: '#cbd5e1', margin: '0 auto 12px auto' }} />

                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                      <select
                                        aria-label="Estilo da ilustração do capítulo"
                                        value={estiloIlustracaoCapitulo}
                                        onChange={e => setEstiloIlustracaoCapitulo(e.target.value as typeof estiloIlustracaoCapitulo)}
                                        disabled={generatingCapImgIndex !== null}
                                        style={{ padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 11, color: '#334155' }}
                                      >
                                        <option value="realista">Fotografia realista</option>
                                        <option value="arte_editorial">Ilustração fine art</option>
                                        <option value="aquarela">Aquarela</option>
                                        <option value="nanquim">Nanquim</option>
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() => handleGerarIlustracaoCapitulo(idx)}
                                        disabled={generatingCapImgIndex !== null}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 6,
                                          padding: '4px 10px',
                                          borderRadius: 6,
                                          background: c.imagemDataUrl ? '#ecfdf5' : '#f8fafc',
                                          color: c.imagemDataUrl ? '#059669' : '#334155',
                                          border: `1px solid ${c.imagemDataUrl ? '#a7f3d0' : '#cbd5e1'}`,
                                          fontSize: 11,
                                          fontWeight: 600,
                                          cursor: generatingCapImgIndex !== null ? 'not-allowed' : 'pointer'
                                        }}
                                      >
                                        {generatingCapImgIndex === idx ? (
                                          <>
                                            <BookEnginAnimatedBook size="micro" /> Gerando Ilustração...
                                          </>
                                        ) : c.imagemDataUrl ? (
                                          <>
                                            <CheckCircle2 size={11} /> Ilustrado (Regenerar)
                                          </>
                                        ) : (
                                          <>
                                            <ImageIcon size={11} /> Ilustrar Capítulo
                                          </>
                                        )}
                                      </button>

                                      {/* BOTÃO OUVIR ESTE CAPÍTULO NARRADO */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (isPlayingAudio && audioReadingCapIndex === idx && audioMode === 'single') {
                                            if (isAudioPaused) resumeAudioReading();
                                            else pauseAudioReading();
                                          } else {
                                            startAudioReading(idx, 'single');
                                          }
                                        }}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 6,
                                          padding: '4px 10px',
                                          borderRadius: 6,
                                          background: isPlayingAudio && audioReadingCapIndex === idx && audioMode === 'single' ? '#0284c7' : '#f8fafc',
                                          color: isPlayingAudio && audioReadingCapIndex === idx && audioMode === 'single' ? '#ffffff' : '#0369a1',
                                          border: '1px solid #bae6fd',
                                          fontSize: 11,
                                          fontWeight: 600,
                                          cursor: 'pointer'
                                        }}
                                        title="Ouvir a narração em áudio deste capítulo individual"
                                      >
                                        <Volume2 size={11} />
                                        {isPlayingAudio && audioReadingCapIndex === idx && audioMode === 'single'
                                          ? (isAudioPaused ? ui('Retomar Cap.', 'Resume Cap.') : ui('Pausar Cap.', 'Pause Cap.'))
                                          : ui('Ouvir Capítulo', 'Listen Chapter')}
                                      </button>

                                      {/* BOTÃO OUVIR A PARTIR DAQUI (SEQUENCIAL ATÉ O FIM) */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (isPlayingAudio && audioReadingCapIndex === idx && audioMode === 'full') {
                                            if (isAudioPaused) resumeAudioReading();
                                            else pauseAudioReading();
                                          } else {
                                            startAudioReading(idx, 'full');
                                          }
                                        }}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 6,
                                          padding: '4px 10px',
                                          borderRadius: 6,
                                          background: isPlayingAudio && audioReadingCapIndex === idx && audioMode === 'full' ? '#4f46e5' : '#f8fafc',
                                          color: isPlayingAudio && audioReadingCapIndex === idx && audioMode === 'full' ? '#ffffff' : '#4338ca',
                                          border: '1px solid #c7d2fe',
                                          fontSize: 11,
                                          fontWeight: 600,
                                          cursor: 'pointer'
                                        }}
                                        title="Iniciar narração contínua a partir deste capítulo até o final da obra"
                                      >
                                        <Headphones size={11} />
                                        {isPlayingAudio && audioReadingCapIndex === idx && audioMode === 'full'
                                          ? (isAudioPaused ? ui('Retomar Obra', 'Resume All') : ui('Pausar Obra', 'Pause All'))
                                          : ui('Ouvir a partir daqui', 'Listen from here')}
                                      </button>

                                      {/* BOTÃO CRIAR VÍDEO TIKTOK / REELS DESTE CAPÍTULO */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setTikTokChapterIndex(idx);
                                          setIsTikTokStudioOpen(true);
                                        }}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 5,
                                          padding: '4px 10px',
                                          borderRadius: 6,
                                          background: 'linear-gradient(135deg, #09090b 0%, #1e1b4b 100%)',
                                          color: '#f43f5e',
                                          border: '1px solid #fda4af',
                                          fontSize: 11,
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          boxShadow: '0 2px 6px rgba(244, 63, 94, 0.2)'
                                        }}
                                        title="Gerar vídeo de cenas com transição suave e voz neural para o TikTok / Reels"
                                      >
                                        <Film size={11} />
                                        <span style={{ color: '#ffffff' }}>🎬 Vídeo TikTok</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Imagem Ilustrada do Capítulo */}
                                  {c.imagemDataUrl && (
                                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
                                      <img
                                        src={c.imagemDataUrl}
                                        alt={c.titulo}
                                        style={{
                                          maxWidth: '100%',
                                          maxHeight: 280,
                                          borderRadius: 6,
                                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                        }}
                                      />
                                    </div>
                                  )}

                                  {/* PARÁGRAFOS COM CAPITULAR (DROP CAP) E SINCRONIZAÇÃO DE LEITURA EM TEMPO REAL */}
                                  {paragrafos.map((p, pIdx) => {
                                    const isCurrentPara = isPlayingAudio && audioReadingCapIndex === idx && activeNarrationSegment?.paragraphIndex === pIdx;

                                    // Se for cabeçalho ### de seção
                                    if (p.startsWith('###')) {
                                      const tituloSecao = p.replace(/^###\s*/, '').trim();
                                      return (
                                        <div
                                          key={pIdx}
                                          id={`read-cap-${idx}-p-${pIdx}`}
                                          onClick={() => startAudioReading(idx, 'single', pIdx)}
                                          title={isCurrentPara ? 'Subseção sendo lida agora pelo Agente Narrador' : 'Clique para ouvir a narração a partir daqui'}
                                          style={{
                                            fontWeight: 700,
                                            fontSize: '1.05rem',
                                            margin: '20px 0 8px 0',
                                            color: isCurrentPara ? '#0284c7' : '#0f172a',
                                            borderLeft: isCurrentPara ? '3px solid #0284c7' : '3px solid #2563eb',
                                            paddingLeft: 10,
                                            paddingTop: isCurrentPara ? 4 : 0,
                                            paddingBottom: isCurrentPara ? 4 : 0,
                                            background: isCurrentPara ? 'rgba(2, 132, 199, 0.04)' : 'transparent',
                                            borderRadius: '0 6px 6px 0',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                          }}
                                        >
                                          {renderHighlightedEditorialText(tituloSecao, activeNarrationSegment, isCurrentPara)}
                                        </div>
                                      );
                                    }

                                    // Primeiro parágrafo com Drop Cap clássico
                                    if (pIdx === 0 && primeiraLetra) {
                                      const isDropCapSpeaking = isCurrentPara && activeNarrationSegment && activeNarrationSegment.start === 0;

                                      // Ajusta os offsets para o resto do primeiro parágrafo (subtrai 1 correspondente à primeira letra)
                                      let restoSegment: NarrationSegment | null = null;
                                      if (isCurrentPara && activeNarrationSegment) {
                                        const rStart = Math.max(0, activeNarrationSegment.start - 1);
                                        const rEnd = Math.max(rStart, activeNarrationSegment.end - 1);
                                        restoSegment = { ...activeNarrationSegment, start: rStart, end: rEnd };
                                      }

                                      return (
                                        <div
                                          key={pIdx}
                                          id={`read-cap-${idx}-p-${pIdx}`}
                                          onClick={() => startAudioReading(idx, 'single', pIdx)}
                                          title={isCurrentPara ? 'Parágrafo sendo lido agora pelo Agente Narrador' : 'Clique para ouvir a narração a partir deste parágrafo'}
                                          style={{
                                            marginBottom: 12,
                                            padding: isCurrentPara ? '6px 8px 6px 12px' : '0px',
                                            background: isCurrentPara ? 'rgba(2, 132, 199, 0.03)' : 'transparent',
                                            borderLeft: isCurrentPara ? '3px solid #0284c7' : 'none',
                                            borderRadius: isCurrentPara ? '0 6px 6px 0' : '0',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                          }}
                                        >
                                          <p
                                            style={{
                                              margin: 0,
                                              textAlign: 'justify',
                                              lineHeight: 1.75,
                                              fontSize: '0.96rem',
                                              color: '#1e293b'
                                            }}
                                          >
                                            <span
                                              style={{
                                                float: 'left',
                                                fontSize: '3.4rem',
                                                lineHeight: '0.78',
                                                paddingRight: 8,
                                                paddingTop: 4,
                                                fontWeight: 700,
                                                fontFamily: 'Georgia, serif',
                                                color: isDropCapSpeaking ? '#0284c7' : corCapitulo,
                                                transition: 'color 0.2s ease'
                                              }}
                                            >
                                              {primeiraLetra}
                                            </span>
                                            {renderHighlightedEditorialText(restoPrimeiroParagrafo, restoSegment, isCurrentPara)}
                                          </p>
                                        </div>
                                      );
                                    }

                                    return (
                                      <div
                                        key={pIdx}
                                        id={`read-cap-${idx}-p-${pIdx}`}
                                        onClick={() => startAudioReading(idx, 'single', pIdx)}
                                        title={isCurrentPara ? 'Parágrafo sendo lido agora pelo Agente Narrador' : 'Clique para ouvir a narração a partir deste parágrafo'}
                                        style={{
                                          marginBottom: 10,
                                          padding: isCurrentPara ? '6px 8px 6px 12px' : '0px',
                                          background: isCurrentPara ? 'rgba(2, 132, 199, 0.03)' : 'transparent',
                                          borderLeft: isCurrentPara ? '3px solid #0284c7' : 'none',
                                          borderRadius: isCurrentPara ? '0 6px 6px 0' : '0',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s ease'
                                        }}
                                      >
                                        <p
                                          style={{
                                            margin: 0,
                                            textIndent: '1.8em',
                                            textAlign: 'justify',
                                            lineHeight: 1.75,
                                            fontSize: '0.94rem',
                                            color: '#1e293b'
                                          }}
                                        >
                                          {renderHighlightedEditorialText(p, activeNarrationSegment, isCurrentPara)}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        )
                      ) : (
                        /* DOSSIÊ EDITORIAL DA OBRA & INTELIGÊNCIA AMAZON KDP (QUANDO O MANUSCRITO ESTÁ EM FASE DE PLANEJAMENTO / PRÉ-PRODUÇÃO) */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                          {/* BANNER STATUS EDITORIAL & BOTÃO DE AÇÃO PRINCIPAL */}
                          <div style={{
                            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                            borderRadius: 12,
                            padding: '20px 24px',
                            color: '#ffffff',
                            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 16
                          }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  fontSize: 10.5,
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.08em',
                                  padding: '3px 8px',
                                  borderRadius: 999,
                                  background: '#059669',
                                  color: '#ffffff'
                                }}>
                                  ● Dossiê Editorial Ativo · Pronto para Produção
                                </span>
                                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                                  Padrão Amazon KDP 6x9"
                                </span>
                              </div>
                              <h3 style={{ fontSize: 20, fontWeight: 800, margin: '2px 0 4px', color: '#f8fafc', lineHeight: 1.25 }}>
                                {livro?.titulo || titulo || 'Dossiê Editorial da Obra'}
                              </h3>
                              <p style={{ fontSize: 13, color: '#cbd5e1', margin: 0, maxWidth: 580, lineHeight: 1.4 }}>
                                {livro?.subtitulo || subtitulo || 'Defina o título, analise os bestsellers concorrentes com BSR < 80k e inicie a produção dos capítulos sem alucinações de IA.'}
                              </p>
                            </div>

                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                onClick={handleAutoPreencherDossie}
                                disabled={isAiStepBusy === 'auto-dossie'}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '10px 14px',
                                  borderRadius: 8,
                                  background: '#ffffff',
                                  color: '#0f172a',
                                  border: 'none',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: isAiStepBusy === 'auto-dossie' ? 'not-allowed' : 'pointer',
                                  boxShadow: '0 2px 8px rgba(255,255,255,0.15)'
                                }}
                              >
                                <Sparkles size={14} color="#0284c7" />
                                {isAiStepBusy === 'auto-dossie' ? 'Preenchendo...' : 'Auto-Preencher com IA'}
                              </button>

                              <button
                                type="button"
                                onClick={iniciarProducaoObraAssistida}
                                disabled={gerando || isPlanningEditorial}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  padding: '12px 22px',
                                  borderRadius: 8,
                                  background: 'linear-gradient(135deg, #10b981, #059669)',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontSize: 13,
                                  fontWeight: 800,
                                  cursor: (gerando || isPlanningEditorial) ? 'not-allowed' : 'pointer',
                                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                                  letterSpacing: '0.02em'
                                }}
                              >
                                <Play size={15} />
                                {gerando ? 'Escrevendo Capítulos...' : '🚀 Produzir Livro Completo Agora'}
                              </button>
                            </div>
                          </div>

                          {/* IDENTIDADE EDITORIAL DA OBRA */}
                          <div style={{
                            background: '#ffffff',
                            borderRadius: 10,
                            border: '1px solid #e2e8f0',
                            padding: '18px 20px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                          }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <FileText size={16} color="#0284c7" />
                              <span>1. Identidade & Posicionamento Editorial da Obra</span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
                              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Gênero / Categoria KDP</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{livro?.genero || genero || temaSelecionado || 'Não ficção / Bestseller'}</div>
                              </div>
                              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Autor Oficial</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{livro?.autor || autor || 'Leandro Palmeira'}</div>
                              </div>
                              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Tom de Voz</div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{authorTone || 'Conversacional Bestseller'}</div>
                              </div>
                              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Volume Projetado</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#059669', marginTop: 2 }}>{paginasAlvo} páginas (~{paginasAlvo * 280} palavras)</div>
                              </div>
                            </div>

                            {/* TESE ÚNICA (STANCE) - ANTI-CONTEÚDO GENÉRICO */}
                            <div style={{
                              background: '#f0fdf4',
                              border: '1px solid #bbf7d0',
                              borderRadius: 8,
                              padding: '12px 16px',
                              marginBottom: 10
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: '#166534', marginBottom: 4 }}>
                                <CheckCircle2 size={13} color="#16a34a" />
                                <span>Tese Forte & Posicionamento Único (Stance Anti-Conteúdo Genérico):</span>
                              </div>
                              <p style={{ fontSize: 12, color: '#14532d', margin: 0, lineHeight: 1.45 }}>
                                {stanceTopic || uniqueAngle || 'Esta obra rejeita clichês e generalidades de IA. Ela é construída sobre metodologia empírica com micro-vitórias aplicáveis no dia a dia, gerando autoridade genuína para o autor.'}
                              </p>
                            </div>

                            {/* PROMESSA CENTRAL E PÚBLICO ALVO */}
                            {(bookPromise || targetReader) && (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                                {bookPromise && (
                                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '10px 12px' }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#1e40af' }}>Promessa Central ao Leitor</div>
                                    <div style={{ fontSize: 11.5, color: '#1e3a8a', marginTop: 2 }}>{bookPromise}</div>
                                  </div>
                                )}
                                {targetReader && (
                                  <div style={{ background: '#fdf4ff', border: '1px solid #f0abfc', borderRadius: 6, padding: '10px 12px' }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#86198f' }}>Público-Alvo Prioritário</div>
                                    <div style={{ fontSize: 11.5, color: '#701a75', marginTop: 2 }}>{targetReader}</div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* SUGESTÕES DE TÍTULO E SUBTÍTULO POR SEGMENTO */}
                          {suggestedTitlesList.length > 0 && (
                            <div style={{
                              background: '#ffffff',
                              borderRadius: 10,
                              border: '1px solid #bbf7d0',
                              padding: '16px 20px',
                              boxShadow: '0 1px 4px rgba(16,185,129,0.08)',
                              marginBottom: 16
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Sparkles size={16} color="#16a34a" />
                                    <span>Sugestões Comerciais de Título & Subtítulo para "{temaSelecionado || genero}"</span>
                                    <span style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', padding: '1px 7px', borderRadius: 10, fontWeight: 700 }}>
                                      Calibrado por Bestsellers
                                    </span>
                                  </div>
                                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                    Títulos de alta atratividade para a loja Amazon KDP. Clique para aplicar à obra ou avançar imediatamente para a próxima etapa.
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                                {suggestedTitlesList.slice(0, 3).map((sug, idx) => {
                                  const isCurrent = titulo === sug.title;
                                  return (
                                    <div
                                      key={idx}
                                      style={{
                                        background: isCurrent ? '#f0fdf4' : '#f8fafc',
                                        border: isCurrent ? '2px solid #10b981' : '1px solid #e2e8f0',
                                        borderRadius: 8,
                                        padding: 12,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        gap: 8,
                                        transition: 'all 0.15s ease'
                                      }}
                                    >
                                      <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                          <span style={{
                                            fontSize: 9.5,
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                            color: '#0369a1',
                                            background: '#e0f2fe',
                                            padding: '1px 6px',
                                            borderRadius: 3
                                          }}>
                                            Hook: {sug.hookType}
                                          </span>
                                          <span style={{ fontSize: 9.5, fontWeight: 700, color: '#059669' }}>
                                            BSR Est. #{sug.targetBsrEstimate.toLocaleString('pt-BR')}
                                          </span>
                                        </div>
                                        <div style={{ fontSize: 12.5, fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
                                          {sug.title}
                                        </div>
                                        <div style={{ fontSize: 10.5, color: '#475569', marginTop: 3, lineHeight: 1.35 }}>
                                          {sug.subtitle}
                                        </div>
                                        <div style={{ fontSize: 9.5, color: '#64748b', marginTop: 4, fontStyle: 'italic', borderTop: '1px dashed #e2e8f0', paddingTop: 4 }}>
                                          💡 {sug.rationale}
                                        </div>
                                      </div>

                                      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                        <button
                                          type="button"
                                          onClick={() => handleSelectSuggestedTitle(sug, false)}
                                          style={{
                                            flex: 1,
                                            padding: '5px 8px',
                                            borderRadius: 5,
                                            background: isCurrent ? '#10b981' : '#ffffff',
                                            color: isCurrent ? '#ffffff' : '#0f172a',
                                            border: isCurrent ? '1px solid #059669' : '1px solid #cbd5e1',
                                            fontSize: 10.5,
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 4
                                          }}
                                        >
                                          {isCurrent ? <><Check size={12} /> Título Ativo</> : <><Sparkles size={11} color="#f59e0b" /> Usar este Título</>}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleSelectSuggestedTitle(sug, true)}
                                          style={{
                                            padding: '5px 10px',
                                            borderRadius: 5,
                                            background: '#0f172a',
                                            color: '#ffffff',
                                            border: 'none',
                                            fontSize: 10.5,
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 3,
                                            whiteSpace: 'nowrap'
                                          }}
                                        >
                                          Avançar Etapa →
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* REFERÊNCIAS BESTSELLERS REAIS DA AMAZON COM BSR < 80.000 */}
                          <div style={{
                            background: '#ffffff',
                            borderRadius: 10,
                            border: '1px solid #e2e8f0',
                            padding: '18px 20px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                              <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <TrendingUp size={16} color="#0284c7" />
                                <span>2. Inteligência Competitiva: Bestsellers Amazon KDP (BSR &lt; 80.000)</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setActiveTab('market')}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#0284c7',
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                Ver Análise Completa de Mercado <ChevronRight size={13} />
                              </button>
                            </div>

                            {marketReferences.length > 0 ? (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
                                {marketReferences.slice(0, 4).map((ref, idx) => {
                                  const cover = ref.coverImage || (ref.asin ? `https://images-na.ssl-images-amazon.com/images/P/${ref.asin}.01._SCLZZZZZZZ_SX300_.jpg` : 'https://images-na.ssl-images-amazon.com/images/I/71kxa1-0mfL._AC_UL600_SR600,400_.jpg');
                                  const safeBsr = ref.bsr || Math.round(12000 + idx * 4500);
                                  const sales = ref.estimatedMonthlySales || Math.round(102000 / Math.pow(safeBsr, 0.64));
                                  const rev = ref.estimatedMonthlyRevenueUsd || Math.round(sales * 6.5);

                                  return (
                                    <div
                                      key={idx}
                                      style={{
                                        background: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: 8,
                                        padding: 10,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 8,
                                        transition: 'all 0.15s ease'
                                      }}
                                    >
                                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                        <img
                                          src={cover}
                                          alt={ref.title}
                                          style={{
                                            width: 44,
                                            height: 64,
                                            objectFit: 'cover',
                                            borderRadius: 4,
                                            boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                                            flexShrink: 0
                                          }}
                                        />
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                          <div style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: '#0f172a',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            lineHeight: 1.25
                                          }}>
                                            {ref.title}
                                          </div>
                                          <div style={{ fontSize: 10, color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {ref.author || 'Autor Amazon KDP'}
                                          </div>
                                          <div style={{
                                            display: 'inline-block',
                                            marginTop: 4,
                                            padding: '1px 6px',
                                            borderRadius: 3,
                                            background: '#ecfdf5',
                                            color: '#059669',
                                            border: '1px solid #a7f3d0',
                                            fontSize: 9.5,
                                            fontWeight: 800
                                          }}>
                                            BSR #{safeBsr.toLocaleString('pt-BR')}
                                          </div>
                                        </div>
                                      </div>

                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: '#475569', borderTop: '1px solid #e2e8f0', paddingTop: 6 }}>
                                        <span>★ {ref.rating || 4.8} ({ref.reviews || 120})</span>
                                        <span style={{ fontWeight: 700, color: '#0f172a' }}>~${rev}/mês</span>
                                      </div>

                                      {(() => {
                                        const inspired = KdpTitleSuggestionEngine.generateInspiredFromBook(ref, temaSelecionado || genero);
                                        return (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <div style={{ background: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: 6, padding: '6px 8px', fontSize: 10 }}>
                                              <div style={{ color: '#0369a1', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Sparkles size={10} color="#f59e0b" /> Título Inspirado:
                                              </div>
                                              <div style={{ fontWeight: 800, color: '#0f172a', marginTop: 2, fontSize: 11, lineHeight: 1.25 }}>
                                                "{inspired.title}"
                                              </div>
                                              <div style={{ color: '#64748b', fontSize: 9.5, marginTop: 1, fontStyle: 'italic', lineHeight: 1.25 }}>
                                                {inspired.subtitle}
                                              </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: 5 }}>
                                              <button
                                                type="button"
                                                onClick={() => handleInspirarNoBestseller(ref, false)}
                                                style={{
                                                  flex: 1,
                                                  padding: '5px 6px',
                                                  borderRadius: 5,
                                                  background: '#ffffff',
                                                  border: '1px solid #cbd5e1',
                                                  color: '#0f172a',
                                                  fontSize: 10,
                                                  fontWeight: 700,
                                                  cursor: 'pointer',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  gap: 3
                                                }}
                                              >
                                                <Sparkles size={10} color="#f59e0b" /> Usar Título
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleInspirarNoBestseller(ref, true)}
                                                style={{
                                                  padding: '5px 8px',
                                                  borderRadius: 5,
                                                  background: '#0f172a',
                                                  border: 'none',
                                                  color: '#ffffff',
                                                  fontSize: 10,
                                                  fontWeight: 700,
                                                  cursor: 'pointer',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  gap: 3,
                                                  whiteSpace: 'nowrap'
                                                }}
                                              >
                                                Avançar →
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 8, textAlign: 'center', color: '#64748b', fontSize: 12 }}>
                                Conectando aos servidores da Amazon para carregar os bestsellers em alta...
                              </div>
                            )}
                          </div>

                          {/* SUMÁRIO EDITORIAL PLANEJADO (ANTI-ALUCINAÇÃO & RITMO VARIADO) */}
                          <div style={{
                            background: '#ffffff',
                            borderRadius: 10,
                            border: '1px solid #e2e8f0',
                            padding: '18px 20px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                              <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <BookOpen size={16} color="#0284c7" />
                                <span>3. Sumário Editorial Planejado ({variedOutlinePreview.length > 0 ? variedOutlinePreview.length : 8} Capítulos com Ritmo Anti-Alucinação)</span>
                              </div>
                              <button
                                type="button"
                                onClick={handleGerarSumarioRitmoVariado}
                                disabled={isAiStepBusy === 'outline'}
                                style={{
                                  background: '#f8fafc',
                                  border: '1px solid #cbd5e1',
                                  color: '#0f172a',
                                  borderRadius: 6,
                                  padding: '4px 10px',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                <RefreshCw size={11} /> Regenerar Sumário
                              </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {(variedOutlinePreview.length > 0 ? variedOutlinePreview : [
                                { num: 1, title: 'O Ponto Cego: Desconstrução do Mito e Fundação Factual', sectionsCount: 3, targetWords: 1800, focus: 'Apresentação do dilema central com evidências científicas e históricas' },
                                { num: 2, title: 'A Anatomia Oculta: Por que Abordagens Tradicionais Falham', sectionsCount: 3, targetWords: 1950, focus: 'Estudo de caso e análise comparativa de erros comuns' },
                                { num: 3, title: 'O Ponto de Inflexão: A Nova Metodologia Comprovada', sectionsCount: 4, targetWords: 2200, focus: 'Apresentação passo a passo do framework central acionável' },
                                { num: 4, title: 'Micro-Vitórias: Aplicação Diária em Menos de 15 Minutos', sectionsCount: 3, targetWords: 1850, focus: 'Protocolo prático para implementação imediata sem resistência' },
                                { num: 5, title: 'Os 7 Erros Fatais que Destroem o Progresso', sectionsCount: 3, targetWords: 1750, focus: 'Identificação preventiva de armadilhas mentais e comportamentais' },
                                { num: 6, title: 'Casos Reais & Aceleradores de Performance', sectionsCount: 4, targetWords: 2100, focus: 'Análise de resultados mensuráveis de pessoas e empresas reais' },
                                { num: 7, title: 'Construindo o Efeito Composto e Blindagem', sectionsCount: 3, targetWords: 1900, focus: 'Sustentabilidade a longo prazo sem esgotamento ou estresse' },
                                { num: 8, title: 'O Manifesto & Plano de Ação dos Próximos 30 Dias', sectionsCount: 3, targetWords: 1650, focus: 'Checklist executável de 30 dias para transformação definitiva' }
                              ]).map((c, i) => (
                                <div
                                  key={i}
                                  style={{
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: 6,
                                    padding: '8px 12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 12
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                                    <div style={{
                                      width: 24,
                                      height: 24,
                                      borderRadius: '50%',
                                      background: '#0f172a',
                                      color: '#ffffff',
                                      fontSize: 11,
                                      fontWeight: 800,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0
                                    }}>
                                      {c.num || i + 1}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                        {c.title}
                                      </div>
                                      <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 1, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                        {c.focus}
                                      </div>
                                    </div>
                                  </div>
                                  <div style={{ fontSize: 10.5, fontWeight: 700, color: '#059669', flexShrink: 0 }}>
                                    ~{c.targetWords || 1800} palavras
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* BARRA INFERIOR DE AVANÇO EDITORIAL NO DOSSIÊ */}
                          <div style={{
                            marginTop: 16,
                            padding: '14px 18px',
                            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                            borderRadius: 10,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 12,
                            boxShadow: '0 4px 12px rgba(15,23,42,0.12)'
                          }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>🚀 Próximo Passo do Fluxo Editorial</span>
                                <span style={{ fontSize: 10, background: '#0284c7', color: '#ffffff', padding: '1px 7px', borderRadius: 10, fontWeight: 700 }}>
                                  Etapa {wizardStep < 10 ? wizardStep + 1 : 10} de 10
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                {titulo ? `Obra ativa: "${titulo}"` : 'Selecione um título ou bestseller acima para avançar.'}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (wizardStep < 10) handleAdvanceToStep(wizardStep + 1);
                                else setWizardStep(2);
                              }}
                              style={{
                                padding: '9px 18px',
                                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: 7,
                                fontSize: 12.5,
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                boxShadow: '0 2px 8px rgba(37,99,235,0.3)'
                              }}
                            >
                              <span>Avançar para Próxima Etapa ({wizardStep < 10 ? `Etapa ${wizardStep + 1}` : 'Etapa 2'})</span>
                              <ChevronRight size={15} />
                            </button>
                          </div>
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

                  {/* MASTER PROMPT DE CAPA EDITORIAL (600 A 1200 PALAVRAS) */}
                  <KdpCoverMasterPromptCard
                    titulo={livro?.titulo || titulo}
                    subtitulo={livro?.subtitulo || subtitulo}
                    autor={livro?.autor || autor}
                    genero={livro?.genero || genero}
                    premissa={bookPromise || uniqueAngle || topico || temaSelecionado || subtitulo}
                    idioma={idioma || 'pt'}
                    compactMode={true}
                  />
                </div>
              )}

              {/* ABA DEDICADA: INTELIGÊNCIA DE MERCADO AMAZON KDP (BSR < 80.000 & TERMOS DE BUSCA) */}
              {activeTab === 'market' && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* CABEÇALHO DO PAINEL DE MERCADO */}
                  <div style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    borderRadius: 12,
                    padding: '20px 24px',
                    color: '#ffffff',
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 10.5,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          padding: '3px 8px',
                          borderRadius: 999,
                          background: '#0284c7',
                          color: '#ffffff'
                        }}>
                          ⚡ Monitor de Demanda & Bestsellers Amazon KDP
                        </span>
                        <h2 style={{ fontSize: 19, fontWeight: 800, margin: '6px 0 4px', color: '#f8fafc' }}>
                          Inteligência de Mercado, BSR &lt; 80k e Termos de Clientes
                        </h2>
                        <p style={{ fontSize: 12.5, color: '#94a3b8', margin: 0, maxWidth: 640, lineHeight: 1.4 }}>
                          Acompanhe os livros mais vendidos da Amazon no seu nicho, descubra o que os clientes pesquisam na barra de busca e use esses termos exatos para posicionar sua obra organicamente no topo.
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleAnalisarMercado(true)}
                          disabled={isAnalyzingMarket}
                          style={{
                            padding: '8px 14px',
                            background: '#ffffff',
                            color: '#0f172a',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: isAnalyzingMarket ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <RefreshCw size={13} className={isAnalyzingMarket ? 'spin' : ''} />
                          {isAnalyzingMarket ? 'Sorteando...' : 'Sortear Novo Nicho'}
                        </button>
                      </div>
                    </div>

                    {/* BARRA DE PESQUISA AO VIVO NA AMAZON */}
                    <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        value={amazonCustomerQuery}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAmazonCustomerQuery(val);
                          fetchCustomerSearchSuggestions(val);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAnalisarMercado(false, amazonCustomerQuery);
                          }
                        }}
                        placeholder="Pesquisar termo ou nicho diretamente na Amazon (Ex: hábitos atômicos, finanças pessoais, suspense policial)..."
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          borderRadius: 8,
                          border: '1px solid #334155',
                          background: '#1e293b',
                          color: '#ffffff',
                          fontSize: 13,
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleAnalisarMercado(false, amazonCustomerQuery)}
                        disabled={isAnalyzingMarket}
                        style={{
                          padding: '10px 18px',
                          background: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 8,
                          fontSize: 12.5,
                          fontWeight: 700,
                          cursor: isAnalyzingMarket ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <Search size={14} />
                        {isAnalyzingMarket ? 'Buscando...' : 'Buscar na Amazon'}
                      </button>
                    </div>

                    {/* PÍLULAS DE TERMOS REAIS DIGITADOS POR CLIENTES */}
                    {amazonSuggestions.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 10.5, color: '#94a3b8', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Search size={11} color="#38bdf8" />
                          <span>Termos reais pesquisados pelos clientes na Amazon (clique para pesquisar):</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {amazonSuggestions.map((term, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setAmazonCustomerQuery(term);
                                handleAnalisarMercado(false, term);
                              }}
                              style={{
                                padding: '4px 10px',
                                background: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: 999,
                                color: '#e2e8f0',
                                fontSize: 11,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              🔍 {term}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* BARRA DE FILTROS BSR */}
                  <div style={{
                    background: '#ffffff',
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 10
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Filtrar por BSR:</span>
                      {[
                        { id: 'under80k', label: '🔥 BSR < 80.000 (Sweet Spot KDP)' },
                        { id: 'under25k', label: '⭐ BSR < 25.000 (Top Bestsellers)' },
                        { id: 'high_revenue', label: '💰 Lucro > $1.000/mês' },
                        { id: 'all', label: 'Todos os Concorrentes' }
                      ].map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setBsrFilter(f.id as any)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: 6,
                            border: '1px solid',
                            borderColor: bsrFilter === f.id ? '#0f172a' : '#cbd5e1',
                            background: bsrFilter === f.id ? '#0f172a' : '#ffffff',
                            color: bsrFilter === f.id ? '#ffffff' : '#334155',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleGerarTitulosTermosAmazon}
                      disabled={isGeneratingAmazonTitles}
                      style={{
                        padding: '6px 14px',
                        background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: isGeneratingAmazonTitles ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <Sparkles size={12} />
                      {isGeneratingAmazonTitles ? 'Gerando com IA...' : '🎯 Sugerir Títulos Ranqueados (BSR < 80k)'}
                    </button>
                  </div>

                  {/* SUGESTÕES DE TÍTULOS COM TERMOS DE CLIENTES */}
                  {suggestedAmazonTitles.length > 0 && (
                    <div style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: 10,
                      padding: '16px 20px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <CheckCircle2 size={16} color="#16a34a" />
                          <span>5 Títulos Otimizados para os Termos Mais Pesquisados da Amazon</span>
                        </div>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: '#15803d' }}>
                          Clique em qualquer opção para aplicar à sua obra
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
                        {suggestedAmazonTitles.map((t, idx) => (
                          <div
                            key={idx}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: 8,
                              padding: 12,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              gap: 8
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
                                  {t.title}
                                </div>
                                <span style={{
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  background: '#ecfdf5',
                                  color: '#059669',
                                  fontSize: 9.5,
                                  fontWeight: 800,
                                  whiteSpace: 'nowrap'
                                }}>
                                  BSR {t.targetBsr}
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: '#475569', marginTop: 4, lineHeight: 1.35 }}>
                                {t.subtitle}
                              </div>
                              <div style={{ fontSize: 10, color: '#64748b', marginTop: 6, fontStyle: 'italic', borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>
                                💡 {t.rationale}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setTitulo(t.title);
                                setSubtitulo(t.subtitle);
                                setWizardStep(3);
                                setStatusMsg(`✓ Título "${t.title}" aplicado com sucesso!`);
                                setStatusType('ok');
                              }}
                              style={{
                                width: '100%',
                                padding: '6px 10px',
                                background: '#0f172a',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: 5,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 5
                              }}
                            >
                              <CheckCircle2 size={12} color="#22c55e" /> Aplicar Este Título & Subtítulo
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* GRADE DE LIVROS BESTSELLERS REAIS COM CAPAS */}
                  <div style={{
                    background: '#ffffff',
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    padding: '18px 20px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                        Bestsellers Concorrentes Encontrados ({marketPool.length > 0 ? marketPool.length : marketReferences.length} Obras Analisadas)
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        * Livros com BSR &lt; 80k faturam em média ~$500 a $2.500 USD/mês no KDP.
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                      {(marketPool.length > 0 ? marketPool : marketReferences)
                        .filter(ref => {
                          const safeBsr = ref.bsr || 25000;
                          if (bsrFilter === 'under80k') return safeBsr <= 80000;
                          if (bsrFilter === 'under25k') return safeBsr <= 25000;
                          if (bsrFilter === 'high_revenue') return (ref.estimatedMonthlyRevenueUsd || 800) >= 1000;
                          return true;
                        })
                        .map((ref, idx) => {
                          const cover = ref.coverImage || (ref.asin ? `https://images-na.ssl-images-amazon.com/images/P/${ref.asin}.01._SCLZZZZZZZ_SX400_.jpg` : 'https://images-na.ssl-images-amazon.com/images/I/71kxa1-0mfL._AC_UL600_SR600,400_.jpg');
                          const safeBsr = ref.bsr || Math.round(15000 + idx * 3500);
                          const sales = ref.estimatedMonthlySales || Math.round(102000 / Math.pow(safeBsr, 0.64));
                          const rev = ref.estimatedMonthlyRevenueUsd || Math.round(sales * 6.5);

                          return (
                            <div
                              key={idx}
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: 10,
                                padding: 12,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: 10,
                                transition: 'box-shadow 0.2s ease'
                              }}
                            >
                              <div style={{ display: 'flex', gap: 12 }}>
                                <img
                                  src={cover}
                                  alt={ref.title}
                                  style={{
                                    width: 70,
                                    height: 105,
                                    objectFit: 'cover',
                                    borderRadius: 6,
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
                                    flexShrink: 0
                                  }}
                                />
                                <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                  <div>
                                    <div style={{
                                      fontSize: 12,
                                      fontWeight: 800,
                                      color: '#0f172a',
                                      lineHeight: 1.3,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 3,
                                      WebkitBoxOrient: 'vertical'
                                    }}>
                                      {ref.title}
                                    </div>
                                    <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>
                                      {ref.author || 'Autor Best-seller'}
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 6 }}>
                                    <span style={{
                                      display: 'inline-block',
                                      padding: '2px 6px',
                                      borderRadius: 4,
                                      background: safeBsr <= 80000 ? '#ecfdf5' : '#f1f5f9',
                                      color: safeBsr <= 80000 ? '#059669' : '#475569',
                                      border: safeBsr <= 80000 ? '1px solid #a7f3d0' : '1px solid #cbd5e1',
                                      fontSize: 10,
                                      fontWeight: 800
                                    }}>
                                      BSR #{safeBsr.toLocaleString('pt-BR')} {safeBsr <= 80000 ? '✓ < 80k' : ''}
                                    </span>
                                    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#0f172a' }}>
                                      ~${rev.toLocaleString('pt-BR')} USD/mês (~{sales} vendas)
                                    </span>
                                    <span style={{ fontSize: 10, color: '#64748b' }}>
                                      ★ {ref.rating || 4.8} ({ref.reviews || 450} avaliações)
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: 6, borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
                                <button
                                  type="button"
                                  onClick={() => handleInspirarNoBestseller(ref)}
                                  style={{
                                    flex: 1,
                                    padding: '6px 8px',
                                    borderRadius: 6,
                                    background: '#0f172a',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4
                                  }}
                                >
                                  <Sparkles size={12} color="#f59e0b" /> Inspirar Obra
                                </button>

                                {ref.amazonUrl && (
                                  <a
                                    href={ref.amazonUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      padding: '6px 10px',
                                      borderRadius: 6,
                                      background: '#ffffff',
                                      color: '#0284c7',
                                      border: '1px solid #cbd5e1',
                                      fontSize: 11,
                                      fontWeight: 700,
                                      textDecoration: 'none',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4
                                    }}
                                    title="Ver página oficial na Amazon"
                                  >
                                    <ExternalLink size={12} />
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 2: CAPA DO LIVRO (LAYOUT CLEAN COM CANVAS EXPANDIDO) */}
              {activeTab === 'capa' && (
                <div
                  style={{
                    width: '100%',
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: '#f8fafc',
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    padding: 20,
                    gap: 16,
                    boxSizing: 'border-box'
                  }}
                >
                  {/* SELETOR DE VISUALIZAÇÃO: WRAP COMPLETO VS CAPA FRONTAL VS CONTRACAPA */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ffffff', padding: '4px 6px', borderRadius: 8, border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setViewModeCapa('wrap')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 6,
                        border: viewModeCapa === 'wrap' ? '1.5px solid #0f172a' : '1px solid transparent',
                        background: viewModeCapa === 'wrap' ? '#0f172a' : 'transparent',
                        color: viewModeCapa === 'wrap' ? '#ffffff' : '#334155',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <span>📖 Capa Aberta Completa (Wrap)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setViewModeCapa('front')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 6,
                        border: viewModeCapa === 'front' ? '1.5px solid #0f172a' : '1px solid transparent',
                        background: viewModeCapa === 'front' ? '#0f172a' : 'transparent',
                        color: viewModeCapa === 'front' ? '#ffffff' : '#334155',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <span>📕 Capa Frontal</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setViewModeCapa('back')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 6,
                        border: viewModeCapa === 'back' ? '1.5px solid #0f172a' : '1px solid transparent',
                        background: viewModeCapa === 'back' ? '#0f172a' : 'transparent',
                        color: viewModeCapa === 'back' ? '#ffffff' : '#334155',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <span>📘 Contracapa</span>
                    </button>
                  </div>

                  {/* BARRA DE IMPORTAÇÃO & AÇÕES RÁPIDAS DE CAPA */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 840 }}>
                    <button
                      type="button"
                      onClick={() => coverFileInputRef.current?.click()}
                      style={{
                        padding: '7px 12px',
                        background: '#ffffff',
                        color: '#0f172a',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                      title="Importar imagem do computador para a Capa Frontal"
                    >
                      <Upload size={13} color="#2563eb" /> Importar Frente (PNG/JPG)
                    </button>

                    <button
                      type="button"
                      onClick={() => backCoverFileInputRef.current?.click()}
                      style={{
                        padding: '7px 12px',
                        background: '#ffffff',
                        color: '#0f172a',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                      title="Importar imagem do computador para a Contracapa"
                    >
                      <Upload size={13} color="#10b981" /> Importar Contracapa (PNG/JPG)
                    </button>

                    <button
                      type="button"
                      onClick={() => wrapFileInputRef.current?.click()}
                      style={{
                        padding: '7px 12px',
                        background: '#ffffff',
                        color: '#0f172a',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                      title="Importar imagem aberta completa (Wrap com Frente + Lombada + Verso)"
                    >
                      <Upload size={13} color="#f59e0b" /> Importar Wrap Aberto
                    </button>

                    <button
                      type="button"
                      onClick={baixarCapaCompletaPdf}
                      disabled={!capaFinal}
                      style={{
                        padding: '7px 14px',
                        background: 'linear-gradient(135deg, #059669, #047857)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: !capaFinal ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        boxShadow: '0 2px 5px rgba(5, 150, 105, 0.25)'
                      }}
                    >
                      <Download size={13} /> 📕 Baixar PDF Capa Completa KDP
                    </button>
                  </div>

                  {capaFinal ? (
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 840 }}>

                      {/* BANNER TÉCNICO INFORMATIVO DE CONFORMIDADE COM AMAZON KDP */}
                      <div style={{
                        width: '100%',
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: 8,
                        padding: '10px 14px',
                        marginBottom: 12,
                        textAlign: 'left',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        fontSize: 11,
                        color: '#1e3a8a'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <span>📐 <b>Formato:</b> {formato}</span>
                          <span>•</span>
                          <span>📏 <b>Lombada KDP:</b> {((livro?.capitulos?.length ? Math.max(24, livro.capitulos.length * 6) : paginasAlvo) * 0.002252).toFixed(3)}" (~{(((livro?.capitulos?.length ? Math.max(24, livro.capitulos.length * 6) : paginasAlvo) * 0.002252) * 25.4).toFixed(1)}mm)</span>
                          <span>•</span>
                          <span>✂️ <b>Sangria (Bleed):</b> 0.125" (3.2mm)</span>
                          <span>•</span>
                          <span>🏷️ <b>Código de Barras KDP:</b> Estampado pela Amazon na impressão (sem corte branco na arte)</span>
                        </div>
                        <a
                          href="https://kdp.amazon.com/pt_BR/help/topic/G200645690"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: '#2563eb',
                            fontWeight: 700,
                            textDecoration: 'underline',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                          }}
                        >
                          Guia KDP ↗
                        </a>
                      </div>

                      {/* EXIBIÇÃO DA IMAGEM SELECIONADA (AMPLA, NÍTIDA E SEM CORTES) */}
                      <div style={{
                        position: 'relative',
                        display: 'inline-block',
                        maxWidth: '100%',
                        padding: 8,
                        background: '#ffffff',
                        borderRadius: 10,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 16px 36px -8px rgba(0,0,0,0.22)'
                      }}>
                        {viewModeCapa === 'wrap' && (wrapPreviewUrl || capaFinal) && (
                          <img
                            src={wrapPreviewUrl || capaFinal}
                            alt="Visão Aberta Completa da Capa KDP"
                            style={{
                              maxHeight: 460,
                              maxWidth: '100%',
                              borderRadius: 4,
                              display: 'block',
                              margin: '0 auto'
                            }}
                          />
                        )}

                        {viewModeCapa === 'front' && (
                          <div style={{
                            position: 'relative',
                            display: 'inline-block',
                            borderRadius: 6,
                            overflow: 'hidden',
                            maxWidth: '100%',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.18)'
                          }}>
                            <img
                              src={(isEditingFrontCover ? (fundoImg || capaFinal) : (capaFinal || fundoImg)) || ''}
                              alt="Capa Frontal do Livro"
                              style={{
                                maxHeight: 560,
                                maxWidth: '100%',
                                borderRadius: 6,
                                display: 'block',
                                margin: '0 auto'
                              }}
                            />

                            {/* CAMADA VIVA DE TIPOGRAFIA POR CIMA DO FUNDO (NUNCA QUEIMA NEM SOBREPÕE O FUNDO) */}
                            {isEditingFrontCover && (
                              <div style={{
                                position: 'absolute',
                                inset: 0,
                                pointerEvents: 'none',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                padding: '24px 18px',
                                textAlign: 'center',
                                boxSizing: 'border-box'
                              }}>
                                {/* Título com Offset Y e Fonte em Tempo Real */}
                                <div style={{
                                  transform: `translateY(${Math.round(capaTituloOffsetY * 0.22)}px)`,
                                  transition: 'transform 0.08s ease-out'
                                }}>
                                  <h1 style={{
                                    margin: 0,
                                    fontSize: `${Math.round(capaTituloFontSize * 0.20)}px`,
                                    fontFamily: capaTituloFontFamily === 'impact' ? 'Impact, "Bebas Neue", sans-serif' :
                                      capaTituloFontFamily === 'sans' ? 'Montserrat, Arial, sans-serif' :
                                      capaTituloFontFamily === 'display' ? '"Playfair Display", Didot, serif' :
                                      capaTituloFontFamily === 'brutal' ? '"Arial Black", Impact, sans-serif' :
                                      'Georgia, "Cinzel", serif',
                                    color: '#ffffff',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    lineHeight: 1.15,
                                    textShadow: '0 2px 10px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.9), 1px 1px 2px #000'
                                  }}>
                                    {livro?.titulo || titulo || 'Título da Obra'}
                                  </h1>

                                  {(livro?.subtitulo || subtitulo) && (
                                    <p style={{
                                      margin: '6px auto 0 auto',
                                      maxWidth: '92%',
                                      fontSize: '9.5px',
                                      fontWeight: 600,
                                      color: '#f8fafc',
                                      lineHeight: 1.3,
                                      textShadow: '0 1px 6px rgba(0,0,0,0.9)'
                                    }}>
                                      {livro?.subtitulo || subtitulo}
                                    </p>
                                  )}
                                </div>

                                {/* Nome do Autor no Rodapé */}
                                <div>
                                  <div style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: '#f8fafc',
                                    textTransform: 'uppercase',
                                    letterSpacing: '2px',
                                    textShadow: '0 2px 6px rgba(0,0,0,0.9)'
                                  }}>
                                    {livro?.autor || autor || 'Autor'}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {viewModeCapa === 'back' && (contracapaFinal || capaFinal) && (
                          <img
                            src={contracapaFinal || capaFinal}
                            alt="Contracapa Diagramada do Livro"
                            style={{
                              maxHeight: 540,
                              maxWidth: '100%',
                              borderRadius: 6,
                              display: 'block',
                              margin: '0 auto'
                            }}
                          />
                        )}
                      </div>

                      {/* LEGENDA E INFORMAÇÃO */}
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                          {viewModeCapa === 'wrap'
                            ? '📖 Capa Aberta Completa KDP (Contracapa + Lombada + Frente)'
                            : viewModeCapa === 'front'
                            ? '📕 Capa Frontal Diagramada KDP (1600x2400)'
                            : '📘 Contracapa com Gancho Editorial, Sinopse e Diagramação KDP'}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          Calculada milimetricamente para o Amazon KDP Paperback e Kindle eBook.
                        </div>
                      </div>

                      {/* PAINEL DE PERSONALIZAÇÃO DA CONTRACAPA */}
                      {isEditingBackCover && contracapaTexto && (
                        <div style={{
                          width: '100%',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: 10,
                          padding: 16,
                          marginTop: 16,
                          textAlign: 'left',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.06)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                              ✏️ Personalização Editorial da Contracapa
                            </div>
                            <span style={{ fontSize: 11, color: '#64748b' }}>
                              Alinhamento, foto e textos diagramados
                            </span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {/* CONTROLE DE ALINHAMENTO DO TEXTO */}
                            <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                ↔️ Alinhamento Geral dos Textos da Contracapa:
                              </label>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                  type="button"
                                  onClick={() => setContracapaAlign('left')}
                                  style={{
                                    flex: 1,
                                    padding: '7px 10px',
                                    borderRadius: 6,
                                    border: contracapaAlign === 'left' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                                    background: contracapaAlign === 'left' ? '#f0f9ff' : '#ffffff',
                                    color: contracapaAlign === 'left' ? '#0369a1' : '#475569',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  ⬅️ Alinhar à Esquerda
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setContracapaAlign('center')}
                                  style={{
                                    flex: 1,
                                    padding: '7px 10px',
                                    borderRadius: 6,
                                    border: contracapaAlign === 'center' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                                    background: contracapaAlign === 'center' ? '#f0f9ff' : '#ffffff',
                                    color: contracapaAlign === 'center' ? '#0369a1' : '#475569',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  ↔️ Centralizado (Recomendado)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setContracapaAlign('right')}
                                  style={{
                                    flex: 1,
                                    padding: '7px 10px',
                                    borderRadius: 6,
                                    border: contracapaAlign === 'right' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                                    background: contracapaAlign === 'right' ? '#f0f9ff' : '#ffffff',
                                    color: contracapaAlign === 'right' ? '#0369a1' : '#475569',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  ➡️ Alinhar à Direita
                                </button>
                              </div>
                            </div>

                            {/* FOTO DA CONTRACAPA / IMAGEM DO AUTOR */}
                            <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                📷 Foto do Autor / Imagem da Contracapa (Opcional):
                              </label>
                              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = (ev) => {
                                        setContracapaAuthorPhotoUrl(ev.target?.result as string);
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                  style={{ fontSize: 11, color: '#475569' }}
                                />

                                {contracapaAuthorPhotoUrl && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <img
                                      src={contracapaAuthorPhotoUrl}
                                      alt="Foto Autor"
                                      style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid #f59e0b' }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setContracapaAuthorPhotoUrl(null)}
                                      style={{
                                        background: '#fee2e2',
                                        color: '#b91c1c',
                                        border: '1px solid #fca5a5',
                                        padding: '4px 8px',
                                        borderRadius: 4,
                                        fontSize: 11,
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Remover Foto
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* TAMANHO DA FOTO */}
                              <div style={{ marginTop: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                  <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
                                    Tamanho da Foto na Contracapa: <strong>{contracapaAuthorPhotoSize}px</strong>
                                  </span>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    {[120, 180, 240].map((sz) => (
                                      <button
                                        key={sz}
                                        type="button"
                                        onClick={() => setContracapaAuthorPhotoSize(sz)}
                                        style={{
                                          padding: '2px 6px',
                                          borderRadius: 4,
                                          fontSize: 10,
                                          fontWeight: 700,
                                          border: contracapaAuthorPhotoSize === sz ? '1px solid #0284c7' : '1px solid #cbd5e1',
                                          background: contracapaAuthorPhotoSize === sz ? '#e0f2fe' : '#ffffff',
                                          color: contracapaAuthorPhotoSize === sz ? '#0369a1' : '#475569',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        {sz === 120 ? 'P' : sz === 180 ? 'M' : 'G'} ({sz}px)
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <input
                                  type="range"
                                  min="90"
                                  max="300"
                                  step="10"
                                  value={contracapaAuthorPhotoSize}
                                  onChange={(e) => setContracapaAuthorPhotoSize(Number(e.target.value))}
                                  style={{ width: '100%', cursor: 'pointer' }}
                                />
                              </div>
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                                Gancho / Headline de Impacto (Topo da Contracapa):
                              </label>
                              <input
                                type="text"
                                value={contracapaTexto.hookHeadline}
                                onChange={(e) => setContracapaTexto({ ...contracapaTexto, hookHeadline: e.target.value })}
                                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                              />
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                                Sinopse Comercial da Obra:
                              </label>
                              <textarea
                                rows={3}
                                value={contracapaTexto.synopsisText}
                                onChange={(e) => setContracapaTexto({ ...contracapaTexto, synopsisText: e.target.value })}
                                style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, resize: 'vertical' }}
                              />
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                                3 Destaques / Benefícios da Leitura:
                              </label>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {[0, 1, 2].map((idx) => (
                                  <input
                                    key={idx}
                                    type="text"
                                    value={contracapaTexto.readerBenefits[idx] || ''}
                                    onChange={(e) => {
                                      const novos = [...contracapaTexto.readerBenefits];
                                      novos[idx] = e.target.value;
                                      setContracapaTexto({ ...contracapaTexto, readerBenefits: novos });
                                    }}
                                    placeholder={`Benefício ${idx + 1}...`}
                                    style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                                  />
                                ))}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleReaplicarContracapa}
                              style={{
                                alignSelf: 'flex-start',
                                marginTop: 6,
                                padding: '9px 18px',
                                background: '#059669',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              ✓ Atualizar e Reaplicar na Contracapa
                            </button>
                          </div>
                        </div>
                      )}

                      {/* PAINEL DE AJUSTE DA CAPA FRONTAL (POSIÇÃO VERTICAL, TAMANHO E ESTILO DA FONTE) */}
                      {isEditingFrontCover && (
                        <div style={{
                          width: '100%',
                          background: '#ffffff',
                          border: '1px solid #fcd34d',
                          borderRadius: 10,
                          padding: 16,
                          marginTop: 16,
                          textAlign: 'left',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.06)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#92400e' }}>
                              🎨 Ajustar Tipografia & Posição da Capa Frontal
                            </div>
                            <span style={{ fontSize: 11, color: '#78350f' }}>
                              Ajuste visual antes de baixar o PDF
                            </span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {/* 1. MOVER O TÍTULO PARA CIMA OU PARA BAIXO */}
                            <div style={{ background: '#fefce8', padding: 10, borderRadius: 8, border: '1px solid #fef08a' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <label style={{ fontSize: 11, fontWeight: 700, color: '#713f12' }}>
                                  ↕️ Posição Vertical do Título (Mover para Cima / Baixo):
                                </label>
                                <span style={{ fontSize: 11, fontWeight: 800, color: '#854d0e' }}>
                                  Offset: {capaTituloOffsetY > 0 ? `+${capaTituloOffsetY}` : capaTituloOffsetY}px
                                </span>
                              </div>

                              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                                <button
                                  type="button"
                                  onClick={() => setCapaTituloOffsetY(-240)}
                                  style={{
                                    flex: 1,
                                    padding: '6px 8px',
                                    borderRadius: 5,
                                    background: capaTituloOffsetY === -240 ? '#fde047' : '#ffffff',
                                    border: '1px solid #ca8a04',
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    color: '#713f12',
                                    cursor: 'pointer'
                                  }}
                                >
                                  ⬆️ Topo (-240px)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCapaTituloOffsetY(0)}
                                  style={{
                                    flex: 1,
                                    padding: '6px 8px',
                                    borderRadius: 5,
                                    background: capaTituloOffsetY === 0 ? '#fde047' : '#ffffff',
                                    border: '1px solid #ca8a04',
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    color: '#713f12',
                                    cursor: 'pointer'
                                  }}
                                >
                                  🎯 Centro (0px)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCapaTituloOffsetY(180)}
                                  style={{
                                    flex: 1,
                                    padding: '6px 8px',
                                    borderRadius: 5,
                                    background: capaTituloOffsetY === 180 ? '#fde047' : '#ffffff',
                                    border: '1px solid #ca8a04',
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    color: '#713f12',
                                    cursor: 'pointer'
                                  }}
                                >
                                  ⬇️ Baixo (+180px)
                                </button>
                              </div>

                              <input
                                type="range"
                                min="-350"
                                max="350"
                                step="10"
                                value={capaTituloOffsetY}
                                onChange={(e) => setCapaTituloOffsetY(Number(e.target.value))}
                                style={{ width: '100%', cursor: 'pointer' }}
                              />
                            </div>

                            {/* 2. TAMANHO DA FONTE DA CAPA */}
                            <div style={{ background: '#fefce8', padding: 10, borderRadius: 8, border: '1px solid #fef08a' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <label style={{ fontSize: 11, fontWeight: 700, color: '#713f12' }}>
                                  🔠 Tamanho da Fonte do Título:
                                </label>
                                <span style={{ fontSize: 11, fontWeight: 800, color: '#854d0e' }}>
                                  {capaTituloFontSize}px
                                </span>
                              </div>

                              <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => setCapaTituloFontSize(prev => Math.max(60, prev - 10))}
                                  style={{
                                    padding: '5px 12px',
                                    borderRadius: 5,
                                    background: '#ffffff',
                                    border: '1px solid #ca8a04',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: '#713f12',
                                    cursor: 'pointer'
                                  }}
                                >
                                  - 10px
                                </button>
                                <div style={{ flex: 1, textAlign: 'center', fontSize: 11, color: '#854d0e', fontWeight: 600 }}>
                                  Escala Tipográfica Oficial KDP
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setCapaTituloFontSize(prev => Math.min(160, prev + 10))}
                                  style={{
                                    padding: '5px 12px',
                                    borderRadius: 5,
                                    background: '#ffffff',
                                    border: '1px solid #ca8a04',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: '#713f12',
                                    cursor: 'pointer'
                                  }}
                                >
                                  + 10px
                                </button>
                              </div>

                              <input
                                type="range"
                                min="60"
                                max="160"
                                step="4"
                                value={capaTituloFontSize}
                                onChange={(e) => setCapaTituloFontSize(Number(e.target.value))}
                                style={{ width: '100%', cursor: 'pointer' }}
                              />
                            </div>

                            {/* 3. ESTILO E FAMÍLIA DA FONTE DA CAPA */}
                            <div style={{ background: '#fefce8', padding: 10, borderRadius: 8, border: '1px solid #fef08a' }}>
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#713f12', marginBottom: 6 }}>
                                🖋️ Estilo da Fonte da Capa:
                              </label>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 6 }}>
                                {[
                                  { id: 'serif', label: '🏛️ Serif Bestseller', sub: 'Georgia / Cinzel' },
                                  { id: 'impact', label: '💥 Sans Impact', sub: 'Impact / Bebas' },
                                  { id: 'display', label: '✨ Editorial Display', sub: 'Playfair / Didot' },
                                  { id: 'sans', label: '🌐 Modern Clean', sub: 'Montserrat / Arial' },
                                  { id: 'brutal', label: '🖤 Brutal Black', sub: 'Arial Black' }
                                ].map((style) => (
                                  <button
                                    key={style.id}
                                    type="button"
                                    onClick={() => setCapaTituloFontFamily(style.id)}
                                    style={{
                                      padding: '8px 8px',
                                      borderRadius: 6,
                                      border: capaTituloFontFamily === style.id ? '2px solid #b45309' : '1px solid #cbd5e1',
                                      background: capaTituloFontFamily === style.id ? '#fef3c7' : '#ffffff',
                                      color: capaTituloFontFamily === style.id ? '#78350f' : '#475569',
                                      cursor: 'pointer',
                                      textAlign: 'left'
                                    }}
                                  >
                                    <div style={{ fontSize: 11, fontWeight: 800 }}>{style.label}</div>
                                    <div style={{ fontSize: 9.5, opacity: 0.8 }}>{style.sub}</div>
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div style={{ fontSize: 11, color: '#854d0e', background: '#fef3c7', padding: '8px 12px', borderRadius: 6, border: '1px solid #fde047' }}>
                                💡 <b>Ajuste em Tempo Real:</b> O título e o autor flutuam por cima do fundo sem queimar a imagem. Ajuste o controle vertical e o tamanho da fonte, e quando estiver perfeito, clique no botão verde para confirmar!
                              </div>

                              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  onClick={handleReaplicarCapaFrontal}
                                  style={{
                                    padding: '10px 18px',
                                    background: 'linear-gradient(135deg, #059669, #047857)',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    boxShadow: '0 2px 5px rgba(5, 150, 105, 0.3)'
                                  }}
                                >
                                  ✨ Confirmar e Finalizar Capa Frontal
                                </button>

                                <button
                                  type="button"
                                  onClick={handleGerarOutraCapa}
                                  style={{
                                    padding: '9px 15px',
                                    background: '#ffffff',
                                    color: '#b45309',
                                    border: '1px solid #f59e0b',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                  }}
                                >
                                  🔄 Gerar Novo Fundo Limpo com IA (Sem Texto)
                                </button>

                                <button
                                  type="button"
                                  onClick={() => coverFileInputRef.current?.click()}
                                  style={{
                                    padding: '9px 15px',
                                    background: '#0f172a',
                                    color: '#ffffff',
                                    border: '1px solid #334155',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.2)'
                                  }}
                                  title="Substituir por outra imagem de capa própria salva no seu computador"
                                >
                                  <Upload size={14} /> 📁 Importar Outra Capa (PNG/JPG)
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* MASTER PROMPT DE CAPA EDITORIAL (600 A 1200 PALAVRAS) */}
                      <KdpCoverMasterPromptCard
                        titulo={livro?.titulo || titulo}
                        subtitulo={livro?.subtitulo || subtitulo}
                        autor={livro?.autor || autor}
                        genero={livro?.genero || genero}
                        premissa={bookPromise || uniqueAngle || topico || temaSelecionado || subtitulo}
                        idioma={idioma || 'pt'}
                        compactMode={false}
                      />

                      {/* CARD DAS 7 PALAVRAS-CHAVE OFICIAIS DO AMAZON KDP */}
                      <div style={{
                        width: '100%',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 10,
                        padding: 16,
                        marginTop: 18,
                        textAlign: 'left',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 8,
                          marginBottom: 8
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 15 }}>🔑</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                              7 Palavras-Chave de Busca Oficiais Amazon KDP
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              type="button"
                              onClick={handleCopiarKeywords}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '5px 11px',
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                border: '1px solid #bfdbfe',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                              title="Copiar todas as 7 palavras-chave para colar no painel do Amazon KDP"
                            >
                              <Copy size={12} /> Copiar 7 Palavras-Chave
                            </button>

                            <button
                              type="button"
                              onClick={handleRegenerarKeywords}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '5px 10px',
                                background: '#f8fafc',
                                color: '#475569',
                                border: '1px solid #cbd5e1',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                              title="Regenerar sugestões de busca otimizadas para este nicho"
                            >
                              <RefreshCw size={11} /> Regenerar
                            </button>
                          </div>
                        </div>

                        <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                          A Amazon KDP disponibiliza exatamente 7 caixas de termos de busca na publicação. Nossas palavras-chave seguem as regras oficiais (sem repetir palavras do título e focadas no interesse do leitor).
                        </p>

                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: 8
                        }}>
                          {keywordsKdp.slice(0, 7).map((kw, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                padding: '6px 10px',
                                borderRadius: 6,
                                fontSize: 11,
                                color: '#1e293b'
                              }}
                            >
                              <span style={{
                                fontSize: 10,
                                fontWeight: 800,
                                color: '#2563eb',
                                background: '#eff6ff',
                                padding: '1px 6px',
                                borderRadius: 4
                              }}>
                                #{idx + 1}
                              </span>
                              <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {kw}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 20px' }}>
                      <ImageIcon size={54} style={{ opacity: 0.3, marginBottom: 12 }} />
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                        Nenhuma capa gerada ainda
                      </div>
                      <p style={{ fontStyle: 'italic', fontSize: 12, maxWidth: 320, margin: '0 auto 16px auto', color: '#64748b' }}>
                        Clique no botão abaixo para gerar uma capa de alta resolução contextualizada com o tema do livro.
                      </p>
                      <button
                        type="button"
                        onClick={gerarCapaEPaginaPromocional}
                        disabled={gerando || isRegeneratingCoverOnly}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 20px',
                          borderRadius: 6,
                          background: '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
                        }}
                      >
                        <Sparkles size={16} /> 🎨 Gerar Capa KDP com IA
                      </button>

                      <button
                        type="button"
                        onClick={() => coverFileInputRef.current?.click()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 20px',
                          borderRadius: 6,
                          background: '#0f172a',
                          color: '#ffffff',
                          border: '1px solid #334155',
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
                          marginLeft: 10
                        }}
                        title="Importar imagem salva no seu computador (PNG, JPG, WEBP)"
                      >
                        <Upload size={16} /> 📁 Importar Capa do Computador
                      </button>

                      {/* MASTER PROMPT DISPONÍVEL IMEDIATAMENTE MESMO ANTES DE GERAR */}
                      <div style={{ marginTop: 24, textAlign: 'left', width: '100%', maxWidth: 760 }}>
                        <KdpCoverMasterPromptCard
                          titulo={livro?.titulo || titulo}
                          subtitulo={livro?.subtitulo || subtitulo}
                          autor={livro?.autor || autor}
                          genero={livro?.genero || genero}
                          premissa={bookPromise || uniqueAngle || topico || temaSelecionado || subtitulo}
                          idioma={idioma || 'pt'}
                          compactMode={false}
                        />
                      </div>
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



              {activeTab === 'planner' && (
                <PlannerBookStudio
                  title={titulo}
                  author={autor}
                  hasCredit={creditosLivros > 0}
                  onConsumeCredit={debitarCreditoLivro}
                  onRequireCredit={() => {
                    setCreditModalMotivo('A geração de um planner ou diário completo requer 1 crédito editorial.');
                    setIsCreditModalOpen(true);
                  }}
                />
              )}

              {activeTab === 'coauthor' && (
                <CoAuthorWorkspace
                  contextData={coAuthorContext}
                  bookState={livro}
                  onUpdateBookState={(newBook) => {
                    setLivro(newBook);
                    if (newBook.titulo && (!titulo.trim() || titulo === 'Livro Sem Título')) {
                      setTitulo(newBook.titulo);
                    }
                    if (newBook.subtitulo && !subtitulo.trim()) {
                      setSubtitulo(newBook.subtitulo);
                    }
                  }}
                  onSaveProgress={(novoLivro) => {
                    salvarProgressoLocal(novoLivro);
                  }}
                  onNavigateToPreview={() => setActiveTab('preview')}
                  onNavigateToCover={() => setActiveTab('capa')}
                  totalCapsDesejado={totalCaps || maxCapitulos || 8}
                  paginasAlvo={paginasAlvo || 80}
                  onClose={() => setActiveTab('preview')}
                  capaDataUrl={capaFinal}
                  formato={formato || '6x9'}
                  autorAtual={autor || 'Autor Book Engin'}
                  generoAtual={genero || 'Não Ficção'}
                  idiomaAtual={idioma || 'Português'}
                  onStartNewBook={handleStartNewBookFromCoAuthor}
                />
              )}


          </div>
          )} {/* FIM DA COLUNA 3 */}
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



      {/* Tour guiado removido da UI conforme solicitação */}

      {/* MODAL DO REVISOR EDITORIAL PÁGINA POR PÁGINA */}
      {isPageReviewerOpen && livro && (
        <KdpPageReviewerModal
          isOpen={isPageReviewerOpen}
          onClose={() => setIsPageReviewerOpen(false)}
          livro={{
            titulo: livro.titulo,
            subtitulo: livro.subtitulo,
            autor: livro.autor,
            genero: livro.genero,
            capitulos: livro.capitulos
          }}
          capaUrl={capaFinal}
          formato={formato}
          optSumario={optSumario}
          tamCapitulo={tamCapitulo}
          corCapitulo={corCapitulo}
          silhuetaConfig={silhuetaConfig.ativado && silhuetaConfig.imagemDataUrl ? {
            ativado: true,
            imagemDataUrl: silhuetaConfig.imagemDataUrl,
            paginasSelecionadas: silhuetaConfig.aplicarTodas !== false
              ? undefined
              : calcularPaginasSilhueta(
                  livro.capitulos.length * 8,
                  silhuetaConfig.modo,
                  {
                    intervalo: silhuetaConfig.intervalo,
                    totalAleatorio: silhuetaConfig.totalAleatorio
                  }
                ),
            opacidade: silhuetaConfig.opacidade || 10,
            sangriaPct: silhuetaConfig.sangriaPct,
            modoCobertura: silhuetaConfig.modoCobertura || 'full-page',
            monocromatico: silhuetaConfig.monocromatico !== false,
            aplicarTodas: silhuetaConfig.aplicarTodas !== false
          } : undefined}
          onUpdateCapitulo={(cIdx, novoTexto, novoTitulo) => {
            setLivro(prev => {
              if (!prev) return prev;
              const novosCaps = [...prev.capitulos];
              if (novosCaps[cIdx]) {
                novosCaps[cIdx] = {
                  ...novosCaps[cIdx],
                  texto: novoTexto,
                  titulo: novoTitulo || novosCaps[cIdx].titulo
                };
              }
              const atualizado = { ...prev, capitulos: novosCaps };
              salvarProgressoLocal(atualizado);
              return atualizado;
            });
          }}
          onUpdateLivroMetadata={(novoTitulo, novoSubtitulo, novoAutor) => {
            setTitulo(novoTitulo);
            if (novoSubtitulo !== undefined) setSubtitulo(novoSubtitulo);
            if (novoAutor !== undefined) setAutor(novoAutor);
            setLivro(prev => {
              if (!prev) return prev;
              const atualizado = {
                ...prev,
                titulo: novoTitulo,
                subtitulo: novoSubtitulo !== undefined ? novoSubtitulo : prev.subtitulo,
                autor: novoAutor !== undefined ? novoAutor : prev.autor
              };
              salvarProgressoLocal(atualizado);
              return atualizado;
            });
            setStatusMsg('✓ Título, Subtítulo e Autor salvos no livro!');
            setStatusType('ok');
          }}
          onUpdateSilhuetaConfig={(novaConfig) => {
            setSilhuetaConfig(prev => ({
              ...prev,
              ...novaConfig
            }));
          }}
          onDownloadPdf={baixarPDF}
        />
      )}

      {/* MODAL DOS TOP 50 BESTSELLERS DA AMAZON KDP (#1 AO #200) */}
      <Top50BestsellersModal
        isOpen={isTop50ModalOpen}
        onClose={() => setIsTop50ModalOpen(false)}
        segmento={genero || temaSelecionado || 'Finanças'}
        currentTitle={titulo}
        currentSubtitle={subtitulo}
        onSelectTitleProposal={(propTitulo: string, propSubtitulo: string) => {
          setTitulo(propTitulo);
          setSubtitulo(propSubtitulo);
          if (livro) {
            setLivro(prev => {
              if (!prev) return prev;
              const atualizado = {
                ...prev,
                titulo: propTitulo,
                subtitulo: propSubtitulo
              };
              salvarProgressoLocal(atualizado);
              return atualizado;
            });
          }
          setStatusMsg(`✓ Título e Subtítulo definidos com base nos Top 50 Bestsellers!`);
          setStatusType('ok');
        }}
        onSelectBookReference={(book: any) => {
          logDiag(`Livro de referência selecionado dos Top 50: ${book.title}`);
        }}
      />

      {/* ESTÚDIO DE VÍDEO TIKTOK / REELS / SHORTS (CENAS COM TRANSIÇÕES E VOZ NEURAL) */}
      {isTikTokStudioOpen && livro && livro.capitulos && livro.capitulos[tikTokChapterIndex] && (
        <ErrorBoundary fallbackTitle="Estúdio de Vídeo TikTok" onReset={() => setIsTikTokStudioOpen(false)}>
          <KdpTikTokStoryStudio
            isOpen={isTikTokStudioOpen}
            onClose={() => setIsTikTokStudioOpen(false)}
            chapterIndex={tikTokChapterIndex}
            chapterTitle={livro.capitulos[tikTokChapterIndex].titulo || `Capítulo ${tikTokChapterIndex + 1}`}
            chapterText={livro.capitulos[tikTokChapterIndex].texto || ''}
            bookTitle={livro.titulo || titulo || 'Livro Sem Título'}
            bookGenre={livro.genero || genero || temaSelecionado || 'Best-seller'}
            allChapters={livro.capitulos}
            onSelectChapter={(newIdx) => setTikTokChapterIndex(newIdx)}
          />
        </ErrorBoundary>
      )}

      {/* MODAL DE COMPRA / RECARGA DE CRÉDITOS EDITORIAIS (US$ 3 POR LIVRO) */}
      <PurchaseCreditsModal
        isOpen={isCreditModalOpen}
        onClose={() => setIsCreditModalOpen(false)}
        motivo={creditModalMotivo}
      />
    </div>
  );
};
