import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const originalPath = path.resolve(__dirname, 'generate-course-catalog.js');
const original = fs.readFileSync(originalPath, 'utf-8');

const startMarker = 'export const CATEGORIAS_DEFINIDAS =';
const endMarker = '// Executa geração e grava arquivos';

const startIdx = original.indexOf(startMarker);
const endIdx = original.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  throw new Error('Marcadores não encontrados no script de geração.');
}

let generatorCode = original.slice(startIdx, endIdx).trim();

// Substituir declarações sem tipagem por tipagens TypeScript estritas
generatorCode = generatorCode.replace('const CATEGORY_THEME_SEEDS = {', 'const CATEGORY_THEME_SEEDS: Record<string, string[]> = {');
generatorCode = generatorCode.replace('export function gerarCatalogoCompleto() {', 'export function gerarCatalogoCompleto(): CourseTheme[] {');
generatorCode = generatorCode.replace('const temas = [];', 'const temas: CourseTheme[] = [];');
generatorCode = generatorCode.replace('function gerarTituloEspecifico(catNome, indice) {', 'function gerarTituloEspecifico(catNome: string, indice: number): string {');
generatorCode = generatorCode.replace('const subtopicosPorCategoria = {', 'const subtopicosPorCategoria: Record<string, string[]> = {');

const fileContent = `// ================================================================
// CATÁLOGO OFICIAL DE TEMAS DE CURSOS PROFISSIONAIS DO BOOKENGIN
// 40 Categorias Profissionais x 50 Temas Cada = 2.000+ Temas Estruturados
// Gerador algorítmico ultraleve em memória (Zero sobrecarga de bundle / Zero OOM)
// ================================================================

import { CourseTheme, CourseDifficultyLevel } from '../types/course-ebook';

${generatorCode}

export const COURSE_CATEGORIES: string[] = CATEGORIAS_DEFINIDAS;

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

// Cache em memória com carregamento lazy na primeira consulta
let cachedGeneratedThemes: CourseTheme[] | null = null;

/**
 * Retorna todos os temas base carregados (gerados em memória sob demanda em ~30ms)
 */
export function getAllCourseThemes(): CourseTheme[] {
  if (!cachedGeneratedThemes) {
    cachedGeneratedThemes = gerarCatalogoCompleto();
  }
  return [...cachedGeneratedThemes, ...customThemesStorage];
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
    id: \`CUSTOM_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`,
    updatedAt: new Date().toISOString()
  };
  customThemesStorage.unshift(newTheme);
  return newTheme;
}
`;

const targetPath = path.resolve(__dirname, '../src/data/course-themes-catalog.ts');
fs.writeFileSync(targetPath, fileContent, 'utf-8');
console.log(`[Sucesso] Catalog TypeScript gerado em: ${targetPath}`);
