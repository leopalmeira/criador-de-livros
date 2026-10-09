export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  plan?: string;
  emailVerified?: boolean;
  isAdmin?: boolean;
}

export interface AdminStats {
  total_users: number;
  verified_users: number;
  pro_users: number;
  enterprise_users: number;
  total_projects: number;
  active_sessions: number;
  projects_today: number;
  api_calls_today: number;
}

export interface AdminUserRecord {
  id: string;
  email: string;
  name: string;
  plan: string;
  plan_expires: string | null;
  email_verified: boolean;
  is_admin: boolean;
  created_at: string;
  projects_count?: number;
}

export class AuthApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

interface ApiResponse {
  success: boolean;
  user?: AuthenticatedUser | null;
  token?: string;
  error?: string;
  code?: string;
  stats?: AdminStats;
  users?: AdminUserRecord[];
  total?: number;
  page?: number;
  limit?: number;
  projects?: any[];
}

const TOKEN_KEY = 'kdp_session_token';

function getStoredToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

function setStoredToken(token: string | null): void {
  if (typeof localStorage === 'undefined') return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T extends ApiResponse>(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  data?: object
): Promise<T> {
  let response: Response;
  const token = getStoredToken();
  const headers: Record<string, string> = {};

  if (data) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    response = await fetch(path, {
      method,
      credentials: 'include',
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      body: data ? JSON.stringify(data) : undefined
    });
  } catch {
    throw new AuthApiError(
      'Não foi possível conectar ao serviço de contas. Verifique sua conexão e tente novamente.',
      'AUTH_SERVICE_UNAVAILABLE',
      503
    );
  }

  const payload = await response.json().catch(() => ({})) as ApiResponse;
  if (!response.ok) {
    throw new AuthApiError(
      payload.error || 'Não foi possível concluir a operação.',
      payload.code || 'AUTH_REQUEST_FAILED',
      response.status
    );
  }
  return payload as T;
}

export const authClient = {
  async login(email: string, password: string, rememberMe: boolean): Promise<AuthenticatedUser> {
    const response = await request<ApiResponse>('/api/auth/login', 'POST', { email, password, rememberMe });
    if (!response.user) throw new AuthApiError('A resposta de autenticação está incompleta.', 'INVALID_AUTH_RESPONSE', 502);
    if (response.token) {
      setStoredToken(response.token);
    }
    return response.user;
  },

  async register(email: string, name: string, password: string, rememberMe: boolean): Promise<AuthenticatedUser> {
    const response = await request<ApiResponse>('/api/auth/register', 'POST', { email, name, password, rememberMe });
    if (!response.user) throw new AuthApiError('A resposta do cadastro está incompleta.', 'INVALID_AUTH_RESPONSE', 502);
    if (response.token) {
      setStoredToken(response.token);
    }
    return response.user;
  },

  async getSession(): Promise<AuthenticatedUser | null> {
    try {
      const response = await request<ApiResponse>('/api/auth/session', 'GET');
      if (response.user) return response.user;
      return null;
    } catch {
      return null;
    }
  },

  async logout(): Promise<void> {
    try {
      await request<ApiResponse>('/api/auth/logout', 'POST', {});
    } finally {
      setStoredToken(null);
    }
  },

  async sendVerificationEmail(email: string): Promise<void> {
    await request<ApiResponse>('/api/auth/verify-email/send', 'POST', { email });
  },

  async verifyEmail(token: string): Promise<void> {
    await request<ApiResponse>('/api/auth/verify-email/confirm', 'POST', { token });
  },

  async requestPasswordReset(email: string): Promise<void> {
    await request<ApiResponse>('/api/auth/password/reset/request', 'POST', { email });
  },

  async confirmPasswordReset(token: string, password: string): Promise<void> {
    await request<ApiResponse>('/api/auth/password/reset/confirm', 'POST', { token, password });
  },

  async getPlan(): Promise<{ plan: string; limits: any; usage: any } | null> {
    const response = await request<ApiResponse & { plan: string; limits: any; usage: any }>('/api/auth/plan', 'GET');
    return response.success ? { plan: response.plan, limits: response.limits, usage: response.usage } : null;
  },

  async incrementUsage(type: 'api_call' | 'storage' | 'project', amount?: number): Promise<void> {
    await request<ApiResponse>('/api/auth/usage/increment', 'POST', { type, amount });
  },

  // ==========================================
  // MÉTODOS DO PAINEL ADMINISTRATIVO (CLIENTES)
  // ==========================================
  async getAdminStats(): Promise<AdminStats> {
    const response = await request<ApiResponse>('/api/auth/admin/stats', 'GET');
    return response.stats || {
      total_users: 0,
      verified_users: 0,
      pro_users: 0,
      enterprise_users: 0,
      total_projects: 0,
      active_sessions: 0,
      projects_today: 0,
      api_calls_today: 0
    };
  },

  async getAdminUsers(params: { page?: number; limit?: number; search?: string; plan?: string } = {}): Promise<{
    users: AdminUserRecord[];
    total: number;
    page: number;
    limit: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.search) searchParams.set('search', params.search);
    if (params.plan) searchParams.set('plan', params.plan);

    const query = searchParams.toString();
    const url = `/api/auth/admin/users${query ? `?${query}` : ''}`;
    const response = await request<ApiResponse>(url, 'GET');
    return {
      users: response.users || [],
      total: response.total || (response.users || []).length,
      page: response.page || 1,
      limit: response.limit || 50
    };
  },

  async updateAdminUser(id: string, data: { plan?: string; is_admin?: boolean; email_verified?: boolean }): Promise<void> {
    await request<ApiResponse>(`/api/auth/admin/users/${id}`, 'PUT', data);
  },

  async deleteAdminUser(id: string): Promise<void> {
    await request<ApiResponse>(`/api/auth/admin/users/${id}`, 'DELETE');
  },

  async getAdminProjects(): Promise<any[]> {
    const response = await request<ApiResponse>('/api/auth/admin/projects', 'GET');
    return response.projects || [];
  }
};
