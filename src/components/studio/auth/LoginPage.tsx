// ============================================================================
// BOOKENGIN — LANDING PAGE OFICIAL DE DIVULGAÇÃO & ACESSO EDITORIAL
// Layout idêntico à identidade visual oficial da plataforma:
// - Design Dark Neon com glow azul/ciano
// - Seletor de Idiomas (Português, English, Español) com troca em tempo real
// - Grid de 6 Recursos da Plataforma
// - Box de Preço e Assinatura: US$ 25 por mês para até 15 livros
// - Mockups 3D de Livros de alta qualidade KDP (Thriller, Livro de Colorir, Sudoku)
// - Card Integrado de Login & Cadastro Gratuito
// ============================================================================

import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  FileText,
  Image as ImageIcon,
  FileCheck,
  TrendingUp,
  Zap,
  ShieldCheck,
  Clock,
  Cloud,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  CheckCircle2,
  TrendingDown,
  Layers
} from 'lucide-react';
import { useTranslation, SupportedLanguage } from '../../../services/i18n-service';
import { AuthApiError, authClient } from '../../../services/auth-client';
import { formatPlatformPrice, replacePlatformPrice } from '../../../services/market-region';
import './login-page.css';

interface Props {
  onLoginSuccess: (user: { id: string; name: string; email: string }) => void;
}

export const LoginPage: React.FC<Props> = ({ onLoginSuccess }) => {
  const { t, currentLang, setLanguage, isBrazil } = useTranslation();
  const subscriptionPrice = formatPlatformPrice(25, isBrazil);

  // Estados de formulário
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manipulador de Login
  const localizedAuthError = (error: unknown): string => {
    const code = error instanceof AuthApiError ? error.code : null;
    const messages: Record<string, Record<string, string>> = {
      INVALID_CREDENTIALS: {
        'pt-BR': 'E-mail ou senha incorretos. Se ainda não tem cadastro, crie sua conta para entrar.',
        'en-US': 'Email or password is incorrect. Create an account if you are new here.',
        'es-ES': 'El correo o la contraseña son incorrectos. Cree una cuenta si es nuevo.'
      },
      ACCOUNT_EXISTS: {
        'pt-BR': 'Este e-mail já possui cadastro. Entre com sua senha.',
        'en-US': 'This email is already registered. Sign in with your password.',
        'es-ES': 'Este correo ya está registrado. Inicie sesión con su contraseña.'
      },
      AUTH_NOT_CONFIGURED: {
        'pt-BR': 'O serviço de contas ainda não foi configurado no servidor. Tente novamente mais tarde.',
        'en-US': 'The account service is not configured on the server yet. Please try again later.',
        'es-ES': 'El servicio de cuentas aún no está configurado en el servidor. Inténtelo más tarde.'
      },
      INVALID_PASSWORD: {
        'pt-BR': 'E-mail ou senha incorretos. Confira os dados e tente novamente.',
        'en-US': 'Email or password is incorrect. Check your details and try again.',
        'es-ES': 'El correo o la contraseña son incorrectos. Revise los datos e inténtelo de nuevo.'
      },
      WEAK_PASSWORD: {
        'pt-BR': 'A senha precisa ter pelo menos 8 caracteres.',
        'en-US': 'Your password must contain at least 8 characters.',
        'es-ES': 'La contraseña debe tener al menos 8 caracteres.'
      }
    };
    if (code && messages[code]) return messages[code][currentLang] || messages[code]['pt-BR'];
    if (error instanceof Error) return error.message;
    return currentLang === 'pt-BR'
      ? 'Não foi possível concluir a operação. Tente novamente.'
      : currentLang === 'es-ES'
        ? 'No se pudo completar la operación. Inténtelo de nuevo.'
        : 'The operation could not be completed. Please try again.';
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      if (currentLang === 'pt-BR') {
        setErrorMessage('Preencha seu e-mail e senha.');
      } else if (currentLang === 'es-ES') {
        setErrorMessage('Por favor, introduzca su correo y contraseña.');
      } else {
        setErrorMessage('Please enter your email and password.');
      }
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const user = await authClient.login(email.trim(), password, rememberMe);
      onLoginSuccess(user);
    } catch (error) {
      setErrorMessage(localizedAuthError(error));
    } finally {
      setIsLoading(false);
    }
  };

  // Manipulador de Cadastro Gratuito
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      if (currentLang === 'pt-BR') {
        setErrorMessage('Preencha seu e-mail e senha.');
      } else if (currentLang === 'es-ES') {
        setErrorMessage('Por favor, introduzca su correo y contraseña.');
      } else {
        setErrorMessage('Please enter your email and password.');
      }
      return;
    }

    if (password.length < 6) {
      if (currentLang === 'pt-BR') {
        setErrorMessage('A senha precisa ter pelo menos 6 caracteres.');
      } else if (currentLang === 'es-ES') {
        setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      } else {
        setErrorMessage('Your password must contain at least 6 characters.');
      }
      return;
    }

    const finalAuthorName = authorName.trim() || email.split('@')[0] || 'Autor';

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const user = await authClient.register(email.trim(), finalAuthorName, password, rememberMe);
      onLoginSuccess(user);
    } catch (error) {
      setErrorMessage(localizedAuthError(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#030712',
      backgroundImage: 'radial-gradient(circle at 50% 15%, #0c2340 0%, #030a1c 45%, #020617 100%)',
      color: '#f8fafc',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      position: 'relative',
      overflowX: 'hidden',
      paddingBottom: 40
    }} className="login-page">
      {/* GLOW DE FUNDO NEON */}
      <div style={{
        position: 'absolute',
        top: 60,
        left: '45%',
        width: 600,
        height: 600,
        background: 'radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, rgba(2, 132, 199, 0) 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* ================================================================== */}
      {/* 1. TOP HEADER DA LANDING PAGE COM SELETOR DE IDIOMAS               */}
      {/* ================================================================== */}
      <header style={{
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(16px)',
        backgroundColor: 'rgba(3, 7, 18, 0.75)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{
          maxWidth: 1360,
          margin: '0 auto',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16
        }} className="login-page__header-inner">
          {/* LOGO BOOKENGIN */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(14, 165, 233, 0.45)'
            }}>
              <BookOpen size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.3px', color: '#ffffff' }}>
                  BookEngin
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: '0.2px' }}>
                {t('landing.subHeaderBrand')}
              </div>
            </div>
          </div>

          {/* SELETOR DE IDIOMAS COM BANDEIRAS (MUDA TODO O SISTEMA) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: 30,
            padding: '4px 10px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }} className="login-page__language-selector">
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginRight: 2 }}>
              {t('nav.language')}:
            </span>

            {/* Brasil mantém a escolha de idioma; fora do Brasil, o site fica em inglês. */}
            {isBrazil && <>
            <button
              type="button"
              onClick={() => setLanguage('pt-BR')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: currentLang === 'pt-BR' ? 'rgba(14, 165, 233, 0.25)' : 'transparent',
                border: currentLang === 'pt-BR' ? '1px solid #38bdf8' : '1px solid transparent',
                borderRadius: 20,
                padding: '4px 9px',
                color: currentLang === 'pt-BR' ? '#ffffff' : '#94a3b8',
                fontSize: 12,
                fontWeight: currentLang === 'pt-BR' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Português (Brasil)"
            >
              <span>🇧🇷</span> Português
            </button>
            </>}

            {/* ENGLISH */}
            <button
              type="button"
              onClick={() => setLanguage('en-US')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: currentLang === 'en-US' ? 'rgba(14, 165, 233, 0.25)' : 'transparent',
                border: currentLang === 'en-US' ? '1px solid #38bdf8' : '1px solid transparent',
                borderRadius: 20,
                padding: '4px 9px',
                color: currentLang === 'en-US' ? '#ffffff' : '#94a3b8',
                fontSize: 12,
                fontWeight: currentLang === 'en-US' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="English (US)"
            >
              <span>🇺🇸</span> English
            </button>

            {isBrazil && <>
            {/* ESPAÑOL */}
            <button
              type="button"
              onClick={() => setLanguage('es-ES')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: currentLang === 'es-ES' ? 'rgba(14, 165, 233, 0.25)' : 'transparent',
                border: currentLang === 'es-ES' ? '1px solid #38bdf8' : '1px solid transparent',
                borderRadius: 20,
                padding: '4px 9px',
                color: currentLang === 'es-ES' ? '#ffffff' : '#94a3b8',
                fontSize: 12,
                fontWeight: currentLang === 'es-ES' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Español"
            >
              <span>🇪🇸</span> Español
            </button>
            </>}
          </div>

          {/* SLOGAN & CTA SUPERIOR */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: '#38bdf8',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.2px'
          }}>
            <TrendingUp size={16} color="#38bdf8" />
            <span>{t('landing.sloganHeader')}</span>
          </div>
        </div>
      </header>

      {/* ================================================================== */}
      {/* 2. ÁREA PRINCIPAL DA LANDING PAGE (GRID DE DIVULGAÇÃO & LOGIN)     */}
      {/* ================================================================== */}
      <main style={{
        maxWidth: 1360,
        margin: '0 auto',
        padding: '36px 24px',
        position: 'relative',
        zIndex: 1
      }} className="login-page__main">
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 340px 420px',
          gap: 28,
          alignItems: 'start'
        }} className="login-page__layout">
          {/* -------------------------------------------------------------- */}
          {/* COLUNA 1: APRESENTAÇÃO, 6 RECURSOS & BOX DE PREÇOS             */}
          {/* -------------------------------------------------------------- */}
          <div>
            {/* HEADLINE PRINCIPAL DINÂMICA POR IDIOMA */}
            <h1 style={{
              margin: '0 0 14px 0',
              fontSize: 38,
              fontWeight: 900,
              lineHeight: 1.15,
              color: '#ffffff',
              letterSpacing: '-0.8px'
            }}>
              {t('landing.heroTitleMain')}{' '}
              <span style={{
                background: 'linear-gradient(90deg, #38bdf8 0%, #0284c7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                {t('landing.heroTitleHighlight')}
              </span>
            </h1>

            {/* SUBTÍTULO DESCRITIVO */}
            <p style={{
              margin: '0 0 18px 0',
              fontSize: 14,
              lineHeight: 1.6,
              color: '#94a3b8',
              maxWidth: 580
            }}>
              {t('landing.heroDesc')}
            </p>

            {/* PLATAFORMAS HOMOLOGADAS DE PUBLICAÇÃO */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 22,
              padding: '8px 12px',
              borderRadius: 10,
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(56, 189, 248, 0.25)'
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                {currentLang === 'pt-BR' ? 'Plataformas:' : currentLang === 'es-ES' ? 'Plataformas:' : 'Platforms:'}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.35)', color: '#fbbf24', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
                Amazon KDP
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.35)', color: '#38bdf8', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
                Google Play Books
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.35)', color: '#c084fc', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
                Apple Books
              </span>
            </div>

            {/* GRID DE 6 RECURSOS DA PLATAFORMA */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              marginBottom: 24
            }} className="login-page__feature-grid">
              {/* 1. Pesquisa Inteligente */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 12,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12
              }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Search size={18} color="#ffffff" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                    {t('landing.featResearchTitle')}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, lineHeight: 1.3 }}>
                    {t('landing.featResearchDesc')}
                  </div>
                </div>
              </div>

              {/* 2. Escrita com IA */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 12,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12
              }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: '#9333ea',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <FileText size={18} color="#ffffff" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                    {t('landing.featWritingTitle')}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, lineHeight: 1.3 }}>
                    {t('landing.featWritingDesc')}
                  </div>
                </div>
              </div>

              {/* 3. Geração de Capas */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 12,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12
              }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <ImageIcon size={18} color="#ffffff" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                    {t('landing.featCoverTitle')}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, lineHeight: 1.3 }}>
                    {t('landing.featCoverDesc')}
                  </div>
                </div>
              </div>

              {/* 4. PDF Pronto para KDP */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 12,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12
              }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: '#f97316',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <FileCheck size={18} color="#ffffff" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                    {t('landing.featPdfTitle')}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, lineHeight: 1.3 }}>
                    {t('landing.featPdfDesc')}
                  </div>
                </div>
              </div>

              {/* 5. Análise de Mercado */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 12,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12
              }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: '#ec4899',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <TrendingUp size={18} color="#ffffff" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                    {t('landing.featMarketTitle')}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, lineHeight: 1.3 }}>
                    {t('landing.featMarketDesc')}
                  </div>
                </div>
              </div>

              {/* 6. Tudo em um só lugar */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 12,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12
              }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: '#06b6d4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Zap size={18} color="#ffffff" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                    {t('landing.featAllInOneTitle')}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, lineHeight: 1.3 }}>
                    {t('landing.featAllInOneDesc')}
                  </div>
                </div>
              </div>
            </div>

            {/* BOX DE PREÇO: ASSINATURA MENSAL OFICIAL (49,90 R$, US$ OU EURO) */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(8, 20, 48, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
              border: '1.5px solid rgba(56, 189, 248, 0.45)',
              borderRadius: 16,
              padding: '18px 20px',
              boxShadow: '0 10px 30px -10px rgba(14, 165, 233, 0.25)',
              marginBottom: 20
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 14,
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                paddingBottom: 14,
                marginBottom: 12
              }}>
                {/* PREÇO DA ASSINATURA MENSAL (DINÂMICO R$ 49,90 / US$ 49.90 / 49,90 €) */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#38bdf8', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                    {t('landing.pricingTag')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 32, fontWeight: 900, color: '#38bdf8', letterSpacing: '-0.5px' }}>
                      {subscriptionPrice}
                    </span>
                    <span style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 600 }}>
                      {t('landing.pricingPeriod')}
                    </span>
                  </div>
                </div>

                {/* BADGE ACESSO ILIMITADO & CANCELAMENTO FLEXÍVEL */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'rgba(14, 165, 233, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  padding: '8px 14px',
                  borderRadius: 10
                }}>
                  <Zap size={22} color="#38bdf8" />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#38bdf8' }}>
                      {t('landing.pricingBadge')}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      {t('landing.pricingCancelAnytime')}
                    </div>
                  </div>
                </div>
              </div>

              {/* LISTA DE BENEFÍCIOS */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10,
                fontSize: 12,
                color: '#cbd5e1'
              }} className="login-page__pricing-benefits">
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CheckCircle2 size={15} color="#10b981" />
                  <span>{t('landing.pricingBenefit1')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CheckCircle2 size={15} color="#10b981" />
                  <span>{t('landing.pricingBenefit2')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CheckCircle2 size={15} color="#10b981" />
                  <span>{t('landing.pricingBenefit3')}</span>
                </div>
              </div>

              {/* FRASE DE IMPACTO & CALLOUT */}
              <div style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#38bdf8' }}>
                  {t('landing.pricingImpact')}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                  {replacePlatformPrice(t('landing.pricingCallout'), subscriptionPrice)}
                </div>
              </div>
            </div>

            {/* 3 PILARES NO RODAPÉ */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'rgba(15, 23, 42, 0.4)',
              borderRadius: 12,
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }} className="login-page__pillars">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={16} color="#38bdf8" />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#ffffff' }}>{t('landing.pillarSecure')}</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>{t('landing.pillarSecureDesc')}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={16} color="#38bdf8" />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#ffffff' }}>{t('landing.pillarFast')}</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>{t('landing.pillarFastDesc')}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Cloud size={16} color="#38bdf8" />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#ffffff' }}>{t('landing.pillarCloud')}</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>{t('landing.pillarCloudDesc')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* COLUNA 2: MOCKUPS 3D DOS LIVROS KDP (EXATAMENTE COMO NA FOTO)  */}
          {/* -------------------------------------------------------------- */}
          <div style={{
            position: 'relative',
            height: '100%',
            minHeight: 520,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* AURA AZUL CIRCULAR ATRÁS DOS LIVROS */}
            <div style={{
              position: 'absolute',
              width: 320,
              height: 320,
              borderRadius: '50%',
              border: '2px solid rgba(14, 165, 233, 0.4)',
              boxShadow: '0 0 50px rgba(14, 165, 233, 0.3), inset 0 0 40px rgba(14, 165, 233, 0.2)',
              pointerEvents: 'none'
            }} />

            {/* LIVRO 1: O ÚLTIMO SEGREDO / THE LAST SECRET (HTML DINÂMICO POR IDIOMA) */}
            <div
              style={{
                position: 'absolute',
                top: 15,
                right: 20,
                width: 180,
                height: 265,
                borderRadius: 8,
                boxShadow: '-18px 24px 38px rgba(0, 0, 0, 0.95), 0 0 25px rgba(14, 165, 233, 0.35)',
                transform: 'rotate(7deg) perspective(800px) rotateY(-8deg)',
                overflow: 'hidden',
                border: '1.5px solid rgba(255, 255, 255, 0.25)',
                background: '#090d16',
                transition: 'transform 0.3s ease',
                cursor: 'pointer'
              }}
              title={t('landing.cover1.title')}
            >
              {/* Arte de fundo de alta definição sem texto */}
              <img
                src="/covers/bg-thriller-clean.jpg"
                alt=""
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {/* Overlays gradientes para contraste editorial */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 110, background: 'linear-gradient(180deg, rgba(2,6,23,0.95) 0%, rgba(2,6,23,0.65) 55%, transparent 100%)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(0deg, rgba(2,6,23,0.95) 0%, rgba(2,6,23,0.6) 60%, transparent 100%)' }} />
              
              {/* Camada Editorial em Puro HTML (traduz dinamicamente com o seletor) */}
              <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '12px 10px', boxSizing: 'border-box' }}>
                <div>
                  <div style={{ textAlign: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 7, fontWeight: 800, color: '#fbbf24', letterSpacing: '1.5px', textTransform: 'uppercase', border: '1px solid rgba(251, 191, 36, 0.5)', padding: '1px 6px', borderRadius: 3, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}>
                      {t('landing.cover1.badge')}
                    </span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 13, fontWeight: 900, color: '#ffffff', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.8px', lineHeight: 1.15, fontFamily: "'Cinzel', Georgia, serif", textShadow: '0 2px 6px rgba(0,0,0,0.95), 0 0 12px rgba(14,165,233,0.6)' }}>
                    {t('landing.cover1.title')}
                  </h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: 7, fontWeight: 700, color: '#38bdf8', textAlign: 'center', letterSpacing: '1px', textTransform: 'uppercase', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
                    {t('landing.cover1.subtitle')}
                  </p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 8, fontWeight: 800, color: '#f1f5f9', letterSpacing: '1.5px', textTransform: 'uppercase', textShadow: '0 1px 4px rgba(0,0,0,0.95)' }}>
                    {t('landing.cover1.author')}
                  </span>
                </div>
              </div>
            </div>

            {/* LIVRO 2: DINOSSAUROS PARA COLORIR / DINOSAURS COLORING (HTML DINÂMICO POR IDIOMA) */}
            <div
              style={{
                position: 'absolute',
                top: 155,
                left: 5,
                width: 188,
                height: 278,
                borderRadius: 8,
                boxShadow: '18px 26px 42px rgba(0, 0, 0, 0.9), 0 0 30px rgba(56, 189, 248, 0.4)',
                transform: 'rotate(-6deg) perspective(800px) rotateY(8deg)',
                overflow: 'hidden',
                border: '1.5px solid rgba(255, 255, 255, 0.35)',
                background: '#090d16',
                zIndex: 3,
                transition: 'transform 0.3s ease',
                cursor: 'pointer'
              }}
              title={t('landing.cover2.title')}
            >
              {/* Arte de fundo de alta definição sem texto */}
              <img
                src="/covers/bg-dino-clean.jpg"
                alt=""
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {/* Overlays gradientes */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 105, background: 'linear-gradient(180deg, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.65) 50%, transparent 100%)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 55, background: 'linear-gradient(0deg, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.5) 60%, transparent 100%)' }} />

              {/* Camada Editorial em Puro HTML */}
              <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '12px 10px', boxSizing: 'border-box' }}>
                <div>
                  <div style={{ textAlign: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 7, fontWeight: 900, color: '#ffffff', letterSpacing: '1px', textTransform: 'uppercase', background: 'linear-gradient(135deg, #10b981, #059669)', padding: '2px 8px', borderRadius: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.5)' }}>
                      {t('landing.cover2.badge')}
                    </span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 13, fontWeight: 900, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.15, fontFamily: "'Outfit', sans-serif", color: '#fef08a', textShadow: '0 2px 6px rgba(0,0,0,0.95), 0 0 12px rgba(245,158,11,0.6)' }}>
                    {t('landing.cover2.title')}
                  </h3>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ display: 'inline-block', fontSize: 7, fontWeight: 800, color: '#fef08a', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(254, 240, 138, 0.4)', borderRadius: 6, padding: '2px 6px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                    {t('landing.cover2.subtitle')}
                  </span>
                </div>
              </div>
            </div>

            {/* LIVRO 3: SUDOKU DESAFIO / SUDOKU CHALLENGE (HTML DINÂMICO POR IDIOMA) */}
            <div
              style={{
                position: 'absolute',
                bottom: 10,
                right: 12,
                width: 172,
                height: 256,
                borderRadius: 8,
                boxShadow: '0 25px 45px rgba(0, 0, 0, 0.95), 0 0 25px rgba(14, 165, 233, 0.3)',
                transform: 'rotate(5deg) perspective(800px)',
                overflow: 'hidden',
                border: '1.5px solid rgba(255, 255, 255, 0.3)',
                background: '#090d16',
                zIndex: 4,
                transition: 'transform 0.3s ease',
                cursor: 'pointer'
              }}
              title={t('landing.cover3.title')}
            >
              {/* Arte de fundo de alta definição sem texto */}
              <img
                src="/covers/bg-sudoku-clean.jpg"
                alt=""
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {/* Overlays gradientes */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 95, background: 'linear-gradient(180deg, rgba(3,7,18,0.92) 0%, rgba(3,7,18,0.6) 55%, transparent 100%)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, background: 'linear-gradient(0deg, rgba(3,7,18,0.95) 0%, rgba(3,7,18,0.6) 60%, transparent 100%)' }} />

              {/* Camada Editorial em Puro HTML */}
              <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '12px 10px', boxSizing: 'border-box' }}>
                <div>
                  <div style={{ textAlign: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 7, fontWeight: 800, color: '#38bdf8', letterSpacing: '1.2px', textTransform: 'uppercase', border: '1px solid rgba(56, 189, 248, 0.45)', padding: '1px 6px', borderRadius: 3, background: 'rgba(3, 7, 18, 0.8)' }}>
                      {t('landing.cover3.badge')}
                    </span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 13, fontWeight: 900, color: '#facc15', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1.2px', lineHeight: 1.15, textShadow: '0 2px 6px rgba(0,0,0,0.95), 0 0 10px rgba(250,204,21,0.5)' }}>
                    {t('landing.cover3.title')}
                  </h3>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ display: 'inline-block', fontSize: 7, fontWeight: 700, color: '#94a3b8', background: 'rgba(3, 7, 18, 0.85)', padding: '2px 6px', borderRadius: 4, letterSpacing: '0.4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {t('landing.cover3.subtitle')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* COLUNA 3: CARD OFICIAL DE LOGIN & CADASTRO GRATUITO            */}
          {/* -------------------------------------------------------------- */}
          <div style={{
            background: 'rgba(11, 20, 38, 0.88)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: 20,
            padding: '30px 26px',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 25px rgba(14, 165, 233, 0.15)'
          }} className="login-page__auth-card">
            {/* TOPO DO CARD COM LOGO */}
            <div style={{ textAlign: 'center', marginBottom: 22 }}>
              <div style={{
                width: 52,
                height: 52,
                margin: '0 auto 12px auto',
                borderRadius: 14,
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(14, 165, 233, 0.5)'
              }}>
                <BookOpen size={26} color="#ffffff" />
              </div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.3px' }}>
                BookEngin
              </h2>
              <p style={{ margin: '6px 0 0 0', fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>
                {t('landing.authSubtitle')}
              </p>
            </div>

            {/* ABAS: [ENTRAR] vs [CADASTRAR-SE] */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              background: 'rgba(3, 7, 18, 0.6)',
              padding: 4,
              borderRadius: 10,
              marginBottom: 20
            }}>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setPassword('');
                  setErrorMessage(null);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: activeTab === 'login' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'transparent',
                  color: activeTab === 'login' ? '#ffffff' : '#94a3b8',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <ArrowRight size={14} /> {t('landing.tabLogin')}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setPassword('');
                  setErrorMessage(null);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: activeTab === 'register' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'transparent',
                  color: activeTab === 'register' ? '#ffffff' : '#94a3b8',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <User size={14} /> {t('landing.tabRegister')}
              </button>
            </div>

            {/* MENSAGEM DE ERRO SE HOUVER */}
            {errorMessage && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 12,
                color: '#fca5a5',
                marginBottom: 16
              }}>
                {errorMessage}
              </div>
            )}

            {/* ABA 1: FORMULÁRIO DE LOGIN */}
            {activeTab === 'login' ? (
              <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Campo E-mail */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#cbd5e1', marginBottom: 5 }}>
                    {t('landing.labelEmail')}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 12, top: 11, color: '#64748b' }}>
                      <Mail size={15} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('landing.placeholderEmail')}
                      autoComplete="username"
                      required
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 36px',
                        background: 'rgba(3, 7, 18, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.14)',
                        borderRadius: 8,
                        color: '#ffffff',
                        fontSize: 13,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Campo Senha */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#cbd5e1', marginBottom: 5 }}>
                    {t('landing.labelPassword')}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 12, top: 11, color: '#64748b' }}>
                      <Lock size={15} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('landing.placeholderPassword')}
                      autoComplete="current-password"
                      required
                      style={{
                        width: '100%',
                        padding: '9px 36px 9px 36px',
                        background: 'rgba(3, 7, 18, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.14)',
                        borderRadius: 8,
                        color: '#ffffff',
                        fontSize: 13,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: 11,
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Checkbox Lembrar de mim e Esqueci a Senha */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{ accentColor: '#0284c7' }}
                    />
                    {t('landing.rememberMe')}
                  </label>
                  <span style={{ color: '#38bdf8', cursor: 'pointer', fontWeight: 600 }}>
                    {t('landing.forgotPassword')}
                  </span>
                </div>

                {/* Botão Primário: Entrar no Painel */}
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    marginTop: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '12px 18px',
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(14, 165, 233, 0.4)',
                    transition: 'all 0.2s'
                  }}
                >
                  {isLoading ? (
                    <span>{t('landing.btnLoading')}</span>
                  ) : (
                    <>
                      {t('landing.btnEnterDashboard')} <ArrowRight size={16} />
                    </>
                  )}
                </button>

                {/* DIVISOR: OU */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  margin: '10px 0',
                  gap: 12
                }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.1)' }} />
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>
                    {t('landing.orDivider')}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.1)' }} />
                </div>

                {/* BLOCO DE CADASTRO GRATUITO RÁPIDO */}
                <div style={{
                  background: 'rgba(2, 132, 199, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: 12,
                  padding: '14px',
                  textAlign: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 800, color: '#38bdf8' }}>
                    <User size={16} /> {t('landing.registerBoxTitle')}
                  </div>
                  <p style={{ margin: '4px 0 10px 0', fontSize: 11, color: '#94a3b8', lineHeight: 1.3 }}>
                    {t('landing.registerBoxDesc')}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('register');
                      setPassword('');
                      setErrorMessage(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 14px',
                      borderRadius: 8,
                      background: 'transparent',
                      border: '1px solid #38bdf8',
                      color: '#38bdf8',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <User size={14} /> {t('landing.btnCreateAccount')} <ArrowRight size={14} />
                  </button>
                </div>
              </form>
            ) : (
              /* ABA 2: FORMULÁRIO DE CADASTRO GRATUITO */
              <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Nome do Autor */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#cbd5e1', marginBottom: 5 }}>
                    {t('landing.labelName')}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 12, top: 11, color: '#64748b' }}>
                      <User size={15} />
                    </div>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder={t('landing.placeholderName')}
                      autoComplete="name"
                      required
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 36px',
                        background: 'rgba(3, 7, 18, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.14)',
                        borderRadius: 8,
                        color: '#ffffff',
                        fontSize: 13,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* E-mail */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#cbd5e1', marginBottom: 5 }}>
                    {t('landing.labelEmail')}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 12, top: 11, color: '#64748b' }}>
                      <Mail size={15} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('landing.placeholderEmail')}
                      autoComplete="email"
                      required
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 36px',
                        background: 'rgba(3, 7, 18, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.14)',
                        borderRadius: 8,
                        color: '#ffffff',
                        fontSize: 13,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Senha */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#cbd5e1', marginBottom: 5 }}>
                    {t('landing.labelPassword')}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 12, top: 11, color: '#64748b' }}>
                      <Lock size={15} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('landing.placeholderPasswordCreate')}
                      autoComplete="new-password"
                      minLength={6}
                      required
                      style={{
                        width: '100%',
                        padding: '9px 36px 9px 36px',
                        background: 'rgba(3, 7, 18, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.14)',
                        borderRadius: 8,
                        color: '#ffffff',
                        fontSize: 13,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: 11,
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Aviso da Assinatura Mensal Internacionalizada */}
                <div style={{
                  background: 'rgba(14, 165, 233, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  fontSize: 11,
                  color: '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <CheckCircle2 size={14} color="#38bdf8" />
                  <span>{replacePlatformPrice(t('landing.subscriptionNotice'), subscriptionPrice)}</span>
                </div>

                {/* Botão de Concluir Cadastro */}
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '12px 18px',
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(14, 165, 233, 0.4)',
                    transition: 'all 0.2s'
                  }}
                >
                  {isLoading ? (
                    <span>{t('landing.btnLoading')}</span>
                  ) : (
                    <>
                      {t('landing.btnSubmitRegister')} <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* SELO DE AMBIENTE EDITORIAL SEGURO */}
            <div style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontSize: 11,
              color: '#64748b'
            }}>
              <ShieldCheck size={14} color="#10b981" />
              <span>{t('landing.securityFootnote')}</span>
            </div>
          </div>
        </div>
      </main>

      {/* ================================================================== */}
      {/* 3. RODAPÉ INFERIOR DA PÁGINA                                        */}
      {/* ================================================================== */}
      <footer style={{
        marginTop: 40,
        paddingTop: 20,
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        textAlign: 'center',
        fontSize: 12,
        color: '#64748b'
      }}>
        {t('landing.footerCopyright')}
        <div style={{ marginTop: 8, fontSize: 10 }}>
          {currentLang === 'pt-BR'
            ? 'País detectado aproximadamente pelo endereço IP para definir idioma e moeda. A consulta usa ipapi.co.'
            : 'Country is estimated from your IP address to select language and currency. Lookup provided by ipapi.co.'}
        </div>
      </footer>
    </div>
  );
};
