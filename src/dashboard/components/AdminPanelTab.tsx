import React, { useState, useEffect } from 'react';
import {
  Users, Activity, DollarSign, TrendingUp, Shield, Mail, Key,
  ArrowUpDown, Search, ChevronLeft, ChevronRight, Loader2, AlertCircle,
  CheckCircle, XCircle, Edit2, Trash2, Crown, BookOpen, Layers, RefreshCw
} from 'lucide-react';
import { authClient, AdminStats, AdminUserRecord } from '../../services/auth-client';
import { useTranslation } from '../../services/i18n-service';

interface Props {
  onBack?: () => void;
}

type Tab = 'overview' | 'users' | 'projects';

export const AdminPanelTab: React.FC<Props> = ({ onBack }) => {
  const { t, currentLang } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [editingUser, setEditingUser] = useState<AdminUserRecord | null>(null);
  const [editForm, setEditForm] = useState({ plan: '', is_admin: false, email_verified: false });
  const [isSaving, setIsSaving] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await authClient.getAdminStats();
      setStats(data);
    } catch (e: any) {
      console.error('Erro ao buscar stats:', e);
    }
  };

  const fetchUsers = async (pageNum = 1) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authClient.getAdminUsers({
        page: pageNum,
        limit: 50,
        search: search.trim() || undefined,
        plan: planFilter || undefined
      });
      setUsers(result.users);
      setTotalPages(Math.max(1, Math.ceil(result.total / 50)));
      setPage(result.page);
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar lista de clientes');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const projs = await authClient.getAdminProjects();
      setProjects(projs);
    } catch (e: any) {
      console.error('Erro ao buscar projetos dos clientes:', e);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchUsers(page);
    fetchProjects();
  }, [search, planFilter, page]);

  const handleUpdateUser = async (user: AdminUserRecord) => {
    setIsSaving(true);
    try {
      await authClient.updateAdminUser(user.id, editForm);
      await fetchUsers(page);
      await fetchStats();
      setEditingUser(null);
    } catch (e: any) {
      alert(e.message || 'Erro ao atualizar dados do cliente');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(t('admin.confirmDelete', `Tem certeza que deseja excluir o cliente ${name}?`))) {
      return;
    }
    try {
      await authClient.deleteAdminUser(id);
      await fetchUsers(page);
      await fetchStats();
    } catch (e: any) {
      alert(e.message || 'Erro ao excluir cliente');
    }
  };

  const handleQuickUpgrade = async (user: AdminUserRecord, newPlan: 'pro' | 'enterprise') => {
    try {
      await authClient.updateAdminUser(user.id, { plan: newPlan });
      await fetchUsers(page);
      await fetchStats();
    } catch (e: any) {
      alert(e.message || 'Erro ao atualizar plano');
    }
  };

  const planBadgeStyle = (plan: string) => {
    switch (plan) {
      case 'enterprise':
        return { background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)' };
      case 'pro':
        return { background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)' };
      default:
        return { background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.3)' };
    }
  };

  const planLabel = (plan: string) => {
    switch (plan) {
      case 'enterprise': return t('admin.filterEnterprise', 'Empresarial');
      case 'pro': return t('admin.filterPro', 'Profissional');
      default: return t('admin.filterFree', 'Gratuito');
    }
  };

  return (
    <div className="admin-panel" style={{
      padding: '24px',
      maxWidth: '1280px',
      margin: '0 auto',
      color: '#f8fafc',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* CABEÇALHO DO PAINEL ADMINISTRATIVO */}
      <div className="admin-header" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24,
        paddingBottom: 20,
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {onBack && (
            <button
              className="btn-back"
              onClick={onBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#f8fafc',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <ChevronLeft size={16} /> {t('admin.btnBack', 'Voltar à Dashboard')}
            </button>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(139, 92, 246, 0.4)'
              }}>
                <Shield size={20} color="#ffffff" />
              </div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#ffffff' }}>
                {t('admin.title', 'Painel de Controle Editorial & Clientes')}
              </h2>
            </div>
            <p style={{ margin: '4px 0 0 46px', fontSize: 12, color: '#94a3b8' }}>
              {t('admin.subtitle', 'Acompanhe todos os clientes cadastrados, planos ativos e obras criadas na plataforma')}
            </p>
          </div>
        </div>

        <button
          onClick={() => { fetchStats(); fetchUsers(page); fetchProjects(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 8,
            background: 'rgba(56, 189, 248, 0.12)',
            color: '#38bdf8',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer'
          }}
          title="Atualizar dados em tempo real"
        >
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: 8,
          padding: '12px 16px',
          color: '#fca5a5',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 13
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* ABAS DO PAINEL */}
      <div style={{
        display: 'flex',
        gap: 10,
        marginBottom: 24,
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        paddingBottom: 10
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'overview' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'rgba(255, 255, 255, 0.05)',
            color: activeTab === 'overview' ? '#ffffff' : '#94a3b8',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          <Activity size={16} /> {t('admin.tabOverview', 'Visão Geral & Métricas')}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'users' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'rgba(255, 255, 255, 0.05)',
            color: activeTab === 'users' ? '#ffffff' : '#94a3b8',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          <Users size={16} /> {t('admin.tabUsers', 'Clientes Cadastrados')} ({stats?.total_users || users.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('projects')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'projects' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'rgba(255, 255, 255, 0.05)',
            color: activeTab === 'projects' ? '#ffffff' : '#94a3b8',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          <BookOpen size={16} /> {t('admin.tabProjects', 'Livros & Produção dos Clientes')} ({stats?.total_projects || projects.length || 0})
        </button>
      </div>

      {/* ABA 1: VISÃO GERAL & MÉTRICAS */}
      {activeTab === 'overview' && (
        <div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
            marginBottom: 24
          }}>
            <div style={{
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: 14,
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{t('admin.statTotalUsers', 'Total de Clientes')}</span>
                <Users size={20} color="#38bdf8" />
              </div>
              <span style={{ fontSize: 32, fontWeight: 900, color: '#ffffff' }}>{stats?.total_users ?? users.length}</span>
              <span style={{ fontSize: 11, color: '#34d399' }}>✓ Todos com acesso imediato</span>
            </div>

            <div style={{
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(168, 85, 247, 0.25)',
              borderRadius: 14,
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{t('admin.statProUsers', 'Clientes Pro & Enterprise')}</span>
                <Crown size={20} color="#c084fc" />
              </div>
              <span style={{ fontSize: 32, fontWeight: 900, color: '#ffffff' }}>
                {(stats?.pro_users || 0) + (stats?.enterprise_users || 0)}
              </span>
              <span style={{ fontSize: 11, color: '#c084fc' }}>Plano comercial de alta receita</span>
            </div>

            <div style={{
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 14,
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{t('admin.statTotalBooks', 'Livros Criados na Plataforma')}</span>
                <BookOpen size={20} color="#34d399" />
              </div>
              <span style={{ fontSize: 32, fontWeight: 900, color: '#ffffff' }}>{stats?.total_projects ?? projects.length}</span>
              <span style={{ fontSize: 11, color: '#34d399' }}>Obras completas para KDP / Google</span>
            </div>

            <div style={{
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(251, 146, 60, 0.25)',
              borderRadius: 14,
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{t('admin.statActiveSessions', 'Sessões Ativas Agora')}</span>
                <TrendingUp size={20} color="#fb923c" />
              </div>
              <span style={{ fontSize: 32, fontWeight: 900, color: '#ffffff' }}>{Math.max(1, stats?.active_sessions || 1)}</span>
              <span style={{ fontSize: 11, color: '#fb923c' }}>Autenticação e tráfego seguro</span>
            </div>
          </div>

          {/* Destaque informativo */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            borderRadius: 14,
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16
          }}>
            <div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: 16, fontWeight: 800, color: '#38bdf8' }}>
                🛡️ Plataforma BookEngin Operacional & Pronta para Escalar
              </h4>
              <p style={{ margin: 0, fontSize: 13, color: '#cbd5e1', lineHeight: 1.5, maxWidth: 700 }}>
                Seus clientes podem se cadastrar, acessar imediatamente o estúdio editorial, gerar livros com IA Gemini e FLUX, exportar PDFs de alta definição e publicar na Amazon KDP.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('users')}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              Ver Todos os Clientes →
            </button>
          </div>
        </div>
      )}

      {/* ABA 2: CLIENTES CADASTRADOS */}
      {activeTab === 'users' && (
        <div>
          {/* FILTROS E BUSCA */}
          <div style={{
            display: 'flex',
            gap: 12,
            marginBottom: 20,
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
              <Search size={16} color="#64748b" style={{ position: 'absolute', left: 12, top: 11 }} />
              <input
                type="text"
                placeholder={t('admin.searchPlaceholder', 'Buscar por nome ou e-mail do cliente...')}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 38px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 8,
                  color: '#ffffff',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <select
              value={planFilter}
              onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
              style={{
                padding: '9px 14px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 8,
                color: '#ffffff',
                fontSize: 13,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">{t('admin.filterAllPlans', 'Todos os Planos')}</option>
              <option value="free">{t('admin.filterFree', 'Plano Gratuito')}</option>
              <option value="pro">{t('admin.filterPro', 'Plano Profissional')}</option>
              <option value="enterprise">{t('admin.filterEnterprise', 'Plano Empresarial')}</option>
            </select>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <Loader2 size={32} className="spin" style={{ margin: '0 auto 12px auto', display: 'block' }} />
              <span>Carregando dados dos clientes...</span>
            </div>
          ) : users.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'rgba(15, 23, 42, 0.5)',
              borderRadius: 12,
              border: '1px dashed rgba(255, 255, 255, 0.15)',
              color: '#94a3b8'
            }}>
              <Users size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: 14 }}>{t('admin.noUsers', 'Nenhum cliente encontrado com os filtros aplicados.')}</p>
            </div>
          ) : (
            <div style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 14,
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead>
                    <tr style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#94a3b8',
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: 0.6
                    }}>
                      <th style={{ padding: '14px 16px' }}>{t('admin.colUser', 'Cliente')}</th>
                      <th style={{ padding: '14px 16px' }}>{t('admin.colPlan', 'Plano')}</th>
                      <th style={{ padding: '14px 16px' }}>{t('admin.colStatus', 'Status')}</th>
                      <th style={{ padding: '14px 16px' }}>{t('admin.colProjects', 'Livros Criados')}</th>
                      <th style={{ padding: '14px 16px' }}>{t('admin.colDate', 'Cadastro')}</th>
                      <th style={{ padding: '14px 16px', textAlign: 'right' }}>{t('admin.colActions', 'Ações')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 800,
                              color: '#ffffff'
                            }}>
                              {(user.name || 'U')[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#ffffff' }}>
                                {user.name} {user.is_admin && <span style={{ fontSize: 10, background: '#8b5cf6', color: '#ffffff', padding: '1px 6px', borderRadius: 4, marginLeft: 4 }}>ADMIN</span>}
                              </div>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>{user.email}</div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            ...planBadgeStyle(user.plan)
                          }}>
                            {planLabel(user.plan)}
                          </span>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          {user.email_verified ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#34d399', fontSize: 11, fontWeight: 600 }}>
                              <CheckCircle size={13} /> Ativo
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#fb923c', fontSize: 11, fontWeight: 600 }}>
                              <CheckCircle size={13} /> Registrado
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontWeight: 700, color: '#38bdf8' }}>
                            {user.projects_count || 0}
                          </span>
                          <span style={{ fontSize: 11, color: '#64748b', marginLeft: 4 }}>
                            {user.projects_count === 1 ? 'livro' : 'livros'}
                          </span>
                        </td>

                        <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: 12 }}>
                          {user.created_at ? new Date(user.created_at).toLocaleDateString(currentLang) : '—'}
                        </td>

                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                            {user.plan === 'free' && (
                              <button
                                onClick={() => handleQuickUpgrade(user, 'pro')}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: 6,
                                  background: 'rgba(56, 189, 248, 0.15)',
                                  border: '1px solid rgba(56, 189, 248, 0.35)',
                                  color: '#38bdf8',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                                title="Fazer upgrade para Pro"
                              >
                                + Pro
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setEditingUser(user);
                                setEditForm({
                                  plan: user.plan || 'free',
                                  is_admin: Boolean(user.is_admin),
                                  email_verified: Boolean(user.email_verified)
                                });
                              }}
                              style={{
                                padding: '6px 8px',
                                borderRadius: 6,
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                color: '#e2e8f0',
                                cursor: 'pointer'
                              }}
                              title={t('admin.btnEdit', 'Gerenciar Plano')}
                            >
                              <Edit2 size={13} />
                            </button>

                            <button
                              onClick={() => handleDeleteUser(user.id, user.name)}
                              style={{
                                padding: '6px 8px',
                                borderRadius: 6,
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#f87171',
                                cursor: 'pointer'
                              }}
                              title={t('admin.btnDelete', 'Excluir Cliente')}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: 12,
                  color: '#94a3b8'
                }}>
                  <span>Página {page} de {totalPages}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: page <= 1 ? '#475569' : '#ffffff',
                        cursor: page <= 1 ? 'default' : 'pointer'
                      }}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: page >= totalPages ? '#475569' : '#ffffff',
                        cursor: page >= totalPages ? 'default' : 'pointer'
                      }}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ABA 3: LIVROS & PRODUÇÃO DOS CLIENTES */}
      {activeTab === 'projects' && (
        <div>
          {projects.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'rgba(15, 23, 42, 0.5)',
              borderRadius: 12,
              border: '1px dashed rgba(255, 255, 255, 0.15)',
              color: '#94a3b8'
            }}>
              <BookOpen size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: 14 }}>{t('admin.noProjects', 'Nenhum livro criado pelos clientes ainda.')}</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 16
            }}>
              {projects.map((proj, idx) => (
                <div
                  key={proj.id || idx}
                  style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(56, 189, 248, 0.2)',
                    borderRadius: 12,
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12,
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: proj.status === 'FINALIZADO' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                        color: proj.status === 'FINALIZADO' ? '#34d399' : '#38bdf8',
                        border: `1px solid ${proj.status === 'FINALIZADO' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(56, 189, 248, 0.4)'}`
                      }}>
                        {proj.status || 'RASCUNHO'}
                      </span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>
                        {proj.kdpChapters?.length || 0} capítulos
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 4px 0', fontSize: 15, fontWeight: 800, color: '#ffffff' }}>
                      {proj.title || 'Livro Sem Título'}
                    </h4>
                    {proj.subtitle && (
                      <p style={{ margin: '0 0 8px 0', fontSize: 12, color: '#94a3b8', lineHeight: 1.3 }}>
                        {proj.subtitle}
                      </p>
                    )}
                    <div style={{ fontSize: 11, color: '#cbd5e1' }}>
                      Autor: <strong style={{ color: '#ffffff' }}>{proj.author || 'Autor da Obra'}</strong>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: 10,
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    fontSize: 11,
                    color: '#64748b'
                  }}>
                    <span>{proj.categories?.[0] || 'Desenvolvimento'}</span>
                    <span>{proj.updatedAt ? new Date(proj.updatedAt).toLocaleDateString(currentLang) : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE EDIÇÃO DO CLIENTE */}
      {editingUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }} onClick={() => setEditingUser(null)}>
          <div
            style={{
              background: '#0f172a',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: 16,
              padding: '28px',
              maxWidth: 480,
              width: '100%',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 6px 0', fontSize: 18, fontWeight: 800, color: '#ffffff' }}>
              {t('admin.modalTitle', 'Gerenciar Cliente')}: {editingUser.name}
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: 12, color: '#94a3b8' }}>
              {editingUser.email}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 6 }}>
                  {t('admin.fieldPlan', 'Plano do Cliente')}
                </label>
                <select
                  value={editForm.plan}
                  onChange={e => setEditForm({ ...editForm, plan: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'rgba(3, 7, 18, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    fontSize: 13,
                    outline: 'none'
                  }}
                >
                  <option value="free">{t('admin.filterFree', 'Plano Gratuito')}</option>
                  <option value="pro">{t('admin.filterPro', 'Plano Profissional')}</option>
                  <option value="enterprise">{t('admin.filterEnterprise', 'Plano Empresarial')}</option>
                </select>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: '#e2e8f0' }}>
                <input
                  type="checkbox"
                  checked={editForm.is_admin}
                  onChange={e => setEditForm({ ...editForm, is_admin: e.target.checked })}
                  style={{ accentColor: '#8b5cf6', width: 16, height: 16 }}
                />
                {t('admin.fieldAdmin', 'Acesso de Administrador da Plataforma')}
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: '#e2e8f0' }}>
                <input
                  type="checkbox"
                  checked={editForm.email_verified}
                  onChange={e => setEditForm({ ...editForm, email_verified: e.target.checked })}
                  style={{ accentColor: '#38bdf8', width: 16, height: 16 }}
                />
                {t('admin.fieldVerified', 'E-mail Verificado e Aprovado')}
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 26 }}>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                style={{
                  padding: '10px 16px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#cbd5e1',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                {t('admin.btnCancel', 'Cancelar')}
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleUpdateUser(editingUser)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(14, 165, 233, 0.4)'
                }}
              >
                {isSaving ? 'Salvando...' : t('admin.btnSave', 'Salvar Alterações')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};