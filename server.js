// ============================================================
// SERVIDOR DE ENTRADA PRODUÇÃO — RENDER / CLOUD DEPLOY
// Executa o servidor TypeScript com suporte nativo a ESM via tsx
// ============================================================

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  const serverPath = path.join(__dirname, 'src', 'server.ts');
  execSync(`npx tsx "${serverPath}"`, {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: process.env.PORT || '10000',
      NODE_ENV: process.env.NODE_ENV || 'production'
    }
  });
} catch (e) {
  process.exit(e.status || 1);
}
