// ============================================================================
// BOOKENGIN — LANDING PAGE OFICIAL & PORTAL SAAS
// Design refinado, responsivo e mobile-first de acordo com as especificações:
// - Troca de idioma em tempo real 100% funcional (Português 🇧🇷, English 🇺🇸, Español 🇪🇸)
// - Cabeçalho responsivo que NUNCA quebra ou corta no celular
// - Hero com as 3 capas dos livros (Thriller, Infantil, Sudoku discreto) visíveis no mobile
// - Plataformas em linha horizontal compacta
// - Botão CTA com preço dinâmico pela moeda do visitante
// - Painel de autenticação limpo (fundo branco, abas claras, campos sem preenchimento prévio)
// - Seções de recursos, fluxo passo a passo, temas, banner e rodapé corporativo
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Cpu,
  Image as ImageIcon,
  Palette,
  FileCheck,
  FolderKanban,
  CheckCircle2,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Headphones,
  Globe,
  ChevronDown,
  X,
  Sparkles,
  Menu,
  TrendingUp
} from 'lucide-react';
import { useTranslation, SupportedLanguage } from '../../../services/i18n-service';
import { AuthApiError, authClient } from '../../../services/auth-client';
import { usePlatformCurrency } from '../../../services/use-platform-currency';
import './login-page.css';

interface Props {
  onLoginSuccess: (user: { id: string; name: string; email: string }) => void;
}

export const LoginPage: React.FC<Props> = ({ onLoginSuccess }) => {
  const { t, currentLang, setLanguage } = useTranslation();
  const { formatProduct, chargeCurrency, chargeDiffersFromDisplay } = usePlatformCurrency();
  const subscriptionPrice = formatProduct('subscription_monthly');

  // Estados de navegação, modal e menu mobile
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Estados do formulário de autenticação
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fecha dropdowns se clicar fora
  useEffect(() => {
    const handleGlobalClick = () => {
      setLangMenuOpen(false);
    };
    if (langMenuOpen) {
      window.addEventListener('click', handleGlobalClick);
      return () => window.removeEventListener('click', handleGlobalClick);
    }
  }, [langMenuOpen]);

  // Mensagens de erro de autenticação localizadas
  const localizedAuthError = (error: unknown): string => {
    const code = error instanceof AuthApiError ? error.code : null;
    const messages: Record<string, Record<string, string>> = {
      INVALID_CREDENTIALS: {
        'pt-BR': 'E-mail ou senha incorretos. Caso ainda não tenha cadastro, crie sua conta para entrar.',
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

  const openAuth = (tab: 'login' | 'register') => {
    setAuthTab(tab);
    setErrorMessage(null);
    setSuccessMessage(null);
    setMobileMenuOpen(false);
    setAuthModalOpen(true);
  };

  const handleSelectLanguage = (lang: SupportedLanguage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLanguage(lang);
    setLangMenuOpen(false);
    setMobileMenuOpen(false);
  };

  // Manipulador de Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage(currentLang === 'pt-BR' ? 'Preencha seu e-mail e senha.' : 'Please enter your email and password.');
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

  // Manipulador de Cadastro
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage(currentLang === 'pt-BR' ? 'Preencha seu e-mail e senha.' : 'Please enter your email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage(currentLang === 'pt-BR' ? 'A senha precisa ter pelo menos 6 caracteres.' : 'Your password must contain at least 6 characters.');
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

  // Manipulador de Recuperação de Senha
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMessage(currentLang === 'pt-BR' ? 'Informe seu e-mail cadastrado.' : 'Please enter your registered email.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      await authClient.requestPasswordReset(email.trim());
      setSuccessMessage(
        currentLang === 'pt-BR'
          ? 'Instruções para redefinição enviadas para o seu e-mail.'
          : 'Instructions for resetting your password have been sent to your email.'
      );
    } catch (error) {
      setErrorMessage(localizedAuthError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const currentLangLabel = currentLang === 'pt-BR' ? 'Português' : currentLang === 'es-ES' ? 'Español' : 'English';
  const currentLangShort = currentLang === 'pt-BR' ? 'PT' : currentLang === 'es-ES' ? 'ES' : 'EN';
  const currentLangFlag = currentLang === 'pt-BR' ? '🇧🇷' : currentLang === 'es-ES' ? '🇪🇸' : '🇺🇸';

  return (
    <div className="be-landing">
      {/* ================================================================== */}
      {/* 1. CABEÇALHO HORIZONTAL SAAS                                       */}
      {/* ================================================================== */}
      <header className="be-header">
        <div className="be-container">
          <div className="be-header-inner">
            {/* Logotipo e Nome à Esquerda */}
            <div className="be-brand">
              <div className="be-brand-logo">
                <BookOpen size={20} />
              </div>
              <div className="be-brand-text">
                <span className="be-brand-name">BookEngin</span>
                <span className="be-brand-slogan">{t('landing.sloganHeader', 'Your Ideas. Complete Books. One Platform.')}</span>
              </div>
            </div>

            {/* Ações Desktop */}
            <div className="be-header-actions-desktop">
              {/* Dropdown de Idioma */}
              <div className="be-lang-dropdown" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="be-lang-btn"
                  onClick={() => setLangMenuOpen(!langMenuOpen)}
                  title="Selecionar idioma / Select language"
                >
                  <Globe size={14} />
                  <span>{currentLangFlag} {currentLangLabel}</span>
                  <ChevronDown size={12} />
                </button>

                {langMenuOpen && (
                  <div className="be-lang-menu">
                    <button
                      type="button"
                      className={`be-lang-item ${currentLang === 'pt-BR' ? 'active' : ''}`}
                      onClick={(e) => handleSelectLanguage('pt-BR', e)}
                    >
                      <span>🇧🇷</span> Português
                    </button>
                    <button
                      type="button"
                      className={`be-lang-item ${currentLang === 'en-US' ? 'active' : ''}`}
                      onClick={(e) => handleSelectLanguage('en-US', e)}
                    >
                      <span>🇺🇸</span> English
                    </button>
                    <button
                      type="button"
                      className={`be-lang-item ${currentLang === 'es-ES' ? 'active' : ''}`}
                      onClick={(e) => handleSelectLanguage('es-ES', e)}
                    >
                      <span>🇪🇸</span> Español
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="be-btn-link"
                onClick={() => openAuth('login')}
              >
                {t('landing.tabLogin', 'Entrar')}
              </button>

              <button
                type="button"
                className="be-btn-header-cta"
                onClick={() => openAuth('register')}
              >
                {t('landing.tabRegister', 'Cadastrar-se')}
              </button>
            </div>

            {/* Ações Mobile (Compacto e Elegante: Idioma + Entrar + Menu) */}
            <div className="be-header-actions-mobile">
              {/* Botão rápido de idioma no mobile */}
              <button
                type="button"
                className="be-mobile-lang-btn"
                onClick={() => {
                  const nextLang: SupportedLanguage =
                    currentLang === 'pt-BR' ? 'en-US' : currentLang === 'en-US' ? 'es-ES' : 'pt-BR';
                  setLanguage(nextLang);
                }}
                title="Trocar idioma"
              >
                <span>{currentLangFlag}</span>
                <span style={{ fontSize: 11, fontWeight: 700 }}>{currentLangShort}</span>
              </button>

              {/* Botão Entrar no mobile */}
              <button
                type="button"
                className="be-mobile-signin-btn"
                onClick={() => openAuth('login')}
              >
                {t('landing.tabLogin', 'Entrar')}
              </button>

              {/* Hambúrguer para abrir opções completas */}
              <button
                type="button"
                className="be-mobile-menu-btn"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Menu"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Gaveta / Dropdown do Menu Mobile */}
        {mobileMenuOpen && (
          <div className="be-mobile-drawer">
            <div className="be-mobile-drawer-inner">
              <div className="be-mobile-drawer-section">
                <span className="be-mobile-drawer-label">Idioma / Language:</span>
                <div className="be-mobile-lang-options">
                  <button
                    type="button"
                    className={`be-mobile-lang-choice ${currentLang === 'pt-BR' ? 'active' : ''}`}
                    onClick={(e) => handleSelectLanguage('pt-BR', e)}
                  >
                    <span>🇧🇷</span> Português
                  </button>
                  <button
                    type="button"
                    className={`be-mobile-lang-choice ${currentLang === 'en-US' ? 'active' : ''}`}
                    onClick={(e) => handleSelectLanguage('en-US', e)}
                  >
                    <span>🇺🇸</span> English
                  </button>
                  <button
                    type="button"
                    className={`be-mobile-lang-choice ${currentLang === 'es-ES' ? 'active' : ''}`}
                    onClick={(e) => handleSelectLanguage('es-ES', e)}
                  >
                    <span>🇪🇸</span> Español
                  </button>
                </div>
              </div>

              <div className="be-mobile-drawer-actions">
                <button
                  type="button"
                  className="be-btn-mobile-auth-primary"
                  onClick={() => openAuth('register')}
                >
                  {t('landing.tabRegister', 'Cadastrar-se')}
                </button>
                <button
                  type="button"
                  className="be-btn-mobile-auth-secondary"
                  onClick={() => openAuth('login')}
                >
                  {t('landing.tabLogin', 'Entrar')}
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ================================================================== */}
      {/* 2. HERO SECTION COM CAPAS VISÍVEIS NO MOBILE E NO DESKTOP           */}
      {/* ================================================================== */}
      <section className="be-hero">
        <div className="be-container">
          <div className="be-hero-grid">
            {/* Coluna de Conteúdo Editorial */}
            <div className="be-hero-content">
              <div className="be-badge-pill">
                <Sparkles size={13} />
                <span>{t('landing.heroBadge', 'Do tema ao livro publicado')}</span>
              </div>

              <h1 className="be-hero-title">
                {t('landing.heroTitlePrefix', 'Transforme suas ideias em')}{' '}
                <span className="be-hero-title-highlight">
                  {t('landing.heroTitleHighlight', 'livros profissionais')}
                </span>
              </h1>

              <p className="be-hero-desc">
                {t('landing.heroDesc', 'Planeje, pesquise, escreva capítulos, crie capas e prepare seus livros para publicação em uma única plataforma.')}
              </p>

              {/* Bloco de Capas para TELAS MOBILE (Aparece logo abaixo do texto no celular) */}
              <div className="be-hero-visual-mobile">
                <div className="be-covers-stage-mobile">
                  {/* Sudoku Discreto ao Fundo */}
                  <div className="be-book-cover-card-mobile sudoku" title="Sudoku Desafio">
                    <img
                      src="/covers/sudoku-desafio.jpg"
                      alt="Capa Sudoku"
                      className="be-book-cover-img"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/covers/bg-sudoku-clean.jpg';
                      }}
                    />
                  </div>
                  {/* Livro 1: Thriller */}
                  <div className="be-book-cover-card-mobile thriller" title="O Último Segredo">
                    <img
                      src="/covers/o-ultimo-segredo.jpg"
                      alt="Capa O Último Segredo"
                      className="be-book-cover-img"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/covers/bg-thriller-clean.jpg';
                      }}
                    />
                  </div>
                  {/* Livro 2: Ilustrado Infantil */}
                  <div className="be-book-cover-card-mobile dino" title="Dinossauros para Colorir">
                    <img
                      src="/covers/dinossauros-para-colorir.jpg"
                      alt="Capa Dinossauros"
                      className="be-book-cover-img"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/covers/bg-dino-clean.jpg';
                      }}
                    />
                  </div>
                </div>

                {/* Badge flutuante mobile */}
                <div className="be-mobile-cover-feature-pill">
                  <CheckCircle2 size={13} color="#10b981" />
                  <span>{t('landing.cardTitle', 'Seu livro completo, gerado por IA')}</span>
                </div>
              </div>

              {/* Plataformas Atendidas (Linha Horizontal Limpa) */}
              <div className="be-platforms-bar">
                <div className="be-platform-pill">
                  <div className="be-platform-icon amazon">A</div>
                  <div>
                    <div className="be-platform-text-name">Amazon KDP</div>
                    <div className="be-platform-text-desc">{t('landing.platformAmazonDesc', 'Publique e venda globalmente')}</div>
                  </div>
                </div>

                <div className="be-platform-pill">
                  <div className="be-platform-icon google">G</div>
                  <div>
                    <div className="be-platform-text-name">Google Play Books</div>
                    <div className="be-platform-text-desc">{t('landing.platformGoogleDesc', 'Alcance milhões de leitores')}</div>
                  </div>
                </div>

                <div className="be-platform-pill">
                  <div className="be-platform-icon apple"></div>
                  <div>
                    <div className="be-platform-text-name">Apple Books</div>
                    <div className="be-platform-text-desc">{t('landing.platformAppleDesc', 'Mais uma forma de publicar')}</div>
                  </div>
                </div>
              </div>

              {/* Botão Primário Hero com Moeda Dinâmica */}
              <div className="be-hero-cta-wrapper">
                <button
                  type="button"
                  className="be-btn-primary-hero"
                  onClick={() => openAuth('register')}
                >
                  <span>{t('landing.ctaStart', 'Comece agora')} — {subscriptionPrice}/mês</span>
                  <ArrowRight size={18} />
                </button>
              </div>

              {/* Micro-benefícios com Ícones */}
              <div className="be-hero-guarantees">
                <div className="be-hero-guarantee-item">
                  <BookOpen size={15} color="#0284c7" />
                  <span>{t('landing.guaranteeBooks', 'Até 15 livros por mês')}</span>
                </div>
                <div className="be-hero-guarantee-item">
                  <ShieldCheck size={15} color="#16a34a" />
                  <span>{t('landing.guaranteeCard', 'Sem cartão de crédito (ou cancele quando quiser)')}</span>
                </div>
                <div className="be-hero-guarantee-item">
                  <Headphones size={15} color="#0284c7" />
                  <span>{t('landing.guaranteeSupport', 'Suporte especializado')}</span>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Capas dos Livros para TELAS DESKTOP */}
            <div className="be-hero-visual-desktop">
              <div className="be-covers-stage">
                {/* Capa 3: SUDOKU (Discreta, secundária, acima ao fundo) */}
                <div className="be-book-cover-card sudoku" title="Sudoku Desafio • Treino Cerebral">
                  <img
                    src="/covers/sudoku-desafio.jpg"
                    alt="Capa de Sudoku Desafio"
                    className="be-book-cover-img"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/covers/bg-sudoku-clean.jpg';
                    }}
                  />
                </div>

                {/* Capa 1: O Último Segredo (Thriller/Ficção) */}
                <div className="be-book-cover-card thriller" title="O Último Segredo • Suspense KDP">
                  <img
                    src="/covers/o-ultimo-segredo.jpg"
                    alt="Capa do livro O Último Segredo"
                    className="be-book-cover-img"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/covers/bg-thriller-clean.jpg';
                    }}
                  />
                </div>

                {/* Capa 2: Dinossauros para Colorir (Infantil/Ilustrado) */}
                <div className="be-book-cover-card dino" title="Dinossauros para Colorir • Edição Ilustrada">
                  <img
                    src="/covers/dinossauros-para-colorir.jpg"
                    alt="Capa do livro Dinossauros para Colorir"
                    className="be-book-cover-img"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/covers/bg-dino-clean.jpg';
                    }}
                  />
                </div>

                {/* Card Lateral Flutuante */}
                <div className="be-floating-check-card">
                  <div className="be-floating-check-title">{t('landing.cardTitle', 'Seu livro completo, gerado por IA')}</div>
                  <div className="be-floating-check-list">
                    <div className="be-floating-check-item">
                      <CheckCircle2 size={13} color="#16a34a" />
                      <span>{t('landing.cardProCover', 'Capa profissional')}</span>
                    </div>
                    <div className="be-floating-check-item">
                      <CheckCircle2 size={13} color="#16a34a" />
                      <span>{t('landing.cardChapters', 'Prefácio e capítulos')}</span>
                    </div>
                    <div className="be-floating-check-item">
                      <CheckCircle2 size={13} color="#16a34a" />
                      <span>{t('landing.cardFormatting', 'Formatação para publicação')}</span>
                    </div>
                    <div className="be-floating-check-item">
                      <CheckCircle2 size={13} color="#16a34a" />
                      <span>{t('landing.cardPlatforms', 'Pronto para Amazon KDP, Google Play e Apple Books')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* 3. SEÇÃO DE CARDS DE FUNCIONALIDADES                               */}
      {/* ================================================================== */}
      <section className="be-features-section">
        <div className="be-container">
          <div className="be-section-header">
            <h2 className="be-section-title">{t('landing.featuresSectionTitle', 'Tudo o que você precisa para criar seu livro')}</h2>
            <p className="be-section-subtitle">{t('landing.featuresSectionSubtitle', 'Uma plataforma completa, do planejamento à publicação.')}</p>
          </div>

          <div className="be-features-grid">
            {/* Card 1 — Pesquisa inteligente */}
            <div className="be-feature-card">
              <div className="be-feature-icon-wrapper">
                <Search size={22} />
              </div>
              <h3 className="be-feature-card-title">{t('landing.featResearchTitle', 'Pesquisa inteligente')}</h3>
              <p className="be-feature-card-desc">
                {t('landing.featResearchDesc', 'Descubra nichos, tendências e oportunidades para seu próximo livro.')}
              </p>
            </div>

            {/* Card 2 — Escrita com IA */}
            <div className="be-feature-card">
              <div className="be-feature-icon-wrapper">
                <Cpu size={22} />
              </div>
              <h3 className="be-feature-card-title">{t('landing.featWritingTitle', 'Escrita com IA')}</h3>
              <p className="be-feature-card-desc">
                {t('landing.featWritingDesc', 'Desenvolva ideias, capítulos e conteúdos organizados com assistência de inteligência artificial.')}
              </p>
            </div>

            {/* Card 3 — Criação de capas */}
            <div className="be-feature-card">
              <div className="be-feature-icon-wrapper">
                <ImageIcon size={22} />
              </div>
              <h3 className="be-feature-card-title">{t('landing.featCoverTitle', 'Criação de capas')}</h3>
              <p className="be-feature-card-desc">
                {t('landing.featCoverDesc', 'Crie capas profissionais alinhadas ao tema e ao posicionamento do seu livro.')}
              </p>
            </div>

            {/* Card 4 — Livros ilustrados */}
            <div className="be-feature-card">
              <div className="be-feature-icon-wrapper">
                <Palette size={22} />
              </div>
              <h3 className="be-feature-card-title">{t('landing.featIllustratedTitle', 'Livros ilustrados')}</h3>
              <p className="be-feature-card-desc">
                {t('landing.featIllustratedDesc', 'Organize textos e ilustrações para projetos editoriais visuais.')}
              </p>
            </div>

            {/* Card 5 — Formatação para publicação */}
            <div className="be-feature-card">
              <div className="be-feature-icon-wrapper">
                <FileCheck size={22} />
              </div>
              <h3 className="be-feature-card-title">{t('landing.featPdfTitle', 'Formatação para publicação')}</h3>
              <p className="be-feature-card-desc">
                {t('landing.featPdfDesc', 'Prepare seu manuscrito para os formatos de publicação compatíveis com a plataforma.')}
              </p>
            </div>

            {/* Card 6 — Organização do projeto */}
            <div className="be-feature-card">
              <div className="be-feature-icon-wrapper">
                <FolderKanban size={22} />
              </div>
              <h3 className="be-feature-card-title">{t('landing.featProjectTitle', 'Organização do projeto')}</h3>
              <p className="be-feature-card-desc">
                {t('landing.featProjectDesc', 'Acompanhe as etapas da criação do livro em um fluxo organizado.')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* 4. BANNER INTERMEDIÁRIO: "SEU LIVRO PRONTO PARA O MUNDO"           */}
      {/* ================================================================== */}
      <section className="be-showcase-section">
        <div className="be-container">
          <div className="be-showcase-card">
            <div className="be-showcase-mockup-wrapper">
              <img
                src="/covers/laptop_phone_mockup.jpg"
                alt="Plataforma BookEngin em laptop e celular"
                className="be-showcase-mockup-img"
              />
            </div>

            <div className="be-showcase-content">
              <h3>{t('landing.showcaseTitle', 'Seu livro pronto para o mundo')}</h3>
              <p>
                {t('landing.showcaseDesc', 'Após a geração, você pode revisar, personalizar e publicar seu livro diretamente nas principais plataformas.')}
              </p>

              <button
                type="button"
                className="be-btn-primary-hero"
                onClick={() => openAuth('register')}
                style={{ marginBottom: 16 }}
              >
                <span>{t('landing.ctaStart', 'Comece agora')} — {subscriptionPrice}/mês</span>
                <ArrowRight size={16} />
              </button>

              <div className="be-showcase-platforms">
                <div className="be-showcase-platform-item">
                  <CheckCircle2 size={16} color="#38bdf8" />
                  <span>Amazon KDP, Google Play Books, Apple Books</span>
                </div>
                <div className="be-showcase-platform-item">
                  <TrendingUp size={16} color="#34d399" />
                  <span>{t('landing.showcasePassive', 'E ainda pode gerar renda passiva com suas publicações.')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* 5. SEÇÃO: "COMO FUNCIONA?"                                         */}
      {/* ================================================================== */}
      <section className="be-how-it-works-section">
        <div className="be-container">
          <div className="be-section-header">
            <h2 className="be-section-title">{t('landing.howItWorksTitle', 'Como funciona?')}</h2>
            <p className="be-section-subtitle">
              {t('landing.howItWorksSubtitle', 'Em apenas alguns passos, seu livro é gerado, formatado e pronto para publicar.')}
            </p>
          </div>

          <div className="be-steps-grid">
            {/* Passo 1 */}
            <div className="be-step-card">
              <div className="be-step-top">
                <div className="be-step-icon step-1">
                  <Search size={18} />
                </div>
                <div className="be-step-num">1</div>
              </div>
              <h3 className="be-step-title">{t('landing.step1Title', 'Escolha um tema ou nicho')}</h3>
              <p className="be-step-desc">
                {t('landing.step1Desc', 'Informe o assunto que deseja explorar. Nossa IA pesquisa, estrutura e desenvolve o conteúdo.')}
              </p>
            </div>

            {/* Passo 2 */}
            <div className="be-step-card">
              <div className="be-step-top">
                <div className="be-step-icon step-2">
                  <Cpu size={18} />
                </div>
                <div className="be-step-num">2</div>
              </div>
              <h3 className="be-step-title">{t('landing.step2Title', 'Gere seu livro completo')}</h3>
              <p className="be-step-desc">
                {t('landing.step2Desc', 'Com capítulos, prefácio, capa profissional e formatação pronta para publicação.')}
              </p>
            </div>

            {/* Passo 3 */}
            <div className="be-step-card">
              <div className="be-step-top">
                <div className="be-step-icon step-3">
                  <FileCheck size={18} />
                </div>
                <div className="be-step-num">3</div>
              </div>
              <h3 className="be-step-title">{t('landing.step3Title', 'Revise e personalize')}</h3>
              <p className="be-step-desc">
                {t('landing.step3Desc', 'Faça ajustes, adicione sua identidade e deixe do seu jeito.')}
              </p>
            </div>

            {/* Passo 4 */}
            <div className="be-step-card">
              <div className="be-step-top">
                <div className="be-step-icon step-4">
                  <TrendingUp size={18} />
                </div>
                <div className="be-step-num">4</div>
              </div>
              <h3 className="be-step-title">{t('landing.step4Title', 'Publique e ganhe')}</h3>
              <p className="be-step-desc">
                {t('landing.step4Desc', 'Envie para Amazon KDP, Google Play Books e Apple Books e comece a gerar renda passiva.')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* 6. SEÇÃO: "ALGUNS TEMAS QUE VOCÊ PODE EXPLORAR"                    */}
      {/* ================================================================== */}
      <section className="be-topics-section">
        <div className="be-container">
          <div className="be-section-header" style={{ marginBottom: 24 }}>
            <h2 className="be-section-title">{t('landing.topicsTitle', 'Alguns temas que você pode explorar')}</h2>
            <p className="be-section-subtitle">{t('landing.topicsSubtitle', 'Diversos nichos, infinitas possibilidades.')}</p>
          </div>

          <div className="be-topics-flex">
            <div className="be-topic-pill" onClick={() => openAuth('register')}>
              <span>🧘</span> Autoajuda
            </div>
            <div className="be-topic-pill" onClick={() => openAuth('register')}>
              <span>💼</span> Negócios
            </div>
            <div className="be-topic-pill" onClick={() => openAuth('register')}>
              <span>💚</span> Saúde & Bem-estar
            </div>
            <div className="be-topic-pill" onClick={() => openAuth('register')}>
              <span>🧸</span> Infantil & Juvenil
            </div>
            <div className="be-topic-pill" onClick={() => openAuth('register')}>
              <span>🍳</span> Receitas
            </div>
            <div className="be-topic-pill" onClick={() => openAuth('register')}>
              <span>💻</span> Tecnologia
            </div>
            <div className="be-topic-pill" onClick={() => openAuth('register')}>
              <span>🎓</span> Educação
            </div>
            <div className="be-topic-pill" onClick={() => openAuth('register')}>
              <span>🐾</span> Animais
            </div>
            <div className="be-topic-pill" onClick={() => openAuth('register')}>
              <span>⚽</span> Esportes
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* 7. SEÇÃO CTA FINAL COM DEPOIMENTO (BANNER DO AUTOR NA MONTANHA)    */}
      {/* ================================================================== */}
      <section className="be-final-cta-section">
        <div className="be-container">
          <div className="be-final-cta-banner">
            <img
              src="/covers/author_mountains_banner.jpg"
              alt="Autor contemplando horizonte nas montanhas"
              className="be-final-cta-bg"
            />
            <div className="be-final-cta-overlay" />

            <div className="be-final-cta-content">
              <div className="be-final-cta-text">
                <h3>{t('landing.finalCtaTitle', 'Transforme suas ideias em uma fonte de renda real. Comece hoje!')}</h3>
                <p>
                  {t('landing.finalCtaDesc', 'Milhares de pessoas já estão publicando seus livros e gerando renda com o BookEngin. Agora é a sua vez.')}
                </p>

                <button
                  type="button"
                  className="be-btn-primary-hero"
                  onClick={() => openAuth('register')}
                >
                  <span>{t('landing.ctaStart', 'Comece agora')} — {subscriptionPrice}/mês</span>
                  <ArrowRight size={18} />
                </button>
              </div>

              <div className="be-testimonial-box">
                <p className="be-testimonial-quote">
                  {t('landing.testimonialQuote', '“O BookEngin me deu a oportunidade de publicar meu primeiro livro e hoje já é minha principal fonte de renda.”')}
                </p>
                <div className="be-testimonial-author">
                  {t('landing.testimonialAuthor', '— Mariana S., autora parceira')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* 8. RODAPÉ COMPACTO EM AZUL-MARINHO PROFUNDO                        */}
      {/* ================================================================== */}
      <footer className="be-footer">
        <div className="be-container">
          <div className="be-footer-inner">
            <div className="be-footer-brand">
              <div className="be-brand-logo" style={{ width: 28, height: 28 }}>
                <BookOpen size={16} />
              </div>
              <div>
                <div className="be-footer-brand-name">BookEngin</div>
                <div className="be-footer-slogan">{t('landing.sloganHeader', 'Your Ideas. Complete Books. One Platform.')}</div>
              </div>
            </div>

            <div className="be-footer-links">
              <button type="button" onClick={() => openAuth('login')}>{t('landing.footerTerms', 'Termos de Uso')}</button>
              <button type="button" onClick={() => openAuth('login')}>{t('landing.footerPrivacy', 'Política de Privacidade')}</button>
              <button type="button" onClick={() => openAuth('login')}>{t('landing.footerSupport', 'Ajuda e Suporte')}</button>
            </div>

            <div className="be-footer-copy">
              {t('landing.footerCopyright', '© 2026 BookEngin. Todos os direitos reservados.')}
            </div>
          </div>
        </div>
      </footer>

      {/* ================================================================== */}
      {/* 9. MODAL DE AUTENTICAÇÃO LIMPO (FUNDO BRANCO, SAAS PROFISSIONAL)   */}
      {/* ================================================================== */}
      {authModalOpen && (
        <div className="be-auth-modal-backdrop" onClick={() => setAuthModalOpen(false)}>
          <div className="be-auth-panel" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="be-auth-close-btn"
              onClick={() => setAuthModalOpen(false)}
              aria-label="Fechar"
            >
              <X size={16} />
            </button>

            {/* Cabeçalho do Card */}
            <div className="be-auth-header">
              <div className="be-auth-brand-icon">
                <BookOpen size={22} />
              </div>
              <h2 className="be-auth-title">Bem-vindo ao BookEngin</h2>
              <p className="be-auth-subtitle">
                {t('landing.authSubtitle', 'Acesse sua conta para continuar criando seus livros.')}
              </p>
            </div>

            {/* Abas Entrar e Cadastrar-se */}
            <div className="be-auth-tabs">
              <button
                type="button"
                className={`be-auth-tab-btn ${authTab === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setAuthTab('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
              >
                {t('landing.tabLogin', 'Entrar')}
              </button>
              <button
                type="button"
                className={`be-auth-tab-btn ${authTab === 'register' ? 'active' : ''}`}
                onClick={() => {
                  setAuthTab('register');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
              >
                {t('landing.tabRegister', 'Cadastrar-se')}
              </button>
            </div>

            {/* Mensagem de Erro */}
            {errorMessage && (
              <div className="be-auth-alert" role="alert">
                {errorMessage}
              </div>
            )}

            {/* Mensagem de Sucesso */}
            {successMessage && (
              <div className="be-auth-success" role="status">
                {successMessage}
              </div>
            )}

            {/* Formulário: ENTRAR */}
            {authTab === 'login' && (
              <form onSubmit={handleLoginSubmit}>
                <div className="be-form-group">
                  <label className="be-form-label" htmlFor="be-login-email">
                    {t('landing.labelEmail', 'E-mail')}
                  </label>
                  <div className="be-input-wrapper">
                    <span className="be-input-icon">
                      <Mail size={16} />
                    </span>
                    <input
                      id="be-login-email"
                      type="email"
                      className="be-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('landing.placeholderEmail', 'seu.email@exemplo.com')}
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>

                <div className="be-form-group">
                  <label className="be-form-label" htmlFor="be-login-password">
                    {t('landing.labelPassword', 'Senha')}
                  </label>
                  <div className="be-input-wrapper">
                    <span className="be-input-icon">
                      <Lock size={16} />
                    </span>
                    <input
                      id="be-login-password"
                      type={showPassword ? 'text' : 'password'}
                      className="be-input has-toggle"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('landing.placeholderPassword', 'Sua senha')}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      className="be-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="be-form-row">
                  <label className="be-checkbox-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{ accentColor: '#0284c7' }}
                    />
                    <span>{t('landing.rememberMe', 'Lembrar de mim')}</span>
                  </label>

                  <button
                    type="button"
                    className="be-link-forgot"
                    onClick={() => {
                      setAuthTab('forgot');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                  >
                    {t('landing.forgotPassword', 'Esqueci minha senha')}
                  </button>
                </div>

                <button
                  type="submit"
                  className="be-btn-auth-submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span>{t('landing.btnLoading', 'Carregando...')}</span>
                  ) : (
                    <>
                      <span>{t('landing.tabLogin', 'Entrar')}</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Formulário: CADASTRAR-SE */}
            {authTab === 'register' && (
              <form onSubmit={handleRegisterSubmit}>
                <div className="be-form-group">
                  <label className="be-form-label" htmlFor="be-reg-name">
                    {t('landing.labelName', 'Nome do Autor')}
                  </label>
                  <div className="be-input-wrapper">
                    <span className="be-input-icon">
                      <User size={16} />
                    </span>
                    <input
                      id="be-reg-name"
                      type="text"
                      className="be-input"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder={t('landing.placeholderName', 'Ex: Leandro Palmeira')}
                      autoComplete="name"
                      required
                    />
                  </div>
                </div>

                <div className="be-form-group">
                  <label className="be-form-label" htmlFor="be-reg-email">
                    {t('landing.labelEmail', 'E-mail')}
                  </label>
                  <div className="be-input-wrapper">
                    <span className="be-input-icon">
                      <Mail size={16} />
                    </span>
                    <input
                      id="be-reg-email"
                      type="email"
                      className="be-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('landing.placeholderEmail', 'seu.email@exemplo.com')}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="be-form-group">
                  <label className="be-form-label" htmlFor="be-reg-password">
                    {t('landing.labelPassword', 'Senha (mínimo 6 caracteres)')}
                  </label>
                  <div className="be-input-wrapper">
                    <span className="be-input-icon">
                      <Lock size={16} />
                    </span>
                    <input
                      id="be-reg-password"
                      type={showPassword ? 'text' : 'password'}
                      className="be-input has-toggle"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('landing.placeholderPasswordCreate', 'Crie sua senha segura')}
                      autoComplete="new-password"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      className="be-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="be-auth-notice">
                  ✓ Assinatura por apenas {subscriptionPrice}/mês. Cancele quando quiser.
                  {chargeDiffersFromDisplay && (
                    <div style={{ marginTop: 4, fontSize: 11, color: '#64748b' }}>
                      Cobrança processada em {chargeCurrency}.
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="be-btn-auth-submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span>{t('landing.btnLoading', 'Cadastrando...')}</span>
                  ) : (
                    <>
                      <span>{t('landing.btnSubmitRegister', 'Criar Conta e Começar')}</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Formulário: ESQUECI MINHA SENHA */}
            {authTab === 'forgot' && (
              <form onSubmit={handleForgotSubmit}>
                <div className="be-form-group">
                  <label className="be-form-label" htmlFor="be-forgot-email">
                    {t('landing.labelEmail', 'E-mail cadastrado')}
                  </label>
                  <div className="be-input-wrapper">
                    <span className="be-input-icon">
                      <Mail size={16} />
                    </span>
                    <input
                      id="be-forgot-email"
                      type="email"
                      className="be-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('landing.placeholderEmail', 'seu.email@exemplo.com')}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="be-btn-auth-submit"
                  disabled={isLoading}
                  style={{ marginBottom: 12 }}
                >
                  {isLoading ? <span>Enviando...</span> : <span>Enviar instruções de redefinição</span>}
                </button>

                <div style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    className="be-link-forgot"
                    onClick={() => {
                      setAuthTab('login');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                  >
                    ← Voltar ao login
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
