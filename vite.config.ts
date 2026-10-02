import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path, { resolve } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Plugin de Backend Node com Agentes de IA Especializados para Amazon KDP
function kdpAiBackendPlugin() {
  return {
    name: 'kdp-ai-backend-middleware',
    configureServer(server: any) {
      server.middlewares.use('/api/kdp-agents', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const { agentName, action, payload } = data;
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
                  prose: `# Capítulo ${payload.chapterIndex || 1}: ${payload.chapterTitle || 'Fundamentos e Clareza'}\n\nPara transformar a forma como você aborda ${topic}, precisamos primeiro eliminar os mitos comuns.\n\nO verdadeiro sucesso não decorre de fórmulas mágicas ou atalhos instantâneos, mas de princípios sólidos aplicados com constância.\n\nNeste capítulo, você descobrirá como estruturar sua mente, organizar suas prioridades e iniciar a execução prática imediatamente.`,
                  wordCount: 160,
                  readabilityScore: 96
                };
                break;

              case 'copywriter':
                result = {
                  headline: `Domine ${topic} e transforme seus resultados de forma definitiva.`,
                  blurb: `<b>Você está pronto para alcançar o próximo nível?</b><br><br>Em <i>${payload.project?.title || topic}</i>, você terá acesso a um passo a passo claro e validado para dominar ${topic}.<br><br><b>O que este livro entrega:</b><br><ul><li>Frameworks práticos e descomplicados</li><li>Estudos de caso reais de transformação</li><li>Checklists de ação ao final de cada capítulo</li></ul><br><b>Garanta seu exemplar e comece hoje mesmo!</b>`
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

            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, agentName, result, backendTime: Date.now() }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
      });

      // Endpoints de Capas 100% no Backend (Chromium Privado + Gemini)
      server.middlewares.use('/api/covers', async (req: any, res: any, next: any) => {
        const url = req.url || '';

        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        try {
          const { BackendCoverService } = await import('./src/services/backend-cover-service');

          // Rota: GET /api/covers/api-key-status
          if (req.method === 'GET' && (url === '/api-key-status' || url === '/api-key-status/')) {
            const status = BackendCoverService.getApiKeyStatus();
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, ...status }));
            return;
          }

          // Rota: POST /api/covers/save-api-key
          if (req.method === 'POST' && (url === '/save-api-key' || url === '/save-api-key/')) {
            let body = '';
            req.on('data', (chunk: any) => { body += chunk; });
            req.on('end', () => {
              try {
                const { apiKey } = JSON.parse(body || '{}');
                const result = BackendCoverService.saveApiKey(apiKey || '');
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = result.success ? 200 : 400;
                res.end(JSON.stringify(result));
              } catch (err: any) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            });
            return;
          }

          // Rota: POST /api/covers/generate
          if (req.method === 'POST' && (url === '/generate' || url === '/generate/')) {
            let body = '';
            req.on('data', (chunk: any) => { body += chunk; });
            req.on('end', async () => {
              try {
                const payload = JSON.parse(body || '{}');
                const progress = await BackendCoverService.startCoverGeneration(payload);
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 200;
                res.end(JSON.stringify({
                  success: true,
                  jobId: progress.jobId,
                  status: progress.status,
                  stepLabel: progress.stepLabel
                }));
              } catch (err: any) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            });
            return;
          }

          // Rota: GET /api/covers/status/:jobId
          if (req.method === 'GET' && url.startsWith('/status/')) {
            const jobId = url.replace('/status/', '').split('?')[0];
            const status = BackendCoverService.getJobStatus(jobId);
            res.setHeader('Content-Type', 'application/json');
            if (status) {
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, ...status }));
            } else {
              res.statusCode = 404;
              res.end(JSON.stringify({ success: false, error: 'Tarefa de capa não encontrada' }));
            }
            return;
          }

          // Rota: GET /api/covers/list/:projectId
          if (req.method === 'GET' && url.startsWith('/list/')) {
            const projectId = url.replace('/list/', '').split('?')[0];
            const covers = BackendCoverService.getProjectCovers(projectId);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, covers }));
            return;
          }

          // Rota: POST /api/covers/select
          if (req.method === 'POST' && (url === '/select' || url === '/select/')) {
            let body = '';
            req.on('data', (chunk: any) => { body += chunk; });
            req.on('end', () => {
              try {
                const { projectId, coverId } = JSON.parse(body || '{}');
                const selected = BackendCoverService.selectCover(projectId, coverId);
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 200;
                res.end(JSON.stringify({ success: !!selected, selectedCover: selected }));
              } catch (err: any) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            });
            return;
          }

          // Rota: GET /api/covers/:projectId/:fileName (Serve a imagem PNG do storage)
          const parts = url.split('?')[0].split('/').filter(Boolean);
          if (req.method === 'GET' && parts.length === 2) {
            const [projId, fileName] = parts;
            const filePath = path.join(process.cwd(), 'covers', projId, fileName);
            if (fs.existsSync(filePath)) {
              const fileContent = fs.readFileSync(filePath);
              res.setHeader('Content-Type', 'image/png');
              res.statusCode = 200;
              res.end(fileContent);
              return;
            }
          }

          next();
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });

      // Middleware de Inteligência de Mercado ao Vivo da Amazon Books
      server.middlewares.use('/api/amazon', async (req: any, res: any, next: any) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        try {
          const { AmazonLiveService } = await import('./src/services/amazon-live-service');
          const reqUrl = new URL(req.url, 'http://localhost');
          const pathname = reqUrl.pathname;

          if (pathname === '/search' || pathname === '/search/') {
            const query = reqUrl.searchParams.get('query') || 'bestseller books';
            const limit = parseInt(reqUrl.searchParams.get('limit') || '8', 10);
            const books = await AmazonLiveService.searchAmazonBooks(query, limit);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, count: books.length, books }));
            return;
          }

          if (pathname === '/suggestions' || pathname === '/suggestions/') {
            const prefix = reqUrl.searchParams.get('prefix') || '';
            const suggestions = await AmazonLiveService.getLiveSuggestions(prefix);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, suggestions }));
            return;
          }

          next();
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
    }
  };
}

export default defineConfig({
  base: '',
  plugins: [react(), kdpAiBackendPlugin()],
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['antigravity-kit-2.0/**', 'show-me-the-story/**', 'node_modules/**']
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        popup: resolve(__dirname, 'popup.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        background: resolve(__dirname, 'src/background/index.ts')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') {
            return 'background.js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  }
});
