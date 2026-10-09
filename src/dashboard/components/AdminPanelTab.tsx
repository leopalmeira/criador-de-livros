import React, { useState, useEffect } from 'react';
import { Users, Activity, DollarSign, TrendingUp, Shield, Mail, Key, ArrowUpDown, MoreHorizontal, Search, ChevronLeft, ChevronRight, Loader2, AlertCircle, CheckCircle, XCircle, Edit2, Trash2, Eye, Crown } from 'lucide-react';
import { authClient } from '../../services/auth-client';

interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
  plan_expires: string | null;
  email_verified: boolean;
  is_admin: boolean;
  created_at: string;
}

interface Stats {
  total_users: number;
  verified_users: number;
  pro_users: number;
  enterprise_users: number;
  total_projects: number;
  active_sessions: number;
  projects_today: number;
  api_calls_today: number;
}

type Tab = 'overview' | 'users' | 'audit';

export const AdminPanelTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ plan: '', is_admin: false, email_verified: false });

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/auth/admin/stats', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (e) {
      console.error('Erro ao buscar stats:', e);
    }
  };

  const fetchUsers = async (pageNum = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(pageNum), limit: '50' });
      if (search) params.append('search', search);
      if (planFilter) params.append('plan', planFilter);
      const res = await fetch(`/api/auth/admin/users?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
        setTotalPages(Math.ceil(data.total / 50));
        setPage(data.page);
      } else {
        setError(data.error || 'Erro ao buscar usuários');
      }
    } catch (e) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (user: User) => {
    try {
      const res = await fetch(`/api/auth/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers(page);
        setEditingUser(null);
      } else {
        alert(data.error || 'Erro ao atualizar');
      }
    } catch (e) {
      alert('Erro de conexão');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Tem certeza? Isso excluirá todos os dados do usuário.')) return;
    try {
      const res = await fetch(`/api/auth/admin/users/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) fetchUsers(page);
      else alert(data.error || 'Erro ao excluir');
    } catch (e) {
      alert('Erro de conexão');
    }
  };

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, [search, planFilter, page]);

  if (loading && !stats) {
    return (
      <div className="admin-panel loading">
        <Loader2 className="spin" size={32} />
        <p>Carregando painel administrativo...</p>
      </div>
    );
  }

  const planColors: Record<string, string> = {
    free: 'bg-gray-100 text-gray-700',
    pro: 'bg-blue-100 text-blue-700',
    enterprise: 'bg-purple-100 text-purple-700'
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <button className="btn-back" onClick={() => window.history.back()}>
          <ChevronLeft size={18} /> Voltar
        </button>
        <h2>Painel Administrativo</h2>
        <Shield className="admin-icon" size={28} />
      </div>

      {error && <div className="admin-error"><AlertCircle size={16} /> {error}</div>}

      <div className="admin-tabs">
        <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
          <Activity size={16} /> Visão Geral
        </button>
        <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
          <Users size={16} /> Usuários ({stats?.total_users || 0})
        </button>
        <button className={activeTab === 'audit' ? 'active' : ''} onClick={() => setActiveTab('audit')}>
          <Activity size={16} /> Auditoria
        </button>
      </div>

      {activeTab === 'overview' && stats && (
        <div className="admin-grid">
          <div className="stat-card">
            <Users size={24} /> <span className="stat-value">{stats.total_users}</span> <span className="stat-label">Total de Usuários</span>
          </div>
          <div className="stat-card">
            <CheckCircle size={24} className="text-green-500" /> <span className="stat-value">{stats.verified_users}</span> <span className="stat-label">Verificados</span>
          </div>
          <div className="stat-card">
            <Crown size={24} className="text-blue-500" /> <span className="stat-value">{stats.pro_users}</span> <span className="stat-label">Plano Pro</span>
          </div>
          <div className="stat-card">
            <Crown size={24} className="text-purple-500" /> <span className="stat-value">{stats.enterprise_users}</span> <span className="stat-label">Enterprise</span>
          </div>
          <div className="stat-card">
            <Activity size={24} /> <span className="stat-value">{stats.total_projects}</span> <span className="stat-label">Projetos Totais</span>
          </div>
          <div className="stat-card">
            <TrendingUp size={24} /> <span className="stat-value">{stats.active_sessions}</span> <span className="stat-label">Sessões Ativas</span>
          </div>
          <div className="stat-card">
            <DollarSign size={24} /> <span className="stat-value">{stats.projects_today}</span> <span className="stat-label">Projetos Hoje</span>
          </div>
          <div className="stat-card">
            <ArrowUpDown size={24} /> <span className="stat-value">{stats.api_calls_today}</span> <span className="stat-label">API Calls Hoje</span>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="admin-users">
          <div className="users-filters">
            <input
              type="text"
              placeholder="Buscar por email ou nome..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="search-input"
            />
            <Search size={16} className="search-icon" />
            <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }} className="filter-select">
              <option value="">Todos os planos</option>
              <option value="free">Gratuito</option>
              <option value="pro">Profissional</option>
              <option value="enterprise">Empresarial</option>
            </select>
          </div>

          {loading ? (
            <div className="users-loading"><Loader2 className="spin" size={24} /> Carregando...</div>
          ) : (
            <>
              <div className="users-table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Usuário</th>
                      <th>Plano</th>
                      <th>Status</th>
                      <th>Admin</th>
                      <th>Criado em</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id}>
                        <td>
                          <div className="user-info">
                            <strong>{user.name}</strong>
                            <span>{user.email}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`plan-badge ${planColors[user.plan] || 'bg-gray-100 text-gray-700'}`}>
                            {user.plan === 'free' ? 'Gratuito' : user.plan === 'pro' ? 'Profissional' : 'Empresarial'}
                          </span>
                        </td>
                        <td>
                          <span className={user.email_verified ? 'status-verified' : 'status-unverified'}>
                            {user.email_verified ? (
                              <>
                                <CheckCircle size={12} className="text-green-500" /> Verificado
                              </>
                            ) : (
                              <>
                                <XCircle size={12} className="text-red-500" /> Pendente
                              </>
                            )}
                          </span>
                        </td>
                        <td>
                          {user.is_admin ? (
                            <span className="admin-badge"><Crown size={12} /> Admin</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td>{new Date(user.created_at).toLocaleDateString('pt-BR')}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn-icon" onClick={() => { setEditForm({ plan: user.plan, is_admin: user.is_admin, email_verified: user.email_verified }); setEditingUser(user); }} title="Editar">
                              <Edit2 size={14} />
                            </button>
                            <button className="btn-icon danger" onClick={() => handleDeleteUser(user.id)} title="Excluir">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pagination">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}><ChevronLeft size={16} /></button>
                <span>Página {page} de {totalPages || 1}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}><ChevronRight size={16} /></button>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="admin-audit">
          <p className="coming-soon">Log de auditoria em desenvolvimento</p>
        </div>
      )}

      {editingUser && (
        <div className="admin-modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h3>Editar Usuário: {editingUser.name}</h3>
            <p className="user-email">{editingUser.email}</p>
            
            <div className="form-group">
              <label>Plano</label>
              <select value={editForm.plan} onChange={e => setEditForm({...editForm, plan: e.target.value})}>
                <option value="free">Gratuito</option>
                <option value="pro">Profissional</option>
                <option value="enterprise">Empresarial</option>
              </select>
            </div>

            <div className="form-group checkbox">
              <label>
                <input type="checkbox" checked={editForm.is_admin} onChange={e => setEditForm({...editForm, is_admin: e.target.checked})} />
                Administrador
              </label>
            </div>

            <div className="form-group checkbox">
              <label>
                <input type="checkbox" checked={editForm.email_verified} onChange={e => setEditForm({...editForm, email_verified: e.target.checked})} />
                Email verificado
              </label>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setEditingUser(null)}>Cancelar</button>
              <button className="btn-primary" onClick={() => handleUpdateUser(editingUser)}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};