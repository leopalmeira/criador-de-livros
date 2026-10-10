// ================================================================
// CATÁLOGO OFICIAL DE TEMAS DE CURSOS PROFISSIONAIS DO BOOKENGIN
// 40 Categorias Profissionais x 50 Temas Cada = 2.000+ Temas Estruturados
// ================================================================

import { CourseTheme, CourseDifficultyLevel } from '../types/course-ebook';
import courseThemesRaw from './course-themes-data.json';

export const COURSE_CATEGORIES: string[] = [
  "Marcenaria, móveis planejados e montagem",
  "Confeitaria, bolos e doces",
  "Culinária, gastronomia e panificação",
  "Massagens, bem-estar e terapias corporais",
  "Beleza, estética e cuidados pessoais",
  "Manicure, pedicure e nail design",
  "Cílios, sobrancelhas e maquiagem",
  "Cabelo, barbearia e penteados",
  "Costura, moda e modelagem",
  "Artesanato, decoração e personalizados",
  "Limpeza profissional e higienização",
  "Manutenção residencial e pequenos reparos",
  "Eletricidade e manutenção técnica",
  "Encanamento e hidráulica",
  "Mecânica automotiva e manutenção de veículos",
  "Marketing digital e redes sociais",
  "Tráfego pago, anúncios e vendas online",
  "Empreendedorismo e pequenos negócios",
  "Finanças pessoais e gestão empresarial",
  "Inteligência artificial e automação",
  "Informática, programação e desenvolvimento de sistemas",
  "Excel, planilhas e ferramentas de escritório",
  "Design gráfico, edição e criação de conteúdo",
  "Fotografia, vídeo e edição audiovisual",
  "Idiomas e comunicação",
  "Concursos, provas e técnicas de estudo",
  "Produtividade, liderança e desenvolvimento pessoal",
  "Fitness, condicionamento físico e esportes",
  "Alimentação e culinária saudável",
  "Jardinagem, plantas e paisagismo",
  "Agricultura, criação de animais e atividades rurais",
  "Pets e treinamento básico",
  "Música, instrumentos e produção musical",
  "Desenho, pintura e ilustração",
  "Educação infantil e atividades educativas",
  "Organização doméstica e organização profissional",
  "Design de interiores e decoração",
  "Arquitetura, desenho técnico e ferramentas de projeto",
  "Turismo, hotelaria e serviços",
  "Atendimento, vendas presenciais e negociação"
];

export interface CourseThemeSearchParams {
  query?: string;
  category?: string;
  difficultyLevel?: CourseDifficultyLevel | 'todos';
  page?: number;
  pageSize?: number;
}

export interface CourseThemeSearchResult {
  themes: CourseTheme[];
  total: number;
  page: number;
  totalPages: number;
  categories: string[];
}

// Array em memória para temas customizados adicionados pelo usuário durante a sessão
const customThemesStorage: CourseTheme[] = [];

/**
 * Retorna todos os temas base carregados
 */
export function getAllCourseThemes(): CourseTheme[] {
  return [...(courseThemesRaw as CourseTheme[]), ...customThemesStorage];
}

/**
 * Busca de temas com pesquisa textual, filtros de categoria, nível e paginação eficiente
 */
export function searchCourseThemes(params: CourseThemeSearchParams = {}): CourseThemeSearchResult {
  const {
    query = '',
    category = '',
    difficultyLevel = 'todos',
    page = 1,
    pageSize = 24
  } = params;

  let all = getAllCourseThemes();

  // Filtro por Categoria
  if (category && category !== 'todas' && category !== 'all') {
    all = all.filter(t => t.category.toLowerCase() === category.toLowerCase());
  }

  // Filtro por Nível de Dificuldade
  if (difficultyLevel && difficultyLevel !== 'todos' && difficultyLevel !== 'todos-os-niveis') {
    all = all.filter(t => t.difficultyLevel === difficultyLevel);
  }

  // Filtro por Texto (título, descrição, habilidade ensinada ou tags)
  if (query && query.trim()) {
    const q = query.trim().toLowerCase();
    all = all.filter(t => 
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.taughtSkill.toLowerCase().includes(q) ||
      t.learningObjective.toLowerCase().includes(q)
    );
  }

  const total = all.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const offset = (currentPage - 1) * pageSize;
  const paginatedThemes = all.slice(offset, offset + pageSize);

  return {
    themes: paginatedThemes,
    total,
    page: currentPage,
    totalPages,
    categories: COURSE_CATEGORIES
  };
}

/**
 * Busca tema por ID único
 */
export function getCourseThemeById(id: string): CourseTheme | null {
  return getAllCourseThemes().find(t => t.id === id) || null;
}

/**
 * Verifica se já existe um tema com título similar para evitar duplicatas
 */
export function checkDuplicateCourseTheme(title: string): boolean {
  const clean = title.trim().toLowerCase();
  return getAllCourseThemes().some(t => t.title.toLowerCase() === clean);
}

/**
 * Adiciona um tema personalizado criado pelo usuário
 */
export function addCustomCourseTheme(custom: Omit<CourseTheme, 'id' | 'updatedAt'>): CourseTheme {
  const newTheme: CourseTheme = {
    ...custom,
    id: `CUSTOM_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    updatedAt: new Date().toISOString()
  };
  customThemesStorage.unshift(newTheme);
  return newTheme;
}
