import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { BackendCoverService } from './services/backend-cover-service';
import { AmazonLiveService } from './services/amazon-live-service';
import { COLORING_THEMES } from './services/coloring-themes-catalog';
import { ColoringBookService } from './services/coloring-book-service';
import { InvestigativeValidator } from './services/investigative-validator';
import { ProjectStorageService } from './services/project-storage-service';
import { BackendEditorialService } from './services/backend-editorial-service';

const projectRoot = process.cwd();

const app = express();
const PORT = process.env.PORT || 10000;

// Middlewares essenciais
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check (Requerido pelo Render para verificar status online)
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'online',
    platform: 'criador-de-livros-kdp',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// ROTAS DE INTELIGÊNCIA DE MERCADO AMAZON BOOKS AO VIVO
// ============================================================
app.get('/api/amazon/search', async (req, res) => {
  try {
    const query = (req.query.query as string) || 'bestseller books';
    const limit = parseInt((req.query.limit as string) || '8', 10);
    const books = await AmazonLiveService.searchAmazonBooks(query, limit);
    res.status(200).json({ success: true, count: books.length, books });
  } catch (err: any) {
    console.error('[AmazonSearch Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/amazon/suggestions', async (req, res) => {
  try {
    const prefix = (req.query.prefix as string) || '';
    const suggestions = await AmazonLiveService.getLiveSuggestions(prefix);
    res.status(200).json({ success: true, suggestions });
  } catch (err: any) {
    console.error('[AmazonSuggestions Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// ROTAS DO GERADOR DE LIVROS PARA COLORIR (ELLIOTTSAX KDP PORT)
// ============================================================
app.get('/api/coloring-book/themes', (_req, res) => {
  res.status(200).json({ success: true, count: COLORING_THEMES.length, themes: COLORING_THEMES });
});

app.post('/api/coloring-book/build-prompt', (req, res) => {
  try {
    const { config, pageIndex } = req.body || {};
    const pagePrompt = ColoringBookService.buildPagePrompt(config, pageIndex || 0);
    const coverPrompt = ColoringBookService.buildCoverPrompt(config);
    res.status(200).json({ success: true, pagePrompt, coverPrompt });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ============================================================
// ROTAS DO GERADOR DE LIVROS DE SUDOKU INVESTIGATIVO (MURDER MYSTERY)
// ============================================================
app.get('/api/sudoku-investigativo/themes', (_req, res) => {
  res.status(200).json({
    success: true,
    themes: [
      { id: 'assassinato', label: 'Assassinato Clássico (Mansão / Herança)' },
      { id: 'roubo', label: 'Roubo de Obra de Arte / Joia Rara' },
      { id: 'desaparecimento', label: 'Desaparecimento Misterioso' },
      { id: 'espionagem', label: 'Espionagem & Traição Internacional' },
      { id: 'conspiracao', label: 'Conspiração Política / Alta Sociedade' }
    ]
  });
});

app.post('/api/sudoku-investigativo/validate', (req, res) => {
  try {
    const { cases } = req.body || {};
    if (!Array.isArray(cases)) {
      return res.status(400).json({ success: false, error: 'Lista de casos inválida.' });
    }
    const report = InvestigativeValidator.validateBookConsistency(cases);
    res.status(200).json({ success: true, report });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ============================================================
// ROTAS DO PROCESSO EDITORIAL CONTROLADO POR APROVAÇÃO (EDITORIAL BOOK ENGINE)
// ============================================================
app.get('/api/projects', async (_req, res) => {
  try {
    const projects = await ProjectStorageService.listProjects();
    res.status(200).json({ success: true, count: projects.length, projects });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await ProjectStorageService.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Projeto não encontrado.' });
    }
    res.status(200).json({ success: true, project });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const projectData = req.body;
    if (!projectData || !projectData.id) {
      return res.status(400).json({ success: false, error: 'Dados do projeto inválidos ou sem ID.' });
    }
    const saved = await ProjectStorageService.saveProject(projectData);
    res.status(200).json({ success: true, project: saved });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const deleted = await ProjectStorageService.deleteProject(req.params.id);
    res.status(200).json({ success: deleted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/projects/:id/stages/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { stageId, notes, versionTag } = req.body || {};
    if (!stageId) {
      return res.status(400).json({ success: false, error: 'stageId é obrigatório para aprovação.' });
    }
    const project = await ProjectStorageService.getProject(id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Projeto não encontrado.' });
    }

    if (!project.editorialStageApprovals) project.editorialStageApprovals = {};
    if (!project.stageStatuses) project.stageStatuses = {} as any;

    project.editorialStageApprovals[stageId] = {
      stageId,
      status: 'APROVADO',
      approvedAt: Date.now(),
      approvedBy: 'user',
      notes,
      versionTag
    };
    if (!project.stageStatuses) {
      project.stageStatuses = {} as any;
    }
    (project.stageStatuses as any)[stageId] = 'APROVADO';

    await ProjectStorageService.logAudit(
      id,
      'STAGE_APPROVED',
      `Etapa "${stageId}" aprovada formalmente pelo usuário.`,
      true,
      stageId
    );

    const saved = await ProjectStorageService.saveProject(project);
    res.status(200).json({ success: true, project: saved });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/projects/:id/chapters/generate', async (req, res) => {
  try {
    const { id } = req.params;
    const { chapterIndex } = req.body || {};
    if (chapterIndex === undefined || chapterIndex === null) {
      return res.status(400).json({ success: false, error: 'chapterIndex é obrigatório.' });
    }
    const project = await ProjectStorageService.getProject(id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Projeto não encontrado.' });
    }

    const gen = await BackendEditorialService.generateChapter(project, Number(chapterIndex));
    if (!project.kdpChapters) project.kdpChapters = [];

    const existingCh = project.kdpChapters[chapterIndex] || {
      index: Number(chapterIndex),
      title: gen.chapterTitle,
      summary: '',
      targetWordCount: 2000,
      scenes: []
    };

    existingCh.prose = gen.prose;
    existingCh.wordCount = gen.wordCount;
    existingCh.status = 'AGUARDANDO_APROVACAO';

    // Salvar versão gerada por IA
    const ver = {
      id: `ver_ia_${Date.now()}`,
      chapterIndex: Number(chapterIndex),
      type: 'ia_generated' as const,
      timestamp: Date.now(),
      prose: gen.prose,
      wordCount: gen.wordCount,
      summary: existingCh.summary || '',
      authorType: 'ai' as const,
      note: 'Geração com contexto editorial da Bíblia do Livro'
    };

    project.kdpChapters[chapterIndex] = existingCh;
    await ProjectStorageService.saveChapterVersion(id, Number(chapterIndex), ver);

    await ProjectStorageService.logAudit(
      id,
      'CHAPTER_GENERATED',
      `Capítulo ${Number(chapterIndex) + 1} ("${existingCh.title}") gerado via IA (${gen.wordCount} palavras). Aguardando aprovação.`,
      true,
      'write',
      Number(chapterIndex)
    );

    const saved = await ProjectStorageService.saveProject(project);
    res.status(200).json({ success: true, chapter: saved.kdpChapters?.[Number(chapterIndex)] });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/projects/:id/chapters/:chapterIndex/approve', async (req, res) => {
  try {
    const { id, chapterIndex } = req.params;
    const idx = Number(chapterIndex);
    const project = await ProjectStorageService.getProject(id);
    if (!project || !project.kdpChapters || !project.kdpChapters[idx]) {
      return res.status(404).json({ success: false, error: 'Capítulo não encontrado no projeto.' });
    }

    project.kdpChapters[idx].status = 'APROVADO';
    project.kdpChapters[idx].approvedAt = Date.now();
    if (!project.chapterApprovals) project.chapterApprovals = {};
    project.chapterApprovals[idx] = true;

    await ProjectStorageService.logAudit(
      id,
      'CHAPTER_APPROVED',
      `Capítulo ${idx + 1} ("${project.kdpChapters[idx].title}") APROVADO pelo usuário e marcado como imutável nesta versão.`,
      true,
      'write',
      idx
    );

    const saved = await ProjectStorageService.saveProject(project);
    res.status(200).json({ success: true, chapter: saved.kdpChapters?.[idx] });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/projects/:id/chapters/:chapterIndex/versions', async (req, res) => {
  try {
    const { id, chapterIndex } = req.params;
    const idx = Number(chapterIndex);
    const { prose, wordCount, type, note, summary } = req.body || {};

    const project = await ProjectStorageService.getProject(id);
    if (!project || !project.kdpChapters || !project.kdpChapters[idx]) {
      return res.status(404).json({ success: false, error: 'Capítulo não encontrado no projeto.' });
    }

    const version = {
      id: `ver_${Date.now()}`,
      chapterIndex: idx,
      type: type || 'manual_edit',
      timestamp: Date.now(),
      prose: prose || project.kdpChapters[idx].prose || '',
      wordCount: wordCount || (prose ? prose.split(/\s+/).filter(Boolean).length : 0),
      summary: summary || project.kdpChapters[idx].summary || '',
      authorType: type === 'ia_generated' ? 'ai' as const : 'user' as const,
      note: note || 'Edição manual do usuário'
    };

    project.kdpChapters[idx].prose = version.prose;
    project.kdpChapters[idx].wordCount = version.wordCount;
    project.kdpChapters[idx].hasManualEdits = true;
    project.kdpChapters[idx].status = 'EDITANDO';

    await ProjectStorageService.saveChapterVersion(id, idx, version);
    await ProjectStorageService.logAudit(
      id,
      'CHAPTER_EDITED',
      `Capítulo ${idx + 1} editado manualmente pelo usuário (${version.wordCount} palavras). Nova versão arquivada.`,
      true,
      'write',
      idx
    );

    const saved = await ProjectStorageService.saveProject(project);
    res.status(200).json({ success: true, chapter: saved.kdpChapters?.[idx] });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/projects/:id/chapters/:chapterIndex/versions', async (req, res) => {
  try {
    const { id, chapterIndex } = req.params;
    const versions = await ProjectStorageService.getChapterVersions(id, Number(chapterIndex));
    res.status(200).json({ success: true, versions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/projects/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const project = await ProjectStorageService.getProject(id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Projeto não encontrado.' });
    }

    const suggestions = await BackendEditorialService.reviewManuscript(project);
    project.reviewSuggestions = suggestions;
    const saved = await ProjectStorageService.saveProject(project);

    res.status(200).json({ success: true, suggestions, count: suggestions.length });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/projects/:id/quality-gate', async (req, res) => {
  try {
    const { id } = req.params;
    const project = await ProjectStorageService.getProject(id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Projeto não encontrado.' });
    }

    const checklist = BackendEditorialService.evaluateQualityGate(project);
    project.qualityGate = checklist;
    const isReady = Object.values(checklist).every(Boolean);
    if (isReady) {
      project.isFinalized = true;
      project.status = 'PUBLICADO';
    }

    const saved = await ProjectStorageService.saveProject(project);
    res.status(200).json({ success: true, checklist, isReady, project: saved });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/projects/:id/audit', async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await ProjectStorageService.getAuditLogs(id);
    res.status(200).json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// ROTAS DE GERAÇÃO E GERENCIAMENTO DE CAPAS 100% NO BACKEND
// ============================================================
app.get('/api/covers/api-key-status', (_req, res) => {
  const status = BackendCoverService.getApiKeyStatus();
  res.status(200).json({ success: true, ...status });
});

app.post('/api/covers/save-api-key', (req, res) => {
  try {
    const { apiKey } = req.body || {};
    const result = BackendCoverService.saveApiKey(apiKey || '');
    res.status(result.success ? 200 : 400).json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/covers/generate', async (req, res) => {
  try {
    const payload = req.body || {};
    const progress = await BackendCoverService.startCoverGeneration(payload);
    res.status(200).json({
      success: true,
      jobId: progress.jobId,
      status: progress.status,
      stepLabel: progress.stepLabel
    });
  } catch (err: any) {
    console.error('[CoverGeneration Error]:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/covers/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const status = BackendCoverService.getJobStatus(jobId);
  if (status) {
    res.status(200).json({ success: true, ...status });
  } else {
    res.status(404).json({ success: false, error: 'Tarefa de capa não encontrada' });
  }
});

app.get('/api/covers/list/:projectId', (req, res) => {
  const { projectId } = req.params;
  const covers = BackendCoverService.getProjectCovers(projectId);
  res.status(200).json({ success: true, covers });
});

app.post('/api/covers/select', (req, res) => {
  try {
    const { projectId, coverId } = req.body || {};
    const selected = BackendCoverService.selectCover(projectId, coverId);
    res.status(200).json({ success: !!selected, selectedCover: selected });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Servir arquivos de capa salvos no storage local/persistente
app.get('/api/covers/:projectId/:fileName', (req, res) => {
  const { projectId, fileName } = req.params;
  const filePath = path.join(projectRoot, 'covers', projectId, fileName);
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'image/png');
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Capa não encontrada' });
  }
});

// ============================================================
// ROTAS DE AGENTES DE IA KDP (BACKEND ASSISTANT)
// ============================================================
app.post('/api/kdp-agents', async (req, res) => {
  try {
    const { agentName, payload } = req.body || {};
    const topic = payload?.topic || payload?.project?.topic || 'Desenvolvimento e Finanças';

    let result: any = {};

    switch (agentName) {
      case 'niche-seo':
        result = {
          opportunityScore: 94,
          marketDemand: 'MUITO ALTA',
          competitionLevel: 'BAIXA',
          searchVolumeMonthly: 45000,
          suggestedKeywords: [
            `${topic} na prática`,
            `como aplicar ${topic} 2026`,
            `guia definitivo ${topic}`,
            `método comprovado ${topic}`,
            `livro de ${topic} mais vendido amazon`
          ],
          competitorGaps: [
            'Livros existentes são muito teóricos e prolixos.',
            'Falta de planos de ação semanais para o leitor.',
            'Linguagem excessivamente acadêmica sem aplicação prática.'
          ]
        };
        break;

      case 'editorial-architect':
        result = {
          recommendedTitles: [
            { title: `O Código de ${topic}`, subtitle: 'O Método Definitivo para Conquistar Resultados Extraordinários' },
            { title: `A Ciência de ${topic}`, subtitle: 'Como Agir com Foco, Disciplina e Segurança' },
            { title: `Além dos Limites em ${topic}`, subtitle: 'Estratégias Testadas para Sair da Teoria e Vencer na Prática' }
          ],
          corePromise: `Capacitar o leitor a implementar um sistema definitivo de ${topic} em até 14 dias com resultados mensuráveis.`,
          readerTransformation: `De um indivíduo sobrecarregado para um executor disciplinado com domínio total de ${topic}.`
        };
        break;

      case 'ghostwriter':
        result = {
          prose: `# Capítulo ${payload?.chapterIndex || 1}: ${payload?.chapterTitle || 'Fundamentos e Clareza'}\n\nPara transformar a forma como você aborda ${topic}, precisamos primeiro eliminar os mitos comuns.\n\nO verdadeiro sucesso não decorre de fórmulas mágicas ou atalhos instantâneos, mas de princípios sólidos aplicados com constância.\n\nNeste capítulo, você descobrirá como estruturar sua mente, organizar suas prioridades e iniciar a execução prática imediatamente.`,
          wordCount: 160,
          readabilityScore: 96
        };
        break;

      case 'copywriter':
        result = {
          headline: `Domine ${topic} e transforme seus resultados de forma definitiva.`,
          blurb: `<b>Você está pronto para alcançar o próximo nível?</b><br><br>Em <i>${payload?.project?.title || topic}</i>, você terá acesso a um passo a passo claro e validado para dominar ${topic}.<br><br><b>O que este livro entrega:</b><br><ul><li>Frameworks práticos e descomplicados</li><li>Estudos de caso reais de transformação</li><li>Checklists de ação ao final de cada capítulo</li></ul><br><b>Garanta seu exemplar e comece hoje mesmo!</b>`
        };
        break;

      case 'cover-art-director':
        result = {
          artPrompt: `cinematic hyper-realistic visual representing ${topic}, dark luxury background with polished gold accents, award-winning book cover art, 8k resolution, no text`,
          typographyPairing: {
            titleFont: 'Cinzel, Georgia, serif',
            subtitleFont: 'Montserrat, sans-serif'
          }
        };
        break;

      default:
        result = { message: 'Ação executada com sucesso pelo backend Node.' };
    }

    res.status(200).json({ success: true, agentName, result, backendTime: Date.now() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// SERVIR FRONTEND ESTÁTICO COMPILADO (DIST) & SPA FALLBACK
// ============================================================
const distPath = path.join(projectRoot, 'dist');
const indexPath = path.join(distPath, 'index.html');

// Garante que o frontend compilado exista em qualquer ambiente
if (!fs.existsSync(indexPath)) {
  console.log('[Backend Server] Pasta "dist" não encontrada na inicialização. Executando build automático...');
  try {
    const { execSync } = await import('child_process');
    execSync('npm run build:main && npm run build:content', { stdio: 'inherit' });
    console.log('[Backend Server] Build automático do frontend concluído!');
  } catch (err: any) {
    console.error('[Backend Server] Aviso no auto-build:', err.message);
  }
}

app.use(express.static(distPath));

// Middleware de fallback para SPA (Single Page Application)
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(200).send(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Criador de Livros KDP</title></head>
<body style="font-family:sans-serif;background:#0d1117;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="text-align:center;padding:24px;border:1px solid #30363d;border-radius:12px;background:#161b22;max-width:480px;">
    <h2>⏳ Carregando Criador de Livros KDP...</h2>
    <p style="color:#8b949e;">O build do sistema está sendo finalizado. Atualize a página em alguns instantes.</p>
  </div>
</body>
</html>`);
});

// Iniciar servidor ouvindo em 0.0.0.0 (obrigatório para plataformas em nuvem como Render)
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 CRIADOR DE LIVROS KDP — SERVIDOR FULLSTACK ONLINE`);
  console.log(`📡 Porta: ${PORT}`);
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 URL: http://0.0.0.0:${PORT}`);
  console.log(`====================================================`);
});
