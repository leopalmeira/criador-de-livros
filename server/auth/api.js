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

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS kdp_users (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE UNIQUE INDEX IF NOT EXISTS kdp_users_email_lower_idx ON kdp_users (LOWER(email));
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
          `SELECT u.id, u.email, u.name
           FROM kdp_sessions s
           JOIN kdp_users u ON u.id = s.user_id
           WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
          [hashToken(token)]
        );
        if (!result.rows[0] && token) clearSessionCookie(req, res);
        sendJson(res, 200, {
          success: true,
          user: result.rows[0]
            ? { id: String(result.rows[0].id), email: result.rows[0].email, name: result.rows[0].name }
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
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const result = await client.query(
            `INSERT INTO kdp_users (email, name, password_salt, password_hash)
             VALUES ($1, $2, $3, $4)
             RETURNING id, email, name`,
            [email, name, credentials.salt, credentials.passwordHash]
          );
          const user = result.rows[0];
          await createSession(client, req, res, user.id, rememberMe);
          await client.query('COMMIT');
          sendJson(res, 201, { success: true, user: { id: String(user.id), email: user.email, name: user.name } });
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
        'SELECT id, email, name, password_salt, password_hash FROM kdp_users WHERE LOWER(email) = $1 LIMIT 1',
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
      sendJson(res, 200, { success: true, user: { id: String(account.id), email: account.email, name: account.name } });
      return true;
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
