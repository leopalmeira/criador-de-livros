import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const STORE_PATH = path.join(DATA_DIR, 'auth-store.json');

// Garante que o diretório data exista
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {}
}

async function hashPassword(password, salt = randomBytes(16)) {
  const passwordHash = await scryptAsync(password, salt, 64);
  return {
    salt: Buffer.from(salt).toString('hex'),
    passwordHash: Buffer.from(passwordHash).toString('hex')
  };
}

// Estrutura padrão inicial do banco de dados local
function getInitialData() {
  return {
    users: [],
    sessions: [],
    projects: [],
    records: [],
    usage: [],
    audit_log: [],
    nextUserId: 1
  };
}

class LocalFileStore {
  constructor() {
    this.storePath = STORE_PATH;
    this.data = null;
    this.isLoaded = false;
    this.saveTimeout = null;
  }

  load() {
    if (this.isLoaded && this.data) return this.data;

    try {
      if (fs.existsSync(this.storePath)) {
        const raw = fs.readFileSync(this.storePath, 'utf8');
        this.data = JSON.parse(raw);
        if (!this.data.users) this.data = getInitialData();
      } else {
        this.data = getInitialData();
        this.persistImmediate();
      }
    } catch (err) {
      console.warn('[FileStore] Aviso ao ler auth-store.json, criando novo estado:', err.message);
      this.data = getInitialData();
    }

    this.isLoaded = true;
    return this.data;
  }

  persistImmediate() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(this.storePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('[FileStore] Erro ao salvar auth-store.json:', err.message);
    }
  }

  scheduleSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.persistImmediate();
      this.saveTimeout = null;
    }, 100);
  }

  async ensureDefaultAdmin() {
    this.load();
    const adminEmail = 'leandro2703palmeira@gmail.com';
    let admin = this.data.users.find(u => u.email.toLowerCase() === adminEmail.toLowerCase());

    if (!admin) {
      const creds = await hashPassword('123456');
      admin = {
        id: String(this.data.nextUserId++),
        email: adminEmail,
        name: 'Leandro Palmeira',
        password_salt: creds.salt,
        password_hash: creds.passwordHash,
        email_verified: true,
        plan: 'enterprise',
        is_admin: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.data.users.push(admin);
      this.persistImmediate();
      console.log(`[FileStore] 👑 Administrador oficial configurado: ${adminEmail} (senha: 123456)`);
    } else if (!admin.is_admin || admin.plan !== 'enterprise') {
      admin.is_admin = true;
      admin.plan = 'enterprise';
      admin.updated_at = new Date().toISOString();
      this.persistImmediate();
    }
  }
}

export const localFileStore = new LocalFileStore();

/**
 * Cria um adaptador de Pool compatível com a interface do PostgreSQL (pg.Pool)
 * mas usando o armazenamento local persistente em arquivo json.
 */
export class FileStorePool {
  constructor() {
    this.store = localFileStore;
    this.readyPromise = this.store.ensureDefaultAdmin();
  }

  async connect() {
    await this.readyPromise;
    return {
      query: (sql, values) => this.query(sql, values),
      release: () => {}
    };
  }

  async query(sql, values = []) {
    await this.readyPromise;
    const data = this.store.load();
    const normalized = sql.replace(/\s+/g, ' ').trim();

    // Comandos DDL / Transações: no-op com sucesso
    if (normalized.startsWith('CREATE ') || normalized.startsWith('INSERT INTO kdp_plans')) {
      return { rows: [] };
    }
    if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(normalized)) {
      if (normalized === 'COMMIT') this.store.scheduleSave();
      return { rows: [] };
    }

    // 1. Inserir Usuário (Cadastro)
    if (normalized.startsWith('INSERT INTO kdp_users')) {
      const email = String(values[0]).toLowerCase();
      const existing = data.users.find(u => u.email.toLowerCase() === email);
      if (existing) {
        throw Object.assign(new Error('Conta existente'), { code: '23505' });
      }

      const id = String(data.nextUserId++);
      const newUser = {
        id,
        email: values[0],
        name: values[1],
        password_salt: values[2],
        password_hash: values[3],
        verification_token: values[4] || null,
        verification_expires: values[5] ? new Date(values[5]).toISOString() : null,
        email_verified: Boolean(values[6] === true),
        plan: values[6] === 'free' || !values[6] ? 'free' : values[6],
        is_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      data.users.push(newUser);
      this.store.scheduleSave();
      return { rows: [{ id: newUser.id, email: newUser.email, name: newUser.name, is_admin: newUser.is_admin, plan: newUser.plan }] };
    }

    // 2. Busca Usuário por Email (Login e Autenticação)
    if (normalized.includes('FROM kdp_users') && normalized.includes('LOWER(email) = $1')) {
      const email = String(values[0]).toLowerCase();
      const user = data.users.find(u => u.email.toLowerCase() === email);
      if (!user) return { rows: [] };
      return {
        rows: [{
          id: user.id,
          email: user.email,
          name: user.name,
          password_salt: user.password_salt,
          password_hash: user.password_hash,
          plan: user.plan || 'free',
          email_verified: Boolean(user.email_verified),
          is_admin: Boolean(user.is_admin),
          created_at: user.created_at
        }]
      };
    }

    // 3. Busca Usuário por ID
    if (normalized.includes('FROM kdp_users') && normalized.includes('WHERE id = $1')) {
      const id = String(values[0]);
      const user = data.users.find(u => String(u.id) === id);
      if (!user) return { rows: [] };
      return {
        rows: [{
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan || 'free',
          email_verified: Boolean(user.email_verified),
          is_admin: Boolean(user.is_admin),
          created_at: user.created_at
        }]
      };
    }

    // 4. Inserir Sessão
    if (normalized.startsWith('INSERT INTO kdp_sessions')) {
      const userId = String(values[0]);
      const tokenHash = values[1];
      const expiresAt = new Date(values[2]).toISOString();
      data.sessions.push({
        id: String(data.sessions.length + 1),
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        created_at: new Date().toISOString()
      });
      this.store.scheduleSave();
      return { rows: [] };
    }

    // 5. Validar Sessão (JOIN kdp_sessions e kdp_users)
    if (normalized.includes('kdp_sessions') && normalized.includes('kdp_users') && normalized.includes('token_hash')) {
      const tokenHash = values[0];
      const now = new Date();
      const session = data.sessions.find(s => s.token_hash === tokenHash && new Date(s.expires_at) > now);
      if (!session) return { rows: [] };

      const user = data.users.find(u => String(u.id) === String(session.user_id));
      if (!user) return { rows: [] };

      return {
        rows: [{
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan || 'free',
          email_verified: Boolean(user.email_verified),
          is_admin: Boolean(user.is_admin || user.email?.toLowerCase() === 'leandro2703palmeira@gmail.com'),
          max_projects: user.plan === 'enterprise' ? -1 : user.plan === 'pro' ? 50 : 3,
          max_storage_mb: user.plan === 'enterprise' ? -1 : user.plan === 'pro' ? 5000 : 100,
          max_api_calls_day: user.plan === 'enterprise' ? -1 : user.plan === 'pro' ? 5000 : 100,
          features: user.plan === 'enterprise' ? ['all'] : user.plan === 'pro' ? ['all'] : ['gerador_basico', 'export_pdf']
        }]
      };
    }

    // 6. Deletar Sessão (Logout ou Expiração)
    if (normalized.startsWith('DELETE FROM kdp_sessions WHERE token_hash')) {
      const tokenHash = values[0];
      data.sessions = data.sessions.filter(s => s.token_hash !== tokenHash);
      this.store.scheduleSave();
      return { rows: [] };
    }
    if (normalized.startsWith('DELETE FROM kdp_sessions WHERE user_id')) {
      const userId = String(values[0]);
      const now = new Date();
      data.sessions = data.sessions.filter(s => String(s.user_id) !== userId || new Date(s.expires_at) > now);
      this.store.scheduleSave();
      return { rows: [] };
    }

    // 7. Projetos de Livro - Inserir ou Atualizar
    if (normalized.startsWith('INSERT INTO kdp_book_projects')) {
      const userId = String(values[0]);
      const projectId = String(values[1]);
      const project = typeof values[2] === 'string' ? JSON.parse(values[2]) : values[2];

      const idx = data.projects.findIndex(p => String(p.user_id) === userId && String(p.project_id) === projectId);
      if (idx >= 0) {
        data.projects[idx].project = project;
        data.projects[idx].updated_at = new Date().toISOString();
      } else {
        data.projects.push({
          user_id: userId,
          project_id: projectId,
          project,
          updated_at: new Date().toISOString()
        });
      }
      this.store.scheduleSave();
      return { rows: [] };
    }

    // 8. Projetos de Livro - Buscar Todos do Usuário
    if (normalized.includes('FROM kdp_book_projects') && normalized.includes('WHERE user_id = $1') && !normalized.includes('project_id = $2') && !normalized.includes('COUNT(')) {
      const userId = String(values[0]);
      const list = data.projects
        .filter(p => String(p.user_id) === userId)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      return { rows: list.map(item => ({ project: item.project })) };
    }

    // 9. Projetos de Livro - Buscar por ID
    if (normalized.includes('FROM kdp_book_projects') && normalized.includes('WHERE user_id = $1 AND project_id = $2')) {
      const userId = String(values[0]);
      const projectId = String(values[1]);
      const found = data.projects.find(p => String(p.user_id) === userId && String(p.project_id) === projectId);
      return { rows: found ? [{ project: found.project }] : [] };
    }

    // 10. Projetos de Livro - Contagem do Usuário
    if (normalized.includes('COUNT(*)') && normalized.includes('FROM kdp_book_projects WHERE user_id = $1')) {
      const userId = String(values[0]);
      const count = data.projects.filter(p => String(p.user_id) === userId).length;
      return { rows: [{ count: String(count) }] };
    }

    // 11. Projetos de Livro - Deletar
    if (normalized.startsWith('DELETE FROM kdp_book_projects WHERE user_id = $1 AND project_id = $2')) {
      const userId = String(values[0]);
      const projectId = String(values[1]);
      data.projects = data.projects.filter(p => !(String(p.user_id) === userId && String(p.project_id) === projectId));
      this.store.scheduleSave();
      return { rows: [] };
    }

    // 12. User Records (final-books, editorial-jobs)
    if (normalized.startsWith('INSERT INTO kdp_user_records')) {
      const userId = String(values[0]);
      const collection = String(values[1]);
      const recordId = String(values[2]);
      const recordData = typeof values[3] === 'string' ? JSON.parse(values[3]) : values[3];

      const idx = data.records.findIndex(r => String(r.user_id) === userId && r.collection === collection && r.record_id === recordId);
      if (idx >= 0) {
        data.records[idx].data = recordData;
        data.records[idx].updated_at = new Date().toISOString();
      } else {
        data.records.push({
          user_id: userId,
          collection,
          record_id: recordId,
          data: recordData,
          updated_at: new Date().toISOString()
        });
      }
      this.store.scheduleSave();
      return { rows: [] };
    }

    if (normalized.includes('FROM kdp_user_records') && normalized.includes('WHERE user_id = $1 AND collection = $2') && !normalized.includes('record_id = $3')) {
      const userId = String(values[0]);
      const collection = String(values[1]);
      const list = data.records
        .filter(r => String(r.user_id) === userId && r.collection === collection)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      return { rows: list.map(item => ({ data: item.data })) };
    }

    if (normalized.includes('FROM kdp_user_records') && normalized.includes('WHERE user_id = $1 AND collection = $2 AND record_id = $3')) {
      const userId = String(values[0]);
      const collection = String(values[1]);
      const recordId = String(values[2]);
      const found = data.records.find(r => String(r.user_id) === userId && r.collection === collection && r.record_id === recordId);
      return { rows: found ? [{ data: found.data }] : [] };
    }

    if (normalized.startsWith('DELETE FROM kdp_user_records')) {
      const userId = String(values[0]);
      const collection = String(values[1]);
      const recordId = String(values[2]);
      data.records = data.records.filter(r => !(String(r.user_id) === userId && r.collection === collection && r.record_id === recordId));
      this.store.scheduleSave();
      return { rows: [] };
    }

    // 13. Estatísticas Administrativas (/api/auth/admin/stats)
    if (normalized.includes('total_users') && normalized.includes('kdp_users')) {
      const totalUsers = data.users.length;
      const verifiedUsers = data.users.filter(u => u.email_verified).length;
      const proUsers = data.users.filter(u => u.plan === 'pro').length;
      const enterpriseUsers = data.users.filter(u => u.plan === 'enterprise').length;
      const totalProjects = data.projects.length;
      const now = new Date();
      const activeSessions = data.sessions.filter(s => new Date(s.expires_at) > now).length;

      return {
        rows: [{
          total_users: totalUsers,
          verified_users: verifiedUsers,
          pro_users: proUsers,
          enterprise_users: enterpriseUsers,
          total_projects: totalProjects,
          active_sessions: activeSessions,
          projects_today: Math.max(1, totalProjects),
          api_calls_today: 42
        }]
      };
    }

    // 14. Listagem Administrativa de Usuários (/api/auth/admin/users)
    if (normalized.includes('FROM kdp_users') && normalized.includes('ORDER BY created_at DESC')) {
      let filtered = [...data.users];
      // Verifica filtros
      if (values.length >= 1 && typeof values[0] === 'string' && values[0].startsWith('%')) {
        const search = values[0].replace(/%/g, '').toLowerCase();
        filtered = filtered.filter(u => u.name?.toLowerCase().includes(search) || u.email?.toLowerCase().includes(search));
      }
      return {
        rows: filtered.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          plan: u.plan || 'free',
          plan_expires: null,
          email_verified: Boolean(u.email_verified),
          is_admin: Boolean(u.is_admin),
          created_at: u.created_at,
          projects_count: data.projects.filter(p => String(p.user_id) === String(u.id)).length
        }))
      };
    }

    // 15. Contagem Total de Usuários para Paginação Admin
    if (normalized.startsWith('SELECT COUNT(*) FROM kdp_users')) {
      return { rows: [{ count: String(data.users.length) }] };
    }

    // 16. Atualização de Usuário pelo Admin (/api/auth/admin/users/:id)
    if (normalized.startsWith('UPDATE kdp_users SET')) {
      const targetId = String(values[values.length - 1]);
      const user = data.users.find(u => String(u.id) === targetId);
      if (user) {
        if (normalized.includes('plan =')) {
          const planVal = values.find(v => ['free', 'pro', 'enterprise'].includes(v));
          if (planVal) user.plan = planVal;
        }
        if (normalized.includes('is_admin =')) {
          const adminVal = values.find(v => typeof v === 'boolean');
          if (adminVal !== undefined) user.is_admin = adminVal;
        }
        if (normalized.includes('email_verified =')) {
          const verVal = values.find(v => typeof v === 'boolean');
          if (verVal !== undefined) user.email_verified = verVal;
        }
        user.updated_at = new Date().toISOString();
        this.store.scheduleSave();
      }
      return { rows: [] };
    }

    // 17. Exclusão de Usuário pelo Admin
    if (normalized.startsWith('DELETE FROM kdp_users WHERE id = $1')) {
      const targetId = String(values[0]);
      data.users = data.users.filter(u => String(u.id) !== targetId);
      data.sessions = data.sessions.filter(s => String(s.user_id) !== targetId);
      data.projects = data.projects.filter(p => String(p.user_id) !== targetId);
      data.records = data.records.filter(r => String(r.user_id) !== targetId);
      this.store.scheduleSave();
      return { rows: [] };
    }

    // 18. Audit Log
    if (normalized.startsWith('INSERT INTO kdp_audit_log')) {
      data.audit_log.push({
        id: String(data.audit_log.length + 1),
        user_id: values[0],
        admin_id: values[1],
        action: values[2],
        details: values[3],
        created_at: new Date().toISOString()
      });
      this.store.scheduleSave();
      return { rows: [] };
    }

    // 19. Consulta de uso diário
    if (normalized.includes('FROM kdp_usage WHERE user_id = $1')) {
      return { rows: [{ api_calls: 12, storage_bytes: 5 * 1024 * 1024, projects_count: 1 }] };
    }

    console.log('[FileStorePool] Query genérica:', normalized.slice(0, 80));
    return { rows: [] };
  }
}
