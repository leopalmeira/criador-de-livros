// ============================================================================
// BOOK INTEL KDP — LANDING PAGE OFICIAL DE DIVULGAÇÃO & ACESSO EDITORIAL
// Substitui a antiga tela de login simples pela página completa de apresentação.
// Layout idêntico à identidade visual oficial da plataforma:
// - Design Dark Neon com glow azul/ciano
// - Seletor de Idiomas (Português, English, Español) com troca em tempo real
// - Grid de 6 Recursos da Plataforma
// - Box de Preço e Crédito: Cadastro Gratuito + US$ 3 por livro gerado
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

interface Props {
  onLoginSuccess: (user: { name: string; email: string }) => void;
}

export const LoginPage: React.FC<Props> = ({ onLoginSuccess }) => {
  const { t, currentLang, setLanguage } = useTranslation();

  // Estados de formulário
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('leandro.palmeira@kdpintel.com');
  const [password, setPassword] = useState('••••••••••••');
  const [authorName, setAuthorName] = useState('Leandro Palmeira');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manipulador de Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage(currentLang === 'pt-BR' ? 'Preencha seu e-mail e senha.' : 'Please enter your email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    setTimeout(() => {
      setIsLoading(false);
      const name = authorName.trim() || (email.includes('leandro') ? 'Leandro Palmeira' : 'Autor KDP Pro');
      const authData = {
        name,
        email,
        token: `kdp_token_${Date.now()}`
      };

      if (typeof window !== 'undefined') {
        if (rememberMe) {
          localStorage.setItem('kdp_auth_user', JSON.stringify(authData));
        } else {
          sessionStorage.setItem('kdp_auth_user', JSON.stringify(authData));
        }
      }

      onLoginSuccess(authData);
    }, 400);
  };

  // Manipulador de Cadastro Gratuito
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage(currentLang === 'pt-BR' ? 'Preencha todos os campos para cadastrar sua conta gratuita.' : 'Please fill all fields to register.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    setTimeout(() => {
      setIsLoading(false);
      const name = authorName.trim() || 'Novo Autor KDP';
      const authData = {
        name,
        email,
        token: `kdp_token_${Date.now()}`
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('kdp_auth_user', JSON.stringify(authData));
      }

      onLoginSuccess(authData);
    }, 450);
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
    }}>
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
        }}>
          {/* LOGO BOOK INTEL KDP */}
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
                <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.3px', color: '#ffffff' }}>
                  BOOK INTEL
                </span>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#38bdf8' }}>
                  KDP
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
          }}>
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginRight: 2 }}>
              {t('nav.language')}:
            </span>

            {/* PORTUGUÊS */}
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
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 340px 420px',
          gap: 28,
          alignItems: 'start'
        }}>
          {/* -------------------------------------------------------------- */}
          {/* COLUNA 1: APRESENTAÇÃO, 6 RECURSOS & BOX DE PREÇOS             */}
          {/* -------------------------------------------------------------- */}
          <div>
            {/* BADGE PLATAFORMA COMPLETA */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(2, 132, 199, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: 11,
              fontWeight: 800,
              color: '#38bdf8',
              letterSpacing: '0.8px',
              marginBottom: 16,
              textTransform: 'uppercase'
            }}>
              <Zap size={14} color="#facc15" fill="#facc15" />
              <span>{t('landing.badgePlatform')}</span>
            </div>

            {/* HEADLINE PRINCIPAL */}
            <h1 style={{
              margin: '0 0 14px 0',
              fontSize: 38,
              fontWeight: 900,
              lineHeight: 1.15,
              color: '#ffffff',
              letterSpacing: '-0.8px'
            }}>
              Crie Livros Incríveis{' '}
              <span style={{
                background: 'linear-gradient(90deg, #38bdf8 0%, #0284c7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                para a Amazon KDP
              </span>
            </h1>

            {/* SUBTÍTULO DESCRITIVO */}
            <p style={{
              margin: '0 0 24px 0',
              fontSize: 14,
              lineHeight: 1.6,
              color: '#94a3b8',
              maxWidth: 580
            }}>
              {t('landing.heroDesc')}
            </p>

            {/* GRID DE 6 RECURSOS DA PLATAFORMA */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              marginBottom: 24
            }}>
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

            {/* BOX DE PREÇO & CRÉDITOS (ADAPTADO CONFORME PEDIDO DO USUÁRIO) */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(8, 20, 48, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
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
                {/* PREÇO DE CRÉDITO POR LIVRO */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#38bdf8', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                    {t('landing.pricingTag')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 32, fontWeight: 900, color: '#38bdf8', letterSpacing: '-0.5px' }}>
                      US$ 3
                    </span>
                    <span style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 600 }}>
                      {t('landing.pricingPerBook')}
                    </span>
                  </div>
                </div>

                {/* CADASTRO GRATUITO & PAGUE POR LIVRO */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '8px 14px',
                  borderRadius: 10
                }}>
                  <Layers size={22} color="#34d399" />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#34d399' }}>
                      {t('landing.pricingFreeSignup')}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      {t('landing.pricingPayPerUse')}
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
              }}>
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

              {/* FRASE DE IMPACTO */}
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
                  {t('landing.pricingCallout')}
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
            }}>
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

            {/* LIVRO 1: O ÚLTIMO SEGREDO (NO TOPO, INCLINADO) */}
            <div style={{
              position: 'absolute',
              top: 15,
              right: 25,
              width: 175,
              height: 250,
              borderRadius: 6,
              background: 'linear-gradient(135deg, #1c1917, #0c0a09)',
              border: '1.5px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '-15px 20px 35px rgba(0, 0, 0, 0.9), 0 0 20px rgba(14, 165, 233, 0.3)',
              transform: 'rotate(8deg) perspective(600px) rotateY(-10deg)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '16px 12px',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: 16,
                fontWeight: 900,
                color: '#ffffff',
                letterSpacing: '1px',
                lineHeight: 1.15,
                textTransform: 'uppercase'
              }}>
                O ÚLTIMO<br />SEGREDO
              </div>
              <div style={{ fontSize: 9, color: '#f59e0b', letterSpacing: '1.2px', textTransform: 'uppercase', fontWeight: 700 }}>
                UM THRILLER DE SUSPENSE
              </div>
              {/* Ilustração silhueta floresta com cabana */}
              <div style={{
                height: 110,
                background: 'radial-gradient(circle at 50% 80%, #78350f 0%, #1c1917 70%)',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                paddingBottom: 6,
                boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8)'
              }}>
                <div style={{ fontSize: 24 }}>🏚️🌲</div>
              </div>
              <div style={{ fontSize: 8, color: '#78716c', letterSpacing: '1px' }}>
                EDIÇÃO AMAZON KDP
              </div>
            </div>

            {/* LIVRO 2: DINOSSAUROS PARA COLORIR (CENTRO, VIBRANTE) */}
            <div style={{
              position: 'absolute',
              top: 160,
              left: 10,
              width: 180,
              height: 250,
              borderRadius: 6,
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              border: '1.5px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '15px 25px 40px rgba(0, 0, 0, 0.85), 0 0 25px rgba(56, 189, 248, 0.35)',
              transform: 'rotate(-6deg) perspective(600px) rotateY(8deg)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '14px 10px',
              textAlign: 'center',
              zIndex: 3
            }}>
              <div style={{
                fontSize: 15,
                fontWeight: 900,
                color: '#facc15',
                textShadow: '0 2px 4px rgba(0,0,0,0.6)',
                letterSpacing: '0.5px',
                lineHeight: 1.15
              }}>
                DINOSSAUROS<br />
                <span style={{ color: '#ffffff' }}>PARA COLORIR</span>
              </div>
              <div style={{
                height: 125,
                background: 'linear-gradient(180deg, #38bdf8 0%, #16a34a 100%)',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'inset 0 0 8px rgba(0,0,0,0.3)'
              }}>
                <div style={{ fontSize: 50, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))' }}>
                  🦖
                </div>
              </div>
              <div style={{ fontSize: 8, color: '#e0f2fe', fontWeight: 700, letterSpacing: '0.5px' }}>
                50 ILUSTRAÇÕES EXCLUSIVAS
              </div>
            </div>

            {/* LIVRO 3: SUDOKU DESAFIO (FRENTE / BAIXO) */}
            <div style={{
              position: 'absolute',
              bottom: 10,
              right: 15,
              width: 165,
              height: 235,
              borderRadius: 6,
              background: '#09090b',
              border: '1.5px solid rgba(255, 255, 255, 0.25)',
              boxShadow: '0 25px 45px rgba(0, 0, 0, 0.9), 0 0 20px rgba(14, 165, 233, 0.25)',
              transform: 'rotate(5deg) perspective(600px)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '14px 10px',
              textAlign: 'center',
              zIndex: 4
            }}>
              <div style={{
                fontSize: 16,
                fontWeight: 900,
                color: '#facc15',
                letterSpacing: '1px',
                lineHeight: 1.1
              }}>
                SUDOKU<br />
                <span style={{ color: '#ffffff' }}>DESAFIO</span>
              </div>

              {/* Grid 4x4 ilustrativo do Sudoku */}
              <div style={{
                margin: '6px auto',
                width: 110,
                height: 110,
                background: '#ffffff',
                borderRadius: 4,
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                border: '1.5px solid #000000',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
              }}>
                {[
                  '1', '7', '3', '2',
                  '2', '8', '5', '3',
                  '4', '2', '2', '5',
                  '6', '0', '8', '4'
                ].map((n, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 800,
                    color: '#000000',
                    border: '0.5px solid #cbd5e1'
                  }}>
                    {n}
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 8, color: '#a1a1aa', fontWeight: 600 }}>
                200 ENIGMAS COM RESPOSTAS
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
          }}>
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
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#ffffff' }}>
                BOOK INTEL <span style={{ color: '#38bdf8' }}>KDP</span>
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
                onClick={() => setActiveTab('login')}
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
                onClick={() => setActiveTab('register')}
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
                      placeholder="seu.email@exemplo.com"
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
                      placeholder="Digite sua senha"
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
                    <span>Carregando...</span>
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
                    onClick={() => setActiveTab('register')}
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
                      placeholder="Ex: Leandro Palmeira"
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
                      placeholder="seu.email@exemplo.com"
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
                      placeholder="Crie uma senha segura"
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

                {/* Aviso de Cadastro 100% Gratuito */}
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  fontSize: 11,
                  color: '#34d399',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <CheckCircle2 size={14} color="#10b981" />
                  <span>Cadastro 100% gratuito. Pague apenas US$ 3 por livro ao gerar.</span>
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
                    <span>Criando acesso...</span>
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
      </footer>
    </div>
  );
};
