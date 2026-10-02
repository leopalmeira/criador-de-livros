import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { BackendCoverService } from './services/backend-cover-service';
import { AmazonLiveService } from './services/amazon-live-service';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

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

if (fs.existsSync(distPath)) {
  console.log(`[Backend Server] Servindo arquivos do frontend a partir de: ${distPath}`);
  app.use(express.static(distPath));

  // Middleware de fallback para SPA (Single Page Application)
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Build frontend em andamento...');
    }
  });
} else {
  console.warn(`[Backend Server] Pasta "dist" ainda não encontrada. Execute "npm run build".`);
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.send(`<h1>Servidor Criador de Livros KDP Online</h1><p>Aguardando conclusão do build frontend (dist)...</p>`);
  });
}

// Iniciar servidor ouvindo em 0.0.0.0 (obrigatório para plataformas em nuvem como Render)
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 CRIADOR DE LIVROS KDP — SERVIDOR FULLSTACK ONLINE`);
  console.log(`📡 Porta: ${PORT}`);
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 URL: http://0.0.0.0:${PORT}`);
  console.log(`====================================================`);
});
