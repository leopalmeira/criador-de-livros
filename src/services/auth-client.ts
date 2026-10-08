export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
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
  error?: string;
  code?: string;
}

async function request<T extends ApiResponse>(path: string, method: 'GET' | 'POST', data?: object): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: data ? { 'Content-Type': 'application/json' } : undefined,
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
    return response.user;
  },

  async register(email: string, name: string, password: string, rememberMe: boolean): Promise<AuthenticatedUser> {
    const response = await request<ApiResponse>('/api/auth/register', 'POST', { email, name, password, rememberMe });
    if (!response.user) throw new AuthApiError('A resposta do cadastro está incompleta.', 'INVALID_AUTH_RESPONSE', 502);
    return response.user;
  },

  async getSession(): Promise<AuthenticatedUser | null> {
    const response = await request<ApiResponse>('/api/auth/session', 'GET');
    return response.user || null;
  },

  async logout(): Promise<void> {
    await request<ApiResponse>('/api/auth/logout', 'POST', {});
  }
};
