import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Pool } from 'pg';

const scryptAsync = promisify(scrypt);
const SESSION_COOKIE = 'kdp_session';
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;
const REMEMBERED_SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 8 * 1024;
const MAX_PROJECT_BODY_BYTES = 50 * 1024 * 1024;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const rateLimits = new Map();

const PLAN_LIMITS = {
  free: { maxProjects: 3, maxStorageMB: 100, maxApiCallsDay: 100, features: ['gerador_basico', 'export_pdf'] },
  pro: { maxProjects: 50, maxStorageMB: 5000, maxApiCallsDay: 5000, features: ['gerador_basico', 'gerador_avancado', 'audiobook', 'coloring', 'export_pdf', 'export_epub', 'kdp_direct', 'analytics'] },
  enterprise: { maxProjects: -1, maxStorageMB: -1, maxApiCallsDay: -1, features: ['all'] }
};

function getPlanLimits(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

function hasFeature(plan, feature) {
  const limits = getPlanLimits(plan);
  return limits.features.includes('all') || limits.features.includes(feature);
}

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS kdp_users (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_token TEXT,
    verification_expires TIMESTAMPTZ,
    reset_token TEXT,
    reset_expires TIMESTAMPTZ,
    plan TEXT NOT NULL DEFAULT 'free',
    plan_expires TIMESTAMPTZ,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE UNIQUE INDEX IF NOT EXISTS kdp_users_email_lower_idx ON kdp_users (LOWER(email));
  CREATE INDEX IF NOT EXISTS kdp_users_verification_idx ON kdp_users (verification_token) WHERE verification_token IS NOT NULL;
  CREATE INDEX IF NOT EXISTS kdp_users_reset_idx ON kdp_users (reset_token) WHERE reset_token IS NOT NULL;

  CREATE TABLE IF NOT EXISTS kdp_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES kdp_users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS kdp_sessions_expiry_idx ON kdp_sessions (expires_at);

  CREATE TABLE IF NOT EXISTS kdp_book_projects (
    user_id BIGINT NOT NULL REFERENCES kdp_users(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL,
    project JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, project_id)
  );
  CREATE INDEX IF NOT EXISTS kdp_book_projects_updated_idx ON kdp_book_projects (user_id, updated_at DESC);

  CREATE TABLE IF NOT EXISTS kdp_user_records (
    user_id BIGINT NOT NULL REFERENCES kdp_users(id) ON DELETE CASCADE,
    collection TEXT NOT NULL,
    record_id TEXT NOT NULL,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, collection, record_id)
  );
  CREATE INDEX IF NOT EXISTS kdp_user_records_updated_idx ON kdp_user_records (user_id, collection, updated_at DESC);

  CREATE TABLE IF NOT EXISTS kdp_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    max_projects INT NOT NULL DEFAULT 3,
    max_storage_mb INT NOT NULL DEFAULT 100,
    max_api_calls_day INT NOT NULL DEFAULT 100,
    features JSONB NOT NULL DEFAULT '[]',
    price_monthly_cents INT NOT NULL DEFAULT 0,
    price_yearly_cents INT NOT NULL DEFAULT 0
  );
  INSERT INTO kdp_plans (id, name, max_projects, max_storage_mb, max_api_calls_day, features, price_monthly_cents, price_yearly_cents)
  VALUES 
    ('free', 'Gratuito', 3, 100, 100, '["gerador_basico", "export_pdf"]', 0, 0),
    ('pro', 'Profissional', 50, 5000, 5000, '["gerador_basico", "gerador_avancado", "audiobook", "coloring", "export_pdf", "export_epub", "kdp_direct", "analytics"]', 2900, 29000),
    ('enterprise', 'Empresarial', -1, -1, -1, '["all"]', 9900, 99000)
  ON CONFLICT (id) DO NOTHING;

  CREATE TABLE IF NOT EXISTS kdp_usage (
    user_id BIGINT NOT NULL REFERENCES kdp_users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    api_calls INT NOT NULL DEFAULT 0,
    storage_bytes BIGINT NOT NULL DEFAULT 0,
    projects_count INT NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, date)
  );
  CREATE INDEX IF NOT EXISTS kdp_usage_date_idx ON kdp_usage (date);

  CREATE TABLE IF NOT EXISTS kdp_audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES kdp_users(id) ON DELETE SET NULL,
    admin_id BIGINT REFERENCES kdp_users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB,
    ip TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS kdp_audit_log_user_idx ON kdp_audit_log (user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS kdp_audit_log_admin_idx ON kdp_audit_log (admin_id, created_at DESC);
`;

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Length', Buffer.byteLength(body));
  res.end(body);
}

function readRequestBody(req, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooLarge = false;
    const chunks = [];
    req.on('data', chunk => {
      if (tooLarge) return;
      size += chunk.length;
      if (size > maxBytes) {
        tooLarge = true;
        chunks.length = 0;
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) {
        reject(Object.assign(new Error('A requisição excedeu o tamanho permitido.'), { status: 413 }));
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(Object.assign(new Error('O formato da requisição é inválido.'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getCookie(req, name) {
  const cookieHeader = req.headers.cookie || '';
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      try {
        return decodeURIComponent(part.slice(separator + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function isSecureRequest(req) {
  return process.env.NODE_ENV === 'production' || req.headers['x-forwarded-proto'] === 'https';
}

function writeSessionCookie(req, res, token, rememberMe) {
  const maxAge = rememberMe ? `; Max-Age=${Math.floor(REMEMBERED_SESSION_DURATION_MS / 1000)}` : '';
  const secure = isSecureRequest(req) ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax${secure}${maxAge}`);
}

function clearSessionCookie(req, res) {
  const secure = isSecureRequest(req) ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax${secure}; Max-Age=0`);
}

function consumeRateLimit(key, limit) {
  const now = Date.now();
  const entry = rateLimits.get(key);
  if (!entry || now - entry.startedAt >= RATE_LIMIT_WINDOW_MS) {
    rateLimits.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

function validateSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    const forwardedProtocol = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
    const requestProtocol = forwardedProtocol || (req.socket?.encrypted ? 'https' : 'http');
    const requestHost = String(req.headers.host || '').toLowerCase();
    return originUrl.host.toLowerCase() === requestHost && originUrl.protocol === `${requestProtocol}:`;
  } catch {
    return false;
  }
}

async function sendVerificationEmail(email, token) {
  const verifyUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
  console.log(`[Email Verification] Para: ${email}\nLink: ${verifyUrl}`);
  if (process.env.SENDGRID_API_KEY || process.env.RESEND_API_KEY || process.env.SMTP_HOST) {
    // TODO: Implementar envio real via SendGrid/Resend/SMTP
  }
}

async function sendResetEmail(email, token) {
  const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  console.log(`[Password Reset] Para: ${email}\nLink: ${resetUrl}`);
  if (process.env.SENDGRID_API_KEY || process.env.RESEND_API_KEY || process.env.SMTP_HOST) {
    // TODO: Implementar envio real via SendGrid/Resend/SMTP
  }
}

async function logAudit(userId, adminId, action, details, req) {
  if (!pool) return;
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    const ua = req.headers['user-agent'] || 'unknown';
    await pool.query(
      'INSERT INTO kdp_audit_log (user_id, admin_id, action, details, ip, user_agent) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, adminId, action, JSON.stringify(details || {}), ip, ua]
    );
  } catch {}
}

export async function hashPassword(password, salt = randomBytes(16)) {
  const passwordHash = await scryptAsync(password, salt, 64);
  return { salt: Buffer.from(salt).toString('hex'), passwordHash: Buffer.from(passwordHash).toString('hex') };
}

export async function verifyPassword(password, saltHex, passwordHashHex) {
  const expected = Buffer.from(passwordHashHex, 'hex');
  const actual = Buffer.from(await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function createAuthApi(options = {}) {
  const pool = options.pool ?? (process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL })
    : null);
  let schemaReady = null;

  const ensureSchema = async () => {
    if (!pool) throw Object.assign(new Error('Autenticação não configurada: DATABASE_URL ausente.'), { status: 503, code: 'AUTH_NOT_CONFIGURED' });
    if (!schemaReady) {
      schemaReady = pool.query(SCHEMA_SQL).catch(error => {
        schemaReady = null;
        throw error;
      });
    }
    await schemaReady;
  };

  const createSession = async (client, req, res, userId, rememberMe) => {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = hashToken(token);
    const duration = rememberMe ? REMEMBERED_SESSION_DURATION_MS : SESSION_DURATION_MS;
    const expiresAt = new Date(Date.now() + duration);
    await client.query(
      'INSERT INTO kdp_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, tokenHash, expiresAt]
    );
    writeSessionCookie(req, res, token, rememberMe);
  };

  return async function handleAuthApi(req, res, requestUrl) {
    const { pathname } = requestUrl;
    const isUserDataRoute = pathname === '/api/user-data' || pathname.startsWith('/api/user-data/');
    if (
      !pathname.startsWith('/api/auth/') &&
      pathname !== '/api/projects' &&
      !pathname.startsWith('/api/projects/') &&
      !isUserDataRoute
    ) return false;
    const isProjectsRoute = pathname === '/api/projects' || pathname.startsWith('/api/projects/');
    let userDataParts = [];
    if (isUserDataRoute) {
      try {
        userDataParts = pathname.slice('/api/user-data'.length).split('/').filter(Boolean).map(decodeURIComponent);
      } catch {
        sendJson(res, 400, { success: false, code: 'INVALID_RECORD_ID', error: 'Identificador de registro inválido.' });
        return true;
      }
    }

    const route = isProjectsRoute
      ? pathname.slice('/api/projects'.length).replace(/\/+$/, '') || '/'
      : isUserDataRoute
        ? pathname.slice('/api/user-data'.length).replace(/\/+$/, '') || '/'
      : pathname.slice('/api/auth'.length).replace(/\/+$/, '') || '/';
    if ((isProjectsRoute || isUserDataRoute || route !== '/session' || req.headers.origin) && !validateSameOrigin(req)) {
      sendJson(res, 403, { success: false, code: 'INVALID_ORIGIN', error: 'Origem da requisição não permitida.' });
      return true;
    }
    if (!isProjectsRoute && !isUserDataRoute && !['/register', '/login', '/session', '/logout'].includes(route)) {
      sendJson(res, 404, { success: false, code: 'AUTH_ROUTE_NOT_FOUND', error: 'Rota de autenticação não encontrada.' });
      return true;
    }

    let projectId = null;
    if (isProjectsRoute && route !== '/') {
      try {
        projectId = decodeURIComponent(route.slice(1));
      } catch {
        sendJson(res, 400, { success: false, code: 'INVALID_PROJECT_ID', error: 'Identificador de projeto inválido.' });
        return true;
      }
    }
    const expectedMethod = isUserDataRoute
      ? userDataParts.length < 2
        ? 'GET'
        : ['GET', 'PUT', 'DELETE'].includes(req.method) ? req.method : 'GET'
      : isProjectsRoute
      ? route === '/' ? 'GET' : ['PUT', 'DELETE', 'GET'].includes(req.method) ? req.method : 'PUT'
      : route === '/session' ? 'GET' : 'POST';
    if (isProjectsRoute && route !== '/' && (!projectId || projectId.length > 160)) {
      sendJson(res, 400, { success: false, code: 'INVALID_PROJECT_ID', error: 'Identificador de projeto inválido.' });
      return true;
    }
    if (req.method !== expectedMethod) {
      res.setHeader('Allow', isProjectsRoute
        ? route === '/' ? 'GET' : 'GET, PUT, DELETE'
        : isUserDataRoute && userDataParts.length >= 2 ? 'GET, PUT, DELETE' : expectedMethod);
      sendJson(res, 405, { success: false, code: 'METHOD_NOT_ALLOWED', error: 'Método não permitido.' });
      return true;
    }

    if (!isProjectsRoute && (route === '/login' || route === '/register')) {
      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
      const maxAttempts = route === '/register' ? 5 : 12;
      if (!consumeRateLimit(`${route}:${ip}`, maxAttempts)) {
        sendJson(res, 429, { success: false, code: 'TOO_MANY_ATTEMPTS', error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' });
        return true;
      }
    }

    try {
      await ensureSchema();

      if (isProjectsRoute || isUserDataRoute) {
        const token = getCookie(req, SESSION_COOKIE);
        if (!token) {
          sendJson(res, 401, { success: false, code: 'AUTH_REQUIRED', error: 'Entre na sua conta para acessar os projetos.' });
          return true;
        }
        const session = await pool.query(
          `SELECT u.id, u.email, u.name
           FROM kdp_sessions s
           JOIN kdp_users u ON u.id = s.user_id
           WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
          [hashToken(token)]
        );
        const user = session.rows[0];
        if (!user) {
          clearSessionCookie(req, res);
          sendJson(res, 401, { success: false, code: 'AUTH_REQUIRED', error: 'Sua sessão expirou. Entre novamente.' });
          return true;
        }

        if (pathname === '/api/user-data' || pathname.startsWith('/api/user-data/')) {
          const collection = userDataParts[0];
          const recordId = userDataParts[1] || null;
          if (!['final-books', 'editorial-jobs'].includes(collection) || userDataParts.length > 2) {
            sendJson(res, 404, { success: false, code: 'USER_DATA_ROUTE_NOT_FOUND', error: 'Rota de dados não encontrada.' });
            return true;
          }
          const userId = user.id;
          if (!recordId && req.method === 'GET') {
            const result = await pool.query(
              'SELECT data FROM kdp_user_records WHERE user_id = $1 AND collection = $2 ORDER BY updated_at DESC',
              [userId, collection]
            );
            const records = result.rows.map(row => {
              if (collection !== 'final-books') return row.data;
              const { pdfBase64, ...metadata } = row.data;
              return metadata;
            });
            sendJson(res, 200, { success: true, records });
            return true;
          }
          if (!recordId || recordId.length > 160) {
            sendJson(res, 400, { success: false, code: 'INVALID_RECORD_ID', error: 'Identificador de registro inválido.' });
            return true;
          }
          if (req.method === 'GET') {
            const result = await pool.query(
              'SELECT data FROM kdp_user_records WHERE user_id = $1 AND collection = $2 AND record_id = $3',
              [userId, collection, recordId]
            );
            sendJson(res, 200, { success: true, record: result.rows[0]?.data || null });
            return true;
          }
          if (req.method === 'DELETE') {
            await pool.query(
              'DELETE FROM kdp_user_records WHERE user_id = $1 AND collection = $2 AND record_id = $3',
              [userId, collection, recordId]
            );
            sendJson(res, 200, { success: true });
            return true;
          }
          if (req.method !== 'PUT') {
            res.setHeader('Allow', recordId ? 'GET, PUT, DELETE' : 'GET');
            sendJson(res, 405, { success: false, code: 'METHOD_NOT_ALLOWED', error: 'Método não permitido.' });
            return true;
          }
          const data = await readRequestBody(req, MAX_PROJECT_BODY_BYTES);
          const record = data?.record;
          const recordIdValue = collection === 'editorial-jobs' ? record?.bookId : record?.id;
          if (!record || typeof record !== 'object' || Array.isArray(record) || String(recordIdValue) !== recordId) {
            sendJson(res, 400, { success: false, code: 'INVALID_RECORD', error: 'Os dados do registro são inválidos.' });
            return true;
          }
          await pool.query(
            `INSERT INTO kdp_user_records (user_id, collection, record_id, data, updated_at)
             VALUES ($1, $2, $3, $4::jsonb, NOW())
             ON CONFLICT (user_id, collection, record_id)
             DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
            [userId, collection, recordId, JSON.stringify(record)]
          );
          sendJson(res, 200, { success: true });
          return true;
        }

        if (route === '/') {
          const projects = await pool.query(
            'SELECT project FROM kdp_book_projects WHERE user_id = $1 ORDER BY updated_at DESC',
            [user.id]
          );
          sendJson(res, 200, { success: true, projects: projects.rows.map(row => row.project) });
          return true;
        }
        if (req.method === 'GET') {
          const result = await pool.query(
            'SELECT project FROM kdp_book_projects WHERE user_id = $1 AND project_id = $2',
            [user.id, projectId]
          );
          sendJson(res, 200, { success: true, project: result.rows[0]?.project || null });
          return true;
        }
        if (req.method === 'DELETE') {
          await pool.query(
            'DELETE FROM kdp_book_projects WHERE user_id = $1 AND project_id = $2',
            [user.id, projectId]
          );
          sendJson(res, 200, { success: true });
          return true;
        }

        const data = await readRequestBody(req, MAX_PROJECT_BODY_BYTES);
        const project = data?.project;
        if (!project || typeof project !== 'object' || Array.isArray(project) || project.id !== projectId) {
          sendJson(res, 400, { success: false, code: 'INVALID_PROJECT', error: 'Os dados do projeto são inválidos.' });
          return true;
        }

        const existing = await pool.query('SELECT 1 FROM kdp_book_projects WHERE user_id = $1 AND project_id = $2', [user.id, projectId]);
        if (!existing.rows[0]) {
          const planResult = await pool.query('SELECT plan FROM kdp_users WHERE id = $1', [user.id]);
          const limits = getPlanLimits(planResult.rows[0]?.plan || 'free');
          if (limits.maxProjects > 0) {
            const count = await pool.query('SELECT COUNT(*) FROM kdp_book_projects WHERE user_id = $1', [user.id]);
            if (parseInt(count.rows[0].count) >= limits.maxProjects) {
              sendJson(res, 403, { success: false, code: 'PLAN_LIMIT_EXCEEDED', error: `Limite de ${limits.maxProjects} projetos atingido. Faça upgrade do plano.` });
              return true;
            }
          }
        }

        await pool.query(
          `INSERT INTO kdp_book_projects (user_id, project_id, project, updated_at)
           VALUES ($1, $2, $3::jsonb, NOW())
           ON CONFLICT (user_id, project_id)
           DO UPDATE SET project = EXCLUDED.project, updated_at = NOW()`,
          [user.id, projectId, JSON.stringify(project)]
        );
        sendJson(res, 200, { success: true });
        return true;
      }

      if (route === '/session') {
        const token = getCookie(req, SESSION_COOKIE);
        if (!token) {
          sendJson(res, 200, { success: true, user: null });
          return true;
        }
        const result = await pool.query(
          `SELECT u.id, u.email, u.name, u.plan, u.email_verified
           FROM kdp_sessions s
           JOIN kdp_users u ON u.id = s.user_id
           WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
          [hashToken(token)]
        );
        if (!result.rows[0] && token) clearSessionCookie(req, res);
        sendJson(res, 200, {
          success: true,
          user: result.rows[0]
            ? { id: String(result.rows[0].id), email: result.rows[0].email, name: result.rows[0].name, plan: result.rows[0].plan, emailVerified: result.rows[0].email_verified }
            : null
        });
        return true;
      }

      if (route === '/logout') {
        const token = getCookie(req, SESSION_COOKIE);
        try {
          if (token) await pool.query('DELETE FROM kdp_sessions WHERE token_hash = $1', [hashToken(token)]);
        } finally {
          clearSessionCookie(req, res);
        }
        sendJson(res, 200, { success: true });
        return true;
      }

      const data = await readRequestBody(req);
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        sendJson(res, 400, { success: false, code: 'INVALID_REQUEST_BODY', error: 'O corpo da requisição é inválido.' });
        return true;
      }
      const email = normalizeEmail(data.email);
      const password = String(data.password || '');
      if (!isValidEmail(email)) {
        sendJson(res, 400, { success: false, code: 'INVALID_EMAIL', error: 'Informe um e-mail válido.' });
        return true;
      }
      if (password.length < 8 || password.length > 128) {
        sendJson(res, 400, { success: false, code: 'INVALID_PASSWORD', error: 'A senha precisa ter entre 8 e 128 caracteres.' });
        return true;
      }
      const rememberMe = data.rememberMe === true;

      if (route === '/register') {
        const name = String(data.name || '').trim();
        if (!name || name.length > 100) {
          sendJson(res, 400, { success: false, code: 'INVALID_NAME', error: 'Informe um nome com até 100 caracteres.' });
          return true;
        }

        const credentials = await hashPassword(password);
        const verifyToken = randomBytes(32).toString('base64url');
        const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const result = await client.query(
            `INSERT INTO kdp_users (email, name, password_salt, password_hash, verification_token, verification_expires, plan)
             VALUES ($1, $2, $3, $4, $5, $6, 'free')
             RETURNING id, email, name`,
            [email, name, credentials.salt, credentials.passwordHash, verifyToken, verifyExpires]
          );
          const user = result.rows[0];
          await createSession(client, req, res, user.id, rememberMe);
          await client.query('COMMIT');
          await sendVerificationEmail(email, verifyToken);
          sendJson(res, 201, { success: true, user: { id: String(user.id), email: user.email, name: user.name }, needsVerification: true });
        } catch (error) {
          clearSessionCookie(req, res);
          await client.query('ROLLBACK');
          if (error.code === '23505') {
            sendJson(res, 409, { success: false, code: 'ACCOUNT_EXISTS', error: 'Este e-mail já possui cadastro. Entre com sua senha.' });
            return true;
          }
          throw error;
        } finally {
          client.release();
        }
        return true;
      }

      const result = await pool.query(
        'SELECT id, email, name, password_salt, password_hash, plan, email_verified FROM kdp_users WHERE LOWER(email) = $1 LIMIT 1',
        [email]
      );
      const account = result.rows[0];
      if (!account || !(await verifyPassword(password, account.password_salt, account.password_hash))) {
        sendJson(res, 401, { success: false, code: 'INVALID_CREDENTIALS', error: 'E-mail ou senha incorretos. Se ainda não tem conta, cadastre-se para entrar.' });
        return true;
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM kdp_sessions WHERE user_id = $1 AND expires_at <= NOW()', [account.id]);
        await createSession(client, req, res, account.id, rememberMe);
        await client.query('COMMIT');
      } catch (error) {
        clearSessionCookie(req, res);
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      sendJson(res, 200, { success: true, user: { id: String(account.id), email: account.email, name: account.name, plan: account.plan, emailVerified: account.email_verified } });
      return true;

      // ========== NOVAS ROTAS ==========

      if (route === '/verify-email/send') {
        if (req.method !== 'POST') return sendJson(res, 405, { success: false, error: 'Método não permitido' });
        const token = randomBytes(32).toString('base64url');
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await pool.query(
          'UPDATE kdp_users SET verification_token = $1, verification_expires = $2 WHERE LOWER(email) = $3',
          [token, expires, email]
        );
        await sendVerificationEmail(email, token);
        sendJson(res, 200, { success: true, message: 'E-mail de verificação enviado' });
        return true;
      }

      if (route === '/verify-email/confirm') {
        if (req.method !== 'POST') return sendJson(res, 405, { success: false, error: 'Método não permitido' });
        const { token } = await readRequestBody(req);
        const result = await pool.query(
          'SELECT id, email_verified FROM kdp_users WHERE verification_token = $1 AND verification_expires > NOW()',
          [token]
        );
        if (!result.rows[0]) {
          sendJson(res, 400, { success: false, code: 'INVALID_TOKEN', error: 'Token inválido ou expirado' });
          return true;
        }
        await pool.query(
          'UPDATE kdp_users SET email_verified = TRUE, verification_token = NULL, verification_expires = NULL WHERE id = $1',
          [result.rows[0].id]
        );
        sendJson(res, 200, { success: true, message: 'E-mail verificado com sucesso' });
        return true;
      }

      if (route === '/password/reset/request') {
        if (req.method !== 'POST') return sendJson(res, 405, { success: false, error: 'Método não permitido' });
        const account = await pool.query('SELECT id, email FROM kdp_users WHERE LOWER(email) = $1', [email]);
        if (account.rows[0]) {
          const token = randomBytes(32).toString('base64url');
          const expires = new Date(Date.now() + 60 * 60 * 1000);
          await pool.query(
            'UPDATE kdp_users SET reset_token = $1, reset_expires = $2 WHERE id = $3',
            [token, expires, account.rows[0].id]
          );
          await sendResetEmail(account.rows[0].email, token);
        }
        sendJson(res, 200, { success: true, message: 'Se o e-mail existir, você receberá instruções' });
        return true;
      }

      if (route === '/password/reset/confirm') {
        if (req.method !== 'POST') return sendJson(res, 405, { success: false, error: 'Método não permitido' });
        const { token, password: newPassword } = await readRequestBody(req);
        if (!newPassword || newPassword.length < 8 || newPassword.length > 128) {
          sendJson(res, 400, { success: false, code: 'INVALID_PASSWORD', error: 'Senha deve ter 8-128 caracteres' });
          return true;
        }
        const result = await pool.query(
          'SELECT id FROM kdp_users WHERE reset_token = $1 AND reset_expires > NOW()',
          [token]
        );
        if (!result.rows[0]) {
          sendJson(res, 400, { success: false, code: 'INVALID_TOKEN', error: 'Token inválido ou expirado' });
          return true;
        }
        const credentials = await hashPassword(newPassword);
        await pool.query(
          'UPDATE kdp_users SET password_salt = $1, password_hash = $2, reset_token = NULL, reset_expires = NULL WHERE id = $3',
          [credentials.salt, credentials.passwordHash, result.rows[0].id]
        );
        await pool.query('DELETE FROM kdp_sessions WHERE user_id = $1', [result.rows[0].id]);
        sendJson(res, 200, { success: true, message: 'Senha alterada. Faça login novamente.' });
        return true;
      }

      if (route === '/plan') {
        if (req.method !== 'GET') return sendJson(res, 405, { success: false, error: 'Método não permitido' });
        const token = getCookie(req, SESSION_COOKIE);
        if (!token) return sendJson(res, 401, { success: false, code: 'AUTH_REQUIRED', error: 'Entre na sua conta' });
        const session = await pool.query(
          `SELECT u.id, u.plan, u.plan_expires, p.max_projects, p.max_storage_mb, p.max_api_calls_day, p.features
           FROM kdp_users u
           JOIN kdp_plans p ON p.id = u.plan
           JOIN kdp_sessions s ON s.user_id = u.id
           WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
          [hashToken(token)]
        );
        if (!session.rows[0]) return sendJson(res, 401, { success: false, code: 'AUTH_REQUIRED', error: 'Sessão expirada' });
        const user = session.rows[0];
        const usage = await pool.query(
          'SELECT api_calls, storage_bytes, projects_count FROM kdp_usage WHERE user_id = $1 AND date = CURRENT_DATE',
          [user.id]
        );
        const u = usage.rows[0] || { api_calls: 0, storage_bytes: 0, projects_count: 0 };
        sendJson(res, 200, {
          success: true,
          plan: user.plan,
          planExpires: user.plan_expires,
          limits: { maxProjects: user.max_projects, maxStorageMB: user.max_storage_mb, maxApiCallsDay: user.max_api_calls_day, features: user.features },
          usage: { apiCalls: u.api_calls, storageMB: Math.round(u.storage_bytes / 1024 / 1024), projectsCount: u.projects_count }
        });
        return true;
      }

      if (route === '/usage/increment') {
        if (req.method !== 'POST') return sendJson(res, 405, { success: false, error: 'Método não permitido' });
        const token = getCookie(req, SESSION_COOKIE);
        if (!token) return sendJson(res, 401, { success: false, code: 'AUTH_REQUIRED', error: 'Entre na sua conta' });
        const { type, amount = 1 } = await readRequestBody(req);
        const session = await pool.query(
          'SELECT u.id, u.plan FROM kdp_users u JOIN kdp_sessions s ON s.user_id = u.id WHERE s.token_hash = $1 AND s.expires_at > NOW()',
          [hashToken(token)]
        );
        if (!session.rows[0]) return sendJson(res, 401, { success: false, code: 'AUTH_REQUIRED', error: 'Sessão expirada' });
        const { id, plan } = session.rows[0];
        const limits = getPlanLimits(plan);
        if (type === 'api_call' && limits.maxApiCallsDay > 0) {
          await pool.query(
            `INSERT INTO kdp_usage (user_id, date, api_calls) VALUES ($1, CURRENT_DATE, $2)
             ON CONFLICT (user_id, date) DO UPDATE SET api_calls = kdp_usage.api_calls + $2`,
            [id, amount]
          );
        } else if (type === 'storage' && limits.maxStorageMB > 0) {
          await pool.query(
            `INSERT INTO kdp_usage (user_id, date, storage_bytes) VALUES ($1, CURRENT_DATE, $2)
             ON CONFLICT (user_id, date) DO UPDATE SET storage_bytes = kdp_usage.storage_bytes + $2`,
            [id, amount]
          );
        } else if (type === 'project' && limits.maxProjects > 0) {
          await pool.query(
            `INSERT INTO kdp_usage (user_id, date, projects_count) VALUES ($1, CURRENT_DATE, $2)
             ON CONFLICT (user_id, date) DO UPDATE SET projects_count = kdp_usage.projects_count + $2`,
            [id, amount]
          );
        }
        sendJson(res, 200, { success: true });
        return true;
      }

      if (route === '/admin/stats') {
        if (req.method !== 'GET') return sendJson(res, 405, { success: false, error: 'Método não permitido' });
        const token = getCookie(req, SESSION_COOKIE);
        if (!token) return sendJson(res, 401, { success: false, code: 'AUTH_REQUIRED', error: 'Entre na sua conta' });
        const session = await pool.query(
          'SELECT u.is_admin FROM kdp_users u JOIN kdp_sessions s ON s.user_id = u.id WHERE s.token_hash = $1 AND s.expires_at > NOW()',
          [hashToken(token)]
        );
        if (!session.rows[0]?.is_admin) return sendJson(res, 403, { success: false, code: 'ADMIN_REQUIRED', error: 'Acesso negado' });
        const stats = await pool.query(`
          SELECT 
            (SELECT COUNT(*) FROM kdp_users) as total_users,
            (SELECT COUNT(*) FROM kdp_users WHERE email_verified) as verified_users,
            (SELECT COUNT(*) FROM kdp_users WHERE plan = 'pro') as pro_users,
            (SELECT COUNT(*) FROM kdp_users WHERE plan = 'enterprise') as enterprise_users,
            (SELECT COUNT(*) FROM kdp_book_projects) as total_projects,
            (SELECT COUNT(*) FROM kdp_sessions WHERE expires_at > NOW()) as active_sessions,
            (SELECT SUM(projects_count) FROM kdp_usage WHERE date = CURRENT_DATE) as projects_today,
            (SELECT SUM(api_calls) FROM kdp_usage WHERE date = CURRENT_DATE) as api_calls_today
        `);
        sendJson(res, 200, { success: true, stats: stats.rows[0] });
        return true;
      }

      if (route === '/admin/users') {
        if (req.method !== 'GET') return sendJson(res, 405, { success: false, error: 'Método não permitido' });
        const token = getCookie(req, SESSION_COOKIE);
        if (!token) return sendJson(res, 401, { success: false, code: 'AUTH_REQUIRED', error: 'Entre na sua conta' });
        const session = await pool.query(
          'SELECT u.is_admin FROM kdp_users u JOIN kdp_sessions s ON s.user_id = u.id WHERE s.token_hash = $1 AND s.expires_at > NOW()',
          [hashToken(token)]
        );
        if (!session.rows[0]?.is_admin) return sendJson(res, 403, { success: false, code: 'ADMIN_REQUIRED', error: 'Acesso negado' });
        const { page = 1, limit = 50, search, plan } = Object.fromEntries(requestUrl.searchParams);
        const offset = (page - 1) * limit;
        let where = '1=1';
        const params = [];
        if (search) { where += ' AND (email ILIKE $' + (params.length + 1) + ' OR name ILIKE $' + (params.length + 1) + ')'; params.push(`%${search}%`); }
        if (plan) { where += ' AND plan = $' + (params.length + 1); params.push(plan); }
        params.push(limit, offset);
        const users = await pool.query(
          `SELECT id, email, name, plan, plan_expires, email_verified, is_admin, created_at 
           FROM kdp_users WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
          params
        );
        const total = await pool.query(`SELECT COUNT(*) FROM kdp_users WHERE ${where}`, params.slice(0, -2));
        sendJson(res, 200, { success: true, users: users.rows, total: parseInt(total.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
        return true;
      }

      if (route.startsWith('/admin/users/') && req.method === 'PUT') {
        const token = getCookie(req, SESSION_COOKIE);
        if (!token) return sendJson(res, 401, { success: false, code: 'AUTH_REQUIRED', error: 'Entre na sua conta' });
        const session = await pool.query(
          'SELECT u.is_admin FROM kdp_users u JOIN kdp_sessions s ON s.user_id = u.id WHERE s.token_hash = $1 AND s.expires_at > NOW()',
          [hashToken(token)]
        );
        if (!session.rows[0]?.is_admin) return sendJson(res, 403, { success: false, code: 'ADMIN_REQUIRED', error: 'Acesso negado' });
        const targetId = route.split('/')[3];
        const { plan, is_admin, email_verified } = await readRequestBody(req);
        const updates = [];
        const values = [];
        if (plan) { updates.push('plan = $' + (values.length + 1)); values.push(plan); }
        if (typeof is_admin === 'boolean') { updates.push('is_admin = $' + (values.length + 1)); values.push(is_admin); }
        if (typeof email_verified === 'boolean') { updates.push('email_verified = $' + (values.length + 1)); values.push(email_verified); }
        if (updates.length === 0) return sendJson(res, 400, { success: false, error: 'Nada para atualizar' });
        values.push(targetId);
        await pool.query(`UPDATE kdp_users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${values.length}`, values);
        await logAudit(null, session.rows[0].id, 'admin_update_user', { targetId, changes: { plan, is_admin, email_verified } }, req);
        sendJson(res, 200, { success: true });
        return true;
      }

    } catch (error) {
      if (error.status) {
        sendJson(res, error.status, { success: false, code: error.code || 'AUTH_REQUEST_FAILED', error: error.message });
        return true;
      }
      console.error(`[Auth] Falha em ${route}:`, error);
      sendJson(res, 503, { success: false, code: 'AUTH_SERVICE_UNAVAILABLE', error: 'O serviço de contas está indisponível. Tente novamente mais tarde.' });
      return true;
    }
  };
}

export const handleAuthApi = createAuthApi();
