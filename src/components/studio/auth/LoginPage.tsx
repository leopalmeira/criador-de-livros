// ============================================================================
// BOOKENGIN — LANDING PAGE OFICIAL & PAINEL DE ACESSO SAAS
// Transformação completa da página inicial em um SaaS comercial premium:
// - Cabeçalho compacto azul-marinho com seletor de idioma funcional
// - Hero equilibrado com capas realistas de livros (Sudoku discreto/secundário)
// - Painel de autenticação limpo (fundo branco, sem dados pré-preenchidos)
// - Cards uniformes de funcionalidades
// - Seções "Seu livro pronto para o mundo", "Como funciona?" e temas
// - Banner cinematográfico com depoimento de autor
// - Rodapé profissional
// - Localização monetária (BRL no Brasil via Intl, USD internacional)
// ============================================================================

import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Cpu,
  Image as ImageIcon,
  BookMarked,
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
  Clock,
  Headphones,
  Globe,
  ChevronDown,
  X,
  Sparkles,
  Layers,
  Palette,
  TrendingUp,
  Award
} from 'lucide-react';
import { useTranslation, SupportedLanguage } from '../../../services/i18n-service';
import { AuthApiError, authClient } from '../../../services/auth-client';
import { usePlatformCurrency } from '../../../services/use-platform-currency';
import './login-page.css';

interface Props {
  onLoginSuccess: (user: { id: string; name: string; email: string }) => void;
}

export const LoginPage: React.FC<Props> = ({ onLoginSuccess }) => {
  const { t, currentLang, setLanguage, isBrazil } = useTranslation();
  const { formatProduct, currency, chargeCurrency, chargeDiffersFromDisplay } = usePlatformCurrency();
  const subscriptionPrice = formatProduct('subscription_monthly');

  // Estados de navegação e modal de autenticação
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  // Estados do formulário de autenticação
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    setAuthModalOpen(true);
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

  // Manipulador de Esqueci minha senha
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
  const currentLangFlag = currentLang === 'pt-BR' ? '🇧🇷' : currentLang === 'es-ES' ? '🇪🇸' : '🇺🇸';

  return (
    <div className="be-landing">
      {/* ================================================================== */}
      {/* 1. CABEÇALHO HORIZONTAL SAAS                                       */}
      {/* ================================================================== */}
      <header className="be-header">
        <div className="be-container">
          <div className="be-header-inner">
            {/* Logotipo e Slogan à Esquerda */}
            <div className="be-brand">
              <div className="be-brand-logo">
                <BookOpen size={20} />
              </div>
              <div>
                <div className="be-brand-name">BookEngin</div>
                <div className="be-brand-slogan">Your Ideas. Complete Books. One Platform.</div>
              </div>
            </div>

            {/* Ações à Direita */}
            <div className="be-header-actions">
              {/* Seletor de Idioma */}
              <div className="be-lang-dropdown">
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
                    {isBrazil && (
                      <button
                        type="button"
                        className={`be-lang-item ${currentLang === 'pt-BR' ? 'active' : ''}`}
                        onClick={() => {
                          setLanguage('pt-BR');
                          setLangMenuOpen(false);
                        }}
                      >
                        <span>🇧🇷</span> Português
                      </button>
                    )}
                    <button
                      type="button"
                      className={`be-lang-item ${currentLang === 'en-US' ? 'active' : ''}`}
                      onClick={() => {
                        setLanguage('en-US');
                        setLangMenuOpen(false);
                      }}
                    >
                      <span>🇺🇸</span> English
                    </button>
                    {isBrazil && (
                      <button
                        type="button"
                        className={`be-lang-item ${currentLang === 'es-ES' ? 'active' : ''}`}
                        onClick={() => {
                          setLanguage('es-ES');
                          setLangMenuOpen(false);
                        }}
                      >
                        <span>🇪🇸</span> Español
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Botão Entrar */}
              <button
                type="button"
                className="be-btn-link"
                onClick={() => openAuth('login')}
              >
                {t('landing.tabLogin', 'Entrar')}
              </button>

              {/* Botão Primário Cadastrar-se */}
              <button
                type="button"
                className="be-btn-header-cta"
                onClick={() => openAuth('register')}
              >
                {t('landing.tabRegister', 'Cadastrar-se')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ================================================================== */}
      {/* 2. HERO SECTION                                                    */}
      {/* ================================================================== */}
      <section className="be-hero">
        <div className="be-container">
          <div className="be-hero-grid">
            {/* Coluna Esquerda: Apresentação do Produto */}
            <div className="be-hero-content">
              <div className="be-badge-pill">
                <Sparkles size={13} />
                <span>Do tema ao livro publicado</span>
              </div>

              <h1 className="be-hero-title">
                Transforme suas ideias em{' '}
                <span className="be-hero-title-highlight">livros profissionais</span>
              </h1>

              <p className="be-hero-desc">
                Planeje, pesquise, escreva capítulos, crie capas e prepare seus livros para publicação em uma única plataforma.
              </p>

              {/* Plataformas Atendidas Discretas */}
              <div className="be-platforms-bar">
                <div className="be-platform-pill">
                  <div className="be-platform-icon amazon">A</div>
                  <div>
                    <div className="be-platform-text-name">Amazon KDP</div>
                    <div className="be-platform-text-desc">Publique e venda globalmente</div>
                  </div>
                </div>

                <div className="be-platform-pill">
                  <div className="be-platform-icon google">G</div>
                  <div>
                    <div className="be-platform-text-name">Google Play Books</div>
                    <div className="be-platform-text-desc">Alcance milhões de leitores</div>
                  </div>
                </div>

                <div className="be-platform-pill">
                  <div className="be-platform-icon apple"></div>
                  <div>
                    <div className="be-platform-text-name">Apple Books</div>
                    <div className="be-platform-text-desc">Mais uma forma de publicar</div>
                  </div>
                </div>
              </div>

              {/* Botão Primário Hero com Moeda Localizada */}
              <div>
                <button
                  type="button"
                  className="be-btn-primary-hero"
                  onClick={() => openAuth('register')}
                >
                  <span>Comece agora — {subscriptionPrice}/mês</span>
                  <ArrowRight size={18} />
                </button>
              </div>

              {/* Micro-benefícios */}
              <div className="be-hero-guarantees">
                <div className="be-hero-guarantee-item">
                  <BookOpen size={15} color="#0284c7" />
                  <span>Até 15 livros por mês</span>
                </div>
                <div className="be-hero-guarantee-item">
                  <ShieldCheck size={15} color="#16a34a" />
                  <span>Sem cartão de crédito (ou cancele quando quiser)</span>
                </div>
                <div className="be-hero-guarantee-item">
                  <Headphones size={15} color="#0284c7" />
                  <span>Suporte especializado</span>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Capas dos Livros com Perspectiva 3D Realista */}
            <div className="be-hero-visual">
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
                  <div className="be-floating-check-title">Seu livro completo, gerado por IA</div>
                  <div className="be-floating-check-list">
                    <div className="be-floating-check-item">
                      <CheckCircle2 size={13} color="#16a34a" />
                      <span>Capa profissional</span>
                    </div>
                    <div className="be-floating-check-item">
                      <CheckCircle2 size={13} color="#16a34a" />
                      <span>Prefácio e capítulos</span>
                    </div>
                    <div className="be-floating-check-item">
                      <CheckCircle2 size={13} color="#16a34a" />
                      <span>Formatação para publicação</span>
                    </div>
                    <div className="be-floating-check-item">
                      <CheckCircle2 size={13} color="#16a34a" />
                      <span>Pronto para Amazon KDP, Google Play e Apple Books</span>
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
            <h2 className="be-section-title">Tudo o que você precisa para criar seu livro</h2>
            <p className="be-section-subtitle">Uma plataforma completa, do planejamento à publicação.</p>
          </div>

          <div className="be-features-grid">
            {/* Card 1 — Pesquisa inteligente */}
            <div className="be-feature-card">
              <div className="be-feature-icon-wrapper">
                <Search size={22} />
              </div>
              <h3 className="be-feature-card-title">Pesquisa inteligente</h3>
              <p className="be-feature-card-desc">
                Descubra nichos, tendências e oportunidades para seu próximo livro.
              </p>
            </div>

            {/* Card 2 — Escrita com IA */}
            <div className="be-feature-card">
              <div className="be-feature-icon-wrapper">
                <Cpu size={22} />
              </div>
              <h3 className="be-feature-card-title">Escrita com IA</h3>
              <p className="be-feature-card-desc">
                Desenvolva ideias, capítulos e conteúdos organizados com assistência de inteligência artificial.
              </p>
            </div>

            {/* Card 3 — Criação de capas */}
            <div className="be-feature-card">
              <div className="be-feature-icon-wrapper">
                <ImageIcon size={22} />
              </div>
              <h3 className="be-feature-card-title">Criação de capas</h3>
              <p className="be-feature-card-desc">
                Crie capas profissionais alinhadas ao tema e ao posicionamento do seu livro.
              </p>
            </div>

            {/* Card 4 — Livros ilustrados */}
            <div className="be-feature-card">
              <div className="be-feature-icon-wrapper">
                <Palette size={22} />
              </div>
              <h3 className="be-feature-card-title">Livros ilustrados</h3>
              <p className="be-feature-card-desc">
                Organize textos e ilustrações para projetos editoriais visuais.
              </p>
            </div>

            {/* Card 5 — Formatação para publicação */}
            <div className="be-feature-card">
              <div className="be-feature-icon-wrapper">
                <FileCheck size={22} />
              </div>
              <h3 className="be-feature-card-title">Formatação para publicação</h3>
              <p className="be-feature-card-desc">
                Prepare seu manuscrito para os formatos de publicação compatíveis com a plataforma.
              </p>
            </div>

            {/* Card 6 — Organização do projeto */}
            <div className="be-feature-card">
              <div className="be-feature-icon-wrapper">
                <FolderKanban size={22} />
              </div>
              <h3 className="be-feature-card-title">Organização do projeto</h3>
              <p className="be-feature-card-desc">
                Acompanhe as etapas da criação do livro em um fluxo organizado.
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
              <h3>Seu livro pronto para o mundo</h3>
              <p>
                Após a geração, você pode revisar, personalizar e publicar seu livro diretamente nas principais plataformas.
              </p>

              <button
                type="button"
                className="be-btn-primary-hero"
                onClick={() => openAuth('register')}
                style={{ marginBottom: 12 }}
              >
                <span>Comece agora — {subscriptionPrice}/mês</span>
                <ArrowRight size={16} />
              </button>

              <div className="be-showcase-platforms">
                <div className="be-showcase-platform-item">
                  <CheckCircle2 size={16} color="#38bdf8" />
                  <span>Amazon KDP, Google Play Books e Apple Books</span>
                </div>
                <div className="be-showcase-platform-item">
                  <TrendingUp size={16} color="#34d399" />
                  <span>E ainda pode gerar renda passiva com suas publicações.</span>
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
            <h2 className="be-section-title">Como funciona?</h2>
            <p className="be-section-subtitle">
              Em apenas alguns passos, seu livro é gerado, formatado e pronto para publicar.
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
              <h3 className="be-step-title">Escolha um tema ou nicho</h3>
              <p className="be-step-desc">
                Informe o assunto que deseja explorar. Nossa IA pesquisa, estrutura e desenvolve o conteúdo.
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
              <h3 className="be-step-title">Gere seu livro completo</h3>
              <p className="be-step-desc">
                Com capítulos, prefácio, capa profissional e formatação pronta para publicação.
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
              <h3 className="be-step-title">Revise e personalize</h3>
              <p className="be-step-desc">
                Faça ajustes, adicione sua identidade e deixe do seu jeito.
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
              <h3 className="be-step-title">Publique e ganhe</h3>
              <p className="be-step-desc">
                Envie para Amazon KDP, Google Play Books e Apple Books e comece a gerar renda passiva.
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
          <div className="be-section-header" style={{ marginBottom: 28 }}>
            <h2 className="be-section-title">Alguns temas que você pode explorar</h2>
            <p className="be-section-subtitle">Diversos nichos, infinitas possibilidades.</p>
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
      {/* 7. SEÇÃO CTA FINAL COM DEPOIMENTO (AUTOR NA MONTANHA)              */}
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
                <h3>Transforme suas ideias em uma fonte de renda real. Comece hoje!</h3>
                <p>
                  Milhares de pessoas já estão publicando seus livros e gerando renda com o BookEngin. Agora é a sua vez.
                </p>

                <button
                  type="button"
                  className="be-btn-primary-hero"
                  onClick={() => openAuth('register')}
                >
                  <span>Comece agora — {subscriptionPrice}/mês</span>
                  <ArrowRight size={18} />
                </button>
              </div>

              <div className="be-testimonial-box">
                <p className="be-testimonial-quote">
                  “O BookEngin me deu a oportunidade de publicar meu primeiro livro e hoje já é minha principal fonte de renda.”
                </p>
                <div className="be-testimonial-author">
                  — Mariana S., autora parceira
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
                <div className="be-footer-slogan">Your Ideas. Complete Books. One Platform.</div>
              </div>
            </div>

            <div className="be-footer-links">
              <button type="button" onClick={() => openAuth('login')}>Termos de Uso</button>
              <button type="button" onClick={() => openAuth('login')}>Política de Privacidade</button>
              <button type="button" onClick={() => openAuth('login')}>Ajuda e Suporte</button>
            </div>

            <div className="be-footer-copy">
              © 2026 BookEngin. Todos os direitos reservados.
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
                Acesse sua conta para continuar criando seus livros.
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
                Entrar
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
                Cadastrar-se
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
                    E-mail
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
                      placeholder="seu.email@exemplo.com"
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>

                <div className="be-form-group">
                  <label className="be-form-label" htmlFor="be-login-password">
                    Senha
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
                      placeholder="Sua senha"
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
                    <span>Lembrar de mim</span>
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
                    Esqueci minha senha
                  </button>
                </div>

                <button
                  type="submit"
                  className="be-btn-auth-submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span>Carregando...</span>
                  ) : (
                    <>
                      <span>Entrar</span>
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
                    Nome do Autor
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
                      placeholder="Ex: Leandro Palmeira"
                      autoComplete="name"
                      required
                    />
                  </div>
                </div>

                <div className="be-form-group">
                  <label className="be-form-label" htmlFor="be-reg-email">
                    E-mail
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
                      placeholder="seu.email@exemplo.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="be-form-group">
                  <label className="be-form-label" htmlFor="be-reg-password">
                    Senha (mínimo 6 caracteres)
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
                      placeholder="Crie sua senha segura"
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
                    <span>Cadastrando...</span>
                  ) : (
                    <>
                      <span>Criar Conta e Começar</span>
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
                    E-mail cadastrado
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
                      placeholder="seu.email@exemplo.com"
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
