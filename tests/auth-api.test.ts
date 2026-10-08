import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { createAuthApi } from '../server/auth/api.js';

class MemoryPool {
  users = [];
  sessions = [];
  projects = new Map();
  records = new Map();
  nextUserId = 1;

  async connect() {
    return {
      query: (sql, values) => this.query(sql, values),
      release() {}
    };
  }

  async query(sql, values = []) {
    const normalizedSql = sql.replace(/\s+/g, ' ').trim();
    if (normalizedSql.startsWith('CREATE ')) return { rows: [] };
    if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(normalizedSql)) return { rows: [] };

    if (normalizedSql.startsWith('INSERT INTO kdp_users')) {
      if (this.users.some(user => user.email === values[0])) {
        throw Object.assign(new Error('duplicate'), { code: '23505' });
      }
      const user = {
        id: this.nextUserId++,
        email: values[0],
        name: values[1],
        password_salt: values[2],
        password_hash: values[3]
      };
      this.users.push(user);
      return { rows: [{ id: user.id, email: user.email, name: user.name }] };
    }

    if (normalizedSql.startsWith('INSERT INTO kdp_sessions')) {
      this.sessions.push({ userId: values[0], tokenHash: values[1], expiresAt: values[2] });
      return { rows: [] };
    }

    if (normalizedSql.startsWith('SELECT id, email, name, password_salt, password_hash FROM kdp_users')) {
      return { rows: this.users.filter(user => user.email === values[0]) };
    }

    if (normalizedSql.includes('FROM kdp_sessions s') && normalizedSql.includes('JOIN kdp_users u')) {
      const session = this.sessions.find(item => item.tokenHash === values[0] && item.expiresAt > new Date());
      const user = this.users.find(item => item.id === session?.userId);
      return { rows: user ? [{ id: user.id, email: user.email, name: user.name }] : [] };
    }

    if (normalizedSql.startsWith('DELETE FROM kdp_sessions WHERE user_id')) {
      this.sessions = this.sessions.filter(item => item.userId !== values[0]);
      return { rows: [] };
    }
    if (normalizedSql.startsWith('DELETE FROM kdp_sessions WHERE token_hash')) {
      this.sessions = this.sessions.filter(item => item.tokenHash !== values[0]);
      return { rows: [] };
    }

    if (normalizedSql.startsWith('INSERT INTO kdp_book_projects')) {
      this.projects.set(`${values[0]}:${values[1]}`, JSON.parse(values[2]));
      return { rows: [] };
    }

    if (normalizedSql.startsWith('SELECT project FROM kdp_book_projects WHERE user_id = $1 AND project_id = $2')) {
      const project = this.projects.get(`${values[0]}:${values[1]}`);
      return { rows: project ? [{ project }] : [] };
    }

    if (normalizedSql.startsWith('SELECT project FROM kdp_book_projects WHERE user_id = $1 ORDER BY')) {
      const projects = [...this.projects.entries()]
        .filter(([key]) => key.startsWith(`${values[0]}:`))
        .map(([, project]) => ({ project }));
      return { rows: projects };
    }

    if (normalizedSql.startsWith('INSERT INTO kdp_user_records')) {
      this.records.set(`${values[0]}:${values[1]}:${values[2]}`, JSON.parse(values[3]));
      return { rows: [] };
    }

    if (normalizedSql.startsWith('SELECT data FROM kdp_user_records WHERE user_id = $1 AND collection = $2 AND record_id = $3')) {
      const record = this.records.get(`${values[0]}:${values[1]}:${values[2]}`);
      return { rows: record ? [{ data: record }] : [] };
    }

    if (normalizedSql.startsWith('SELECT data FROM kdp_user_records WHERE user_id = $1 AND collection = $2 ORDER BY')) {
      const records = [...this.records.entries()]
        .filter(([key]) => key.startsWith(`${values[0]}:${values[1]}:`))
        .map(([, data]) => ({ data }));
      return { rows: records };
    }

    if (normalizedSql.startsWith('DELETE FROM kdp_user_records')) {
      this.records.delete(`${values[0]}:${values[1]}:${values[2]}`);
      return { rows: [] };
    }

    throw new Error(`SQL de teste não implementado: ${normalizedSql}`);
  }
}

async function callApi(handler, method, path, { body, cookie } = {}) {
  const req = new PassThrough();
  req.method = method;
  req.url = path;
  req.headers = {
    host: 'localhost',
    ...(cookie ? { cookie } : {}),
    ...(body === undefined ? {} : { 'content-type': 'application/json' })
  };
  req.socket = { remoteAddress: '127.0.0.1' };

  const headers = {};
  const res = {
    statusCode: 200,
    setHeader(name, value) { headers[name.toLowerCase()] = value; },
    end(value = '') { this.body = value; }
  };
  const handling = handler(req, res, new URL(path, 'http://localhost'));
  req.end(body === undefined ? undefined : JSON.stringify(body));
  await handling;
  return {
    status: res.statusCode,
    headers,
    json: JSON.parse(res.body || '{}')
  };
}

describe('API de contas e dados isolados por cliente', () => {
  it('exige uma conta cadastrada e separa os projetos de cada cliente', async () => {
    const pool = new MemoryPool();
    const api = createAuthApi({ pool });
    const register = (email, name) => callApi(api, 'POST', '/api/auth/register', {
      body: { email, name, password: 'senha-segura', rememberMe: true }
    });

    const firstAccount = await register('cliente1@example.com', 'Cliente 1');
    const secondAccount = await register('cliente2@example.com', 'Cliente 2');
    expect(firstAccount.status).toBe(201);
    expect(secondAccount.status).toBe(201);

    const firstCookie = firstAccount.headers['set-cookie'].split(';')[0];
    const secondCookie = secondAccount.headers['set-cookie'].split(';')[0];
    const project = { id: 'book-1', title: 'Livro privado', kdpChapters: [{ title: 'Capítulo', content: 'Texto' }] };
    expect((await callApi(api, 'PUT', '/api/projects/book-1', {
      body: { project },
      cookie: firstCookie
    })).status).toBe(200);

    const firstProjects = await callApi(api, 'GET', '/api/projects', { cookie: firstCookie });
    const secondProjects = await callApi(api, 'GET', '/api/projects', { cookie: secondCookie });
    expect(firstProjects.json.projects).toEqual([project]);
    expect(secondProjects.json.projects).toEqual([]);
  });

  it('não permite entrar sem conta cadastrada e rejeita senha incorreta', async () => {
    const api = createAuthApi({ pool: new MemoryPool() });

    const missingAccount = await callApi(api, 'POST', '/api/auth/login', {
      body: { email: 'nao-existe@example.com', password: 'senha-segura' }
    });
    expect(missingAccount.status).toBe(401);

    await callApi(api, 'POST', '/api/auth/register', {
      body: { email: 'cliente@example.com', name: 'Cliente', password: 'senha-segura' }
    });
    const wrongPassword = await callApi(api, 'POST', '/api/auth/login', {
      body: { email: 'cliente@example.com', password: 'senha-errada' }
    });
    expect(wrongPassword.status).toBe(401);
  });

  it('mantém livros finais separados e invalida a sessão ao sair', async () => {
    const api = createAuthApi({ pool: new MemoryPool() });
    const first = await callApi(api, 'POST', '/api/auth/register', {
      body: { email: 'final1@example.com', name: 'Cliente 1', password: 'senha-segura' }
    });
    const second = await callApi(api, 'POST', '/api/auth/register', {
      body: { email: 'final2@example.com', name: 'Cliente 2', password: 'senha-segura' }
    });
    const firstCookie = first.headers['set-cookie'].split(';')[0];
    const secondCookie = second.headers['set-cookie'].split(';')[0];
    const finalBook = { id: 'final-1', bookId: 'book-1', title: 'PDF privado', pdfBase64: 'cGRm' };

    expect((await callApi(api, 'PUT', '/api/user-data/final-books/final-1', {
      body: { record: finalBook },
      cookie: firstCookie
    })).status).toBe(200);
    expect((await callApi(api, 'GET', '/api/user-data/final-books', { cookie: secondCookie })).json.records).toEqual([]);
    expect((await callApi(api, 'GET', '/api/user-data/final-books', { cookie: firstCookie })).json.records)
      .toEqual([{ id: finalBook.id, bookId: finalBook.bookId, title: finalBook.title }]);

    await callApi(api, 'POST', '/api/auth/logout', { cookie: firstCookie });
    expect((await callApi(api, 'GET', '/api/projects', { cookie: firstCookie })).status).toBe(401);
  });

  it('retorna erro explícito quando DATABASE_URL não está configurada', async () => {
    const api = createAuthApi({ pool: null });
    const response = await callApi(api, 'GET', '/api/auth/session');
    expect(response.status).toBe(503);
    expect(response.json.code).toBe('AUTH_NOT_CONFIGURED');
  });
});
