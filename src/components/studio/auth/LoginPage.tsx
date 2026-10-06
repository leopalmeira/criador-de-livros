import React, { useState } from 'react';
import { BookOpen, Lock, Mail, ArrowRight, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

interface Props {
  onLoginSuccess: (user: { name: string; email: string }) => void;
}

export const LoginPage: React.FC<Props> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('leandro.palmeira@kdpintel.com');
  const [password, setPassword] = useState('••••••••••••');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, informe seu e-mail e senha de acesso.');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Simulação de login seguro e rápido
    setTimeout(() => {
      setIsLoading(false);
      if (typeof window !== 'undefined') {
        const authData = {
          name: email.includes('leandro') ? 'Leandro Palmeira' : 'Autor KDP Pro',
          email,
          token: `kdp_token_${Date.now()}`
        };
        if (rememberMe) {
          localStorage.setItem('kdp_auth_user', JSON.stringify(authData));
        } else {
          sessionStorage.setItem('kdp_auth_user', JSON.stringify(authData));
        }
      }
      onLoginSuccess({
        name: email.includes('leandro') ? 'Leandro Palmeira' : 'Autor KDP Pro',
        email
      });
    }, 450);
  };

  const handleQuickDemoLogin = () => {
    setEmail('leandro.palmeira@kdpintel.com');
    setPassword('••••••••••••');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const authData = {
        name: 'Leandro Palmeira',
        email: 'leandro.palmeira@kdpintel.com',
        token: `kdp_token_${Date.now()}`
      };
      localStorage.setItem('kdp_auth_user', JSON.stringify(authData));
      onLoginSuccess(authData);
    }, 300);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 20%, #1e293b 0%, #0f172a 60%, #020617 100%)',
      padding: '24px 16px',
      fontFamily: "'Inter', sans-serif",
      color: '#f8fafc'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 460,
        background: 'rgba(30, 41, 59, 0.75)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 16,
        padding: '36px 32px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)'
      }}>
        {/* CABEÇALHO DO LOGIN */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52,
            height: 52,
            margin: '0 auto 16px auto',
            borderRadius: 14,
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(37, 99, 235, 0.4)'
          }}>
            <BookOpen size={26} color="#ffffff" />
          </div>

          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>
            BOOK INTEL <span style={{ color: '#38bdf8' }}>KDP</span>
          </h2>
          <p style={{ margin: '6px 0 0 0', fontSize: 13, color: '#94a3b8' }}>
            Plataforma de Criação Editorial & Inteligência de Mercado Amazon
          </p>
        </div>

        {/* MENSAGEM DE ERRO SE HOUVER */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 12,
            color: '#fca5a5',
            marginBottom: 18
          }}>
            {error}
          </div>
        )}

        {/* FORMULÁRIO DE LOGIN */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
              E-mail do Autor / Editor
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 12, top: 12, color: '#64748b' }}>
                <Mail size={16} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  background: 'rgba(15, 23, 42, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 8,
                  color: '#ffffff',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
              Senha de Acesso
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 12, top: 12, color: '#64748b' }}>
                <Lock size={16} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  background: 'rgba(15, 23, 42, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 8,
                  color: '#ffffff',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: '#2563eb' }}
              />
              Lembrar de mim neste dispositivo
            </label>
            <span style={{ color: '#38bdf8', cursor: 'pointer', fontWeight: 600 }}>Esqueceu a senha?</span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px 18px',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              border: 'none',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
              transition: 'all 0.2s'
            }}
          >
            {isLoading ? (
              <span>Autenticando...</span>
            ) : (
              <>
                Entrar no Painel do Autor <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* BOTÃO DE ACESSO RÁPIDO DEMO */}
        <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            disabled={isLoading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 16px',
              borderRadius: 8,
              background: 'rgba(56, 189, 248, 0.1)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Sparkles size={15} /> Acesso Rápido com Perfil Autor Pro
          </button>
        </div>

        {/* RODAPÉ DE SEGURANÇA */}
        <div style={{
          marginTop: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          fontSize: 11,
          color: '#64748b'
        }}>
          <ShieldCheck size={14} color="#10b981" />
          <span>Ambiente Editorial Seguro • Acesso Direto à Dashboard KDP</span>
        </div>
      </div>
    </div>
  );
};
