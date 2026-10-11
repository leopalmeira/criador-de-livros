// ============================================================================
// SERVIÇO DE INTERNACIONALIZAÇÃO (i18n) COM TRADUÇÕES NATIVAS
// Suporte a 6 idiomas com terminologia editorial oficial de cada país:
// 1. pt-BR: Português (Brasil) [Padrão]
// 2. en-US: English (US)
// 3. es-ES: Español
// 4. fr-FR: Français
// 5. de-DE: Deutsch
// 6. ru-RU: Русский
// ============================================================================

import { useState, useEffect } from 'react';
import { detectVisitorCountry, isBrazilianCountry, isBrowserInBrazil } from './market-region';

export type SupportedLanguage = 'pt-BR' | 'en-US' | 'es-ES' | 'fr-FR' | 'de-DE' | 'ru-RU';

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  flag: string;
  nativeName: string;
  country: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'pt-BR', label: 'Português (Brasil)', flag: '🇧🇷', nativeName: 'Português (BR)', country: 'Brasil' },
  { code: 'en-US', label: 'English (US)', flag: '🇺🇸', nativeName: 'English (US)', country: 'United States' },
  { code: 'es-ES', label: 'Español', flag: '🇪🇸', nativeName: 'Español', country: 'España' },
  { code: 'fr-FR', label: 'Français', flag: '🇫🇷', nativeName: 'Français', country: 'France' },
  { code: 'de-DE', label: 'Deutsch', flag: '🇩🇪', nativeName: 'Deutsch', country: 'Deutschland' },
  { code: 'ru-RU', label: 'Русский', flag: '🇷🇺', nativeName: 'Русский', country: 'Россия' },
];

const EVENT_NAME = 'kdp-language-changed';
let activeLanguage: SupportedLanguage = (typeof window !== 'undefined' && isBrowserInBrazil()) ? 'pt-BR' : 'en-US';
let languageManuallySelected = false;
let detectedCountryCode: string | null = (typeof window !== 'undefined' && isBrowserInBrazil()) ? 'BR' : null;

function applyLanguage(lang: SupportedLanguage): void {
  activeLanguage = lang;
  if (typeof window !== 'undefined') {
    document.documentElement.lang = lang;
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { lang } }));
  }
}

export const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  'pt-BR': {
    // Header & Navbar
    'nav.slogan': 'Your Ideas. Complete Books. One Platform.',
    'nav.aiGuide': 'IA Guia do Autor',
    'nav.help': 'Configurações e Ajuda',
    'nav.proPlan': 'Plano Pro',
    'nav.logout': 'Sair',
    'nav.language': 'Idioma',

    // Hero Banner
    'hero.greeting': 'Olá, Leandro',
    'hero.welcome': 'Bem-vindo ao BookEngin',
    'hero.description': 'Encontre nichos lucrativos, crie livros profissionais e publique na Amazon KDP, Google Play Books e Apple Books diretamente da plataforma.',
    'hero.btnNewBook': 'Criar Novo Projeto',
    'hero.btnBatch': 'Gerador em Lote (1 a 20)',
    'hero.btnManuals': 'Manuais "Como Fazer"',
    'hero.btnCovers': '10 Estilos de Capas',
    'hero.btnKdpDirect': 'Publicar Direto no KDP',
    'hero.btnMultiplatform': 'Multiplataforma',

    // Books List
    'catalog.title': 'Livros Criados na Plataforma',
    'catalog.subtitle': 'Catálogo completo com capas diagramadas e arquivos de publicação',
    'catalog.btnNew': 'Novo Livro',
    'catalog.emptyTitle': 'Nenhum livro criado ainda',
    'catalog.emptyAction': 'Começar Meu Primeiro Livro',
    'catalog.statusDone': 'Finalizado & Pronto para Amazon KDP',
    'catalog.statusInProgress': 'Em Andamento',
    'catalog.chapter': 'capítulo',
    'catalog.chapters': 'capítulos',
    'catalog.words': 'palavras',
    'catalog.inCreation': 'Em criação',
    'catalog.actionQuickFinalize': 'Finalizar Obra e Disponibilizar para Download',
    'catalog.actionPublishKdp': 'Publicar Direto no Amazon KDP In-App',
    'catalog.actionMultiplatform': 'Publicação Multiplataforma',
    'catalog.actionDuplicate': 'Duplicar Obra',
    'catalog.actionDelete': 'Excluir',
    'catalog.btnEdit': 'Editar',
    'catalog.btnContinue': 'Continuar',

    // Shelf & Downloads (FinalBooksShelf)
    'shelf.title': 'Estante de Livros Finalizados & Aprovados',
    'shelf.subtitle': 'Obras completas com diagramação oficial, capas em alta definição e arquivos de publicação',
    'shelf.trim': 'Corte',
    'shelf.typesetPages': 'páginas diagramadas',
    'shelf.fullChapters': 'capítulos completos',
    'shelf.completedOn': 'Finalizado em',
    'shelf.noBlankPages': 'Sem páginas em branco',
    'shelf.btnManuscript': 'Baixar Manuscrito',
    'shelf.btnEpub': 'Baixar E-book (.EPUB)',
    'shelf.btnBookPdf': 'Baixar PDF do Livro',
    'shelf.btnCoverPdf': 'Baixar PDF da Capa',
    'shelf.btnSamplePagePdf': 'Baixar PDF da Página',
    'shelf.btnHtmlDesc': 'HTML da Página / Descrição',
    'shelf.btnEditBook': 'Editar / Refazer Livro',
    'shelf.btnGenerating': 'Gerando...',

    // Metrics Overview
    'overview.title': 'Visão Geral',
    'overview.today': 'Hoje',
    'metric.projectsCount': 'Livros no projeto',
    'metric.searchesCount': 'Pesquisas realizadas',
    'metric.nichesCount': 'Nichos analisados',
    'metric.reportsCount': 'Relatórios gerados',

    // Recent Activity
    'activity.title': 'Atividade recente',
    'activity.viewAll': 'Ver todas',
    'activity.emptyTitle': 'Nenhuma atividade recente',
    'activity.emptyDesc': 'Suas ações e relatórios aparecerão aqui assim que você começar a usar o sistema.',
    'activity.edited': 'Editou',
    'activity.started': 'Iniciou novo projeto',

    // Modals & Tools
    'batch.title': 'Gerador de Livros em Lote KDP',
    'batch.subtitle': 'Gere de 1 a 20 livros com cálculo de páginas e auto-auditoria',
    'manuals.title': 'Biblioteca de Manuais Técnicos "Como Fazer"',
    'manuals.subtitle': 'Projetos públicos com esquemas vetoriais e instruções passo a passo',
    'covers.title': '10 Estilos de Capas Bestseller Amazon',
    'covers.subtitle': 'Comparativo com títulos reais e Grau de Aceitação Comercial',
    'aiGuide.title': 'IA Guia do Autor — Mentor Editorial KDP',
    'aiGuide.subtitle': 'Orientação em tempo real para nichos, manuscritos e conformidade Amazon',

    // Footer
    'footer.brand': 'BookEngin v1.0',
    'footer.desc': 'Plataforma Profissional de Criação e Publicação Editorial com IA',

    // Landing Page & Divulgação
    'landing.sloganHeader': 'Your Ideas. Complete Books. One Platform.',
    'landing.subHeaderBrand': 'Your Ideas. Complete Books. One Platform.',
    'landing.heroBadge': 'Do tema ao livro publicado',
    'landing.heroTitlePrefix': 'Transforme suas ideias em',
    'landing.heroTitleHighlight': 'livros profissionais',
    'landing.heroDesc': 'Planeje, pesquise, escreva capítulos, crie capas e prepare seus livros para publicação em uma única plataforma.',
    'landing.platformAmazonDesc': 'Publique e venda globalmente',
    'landing.platformGoogleDesc': 'Alcance milhões de leitores',
    'landing.platformAppleDesc': 'Mais uma forma de publicar',
    'landing.ctaStart': 'Comece agora',
    'landing.guaranteeBooks': 'Até 15 livros por mês',
    'landing.guaranteeCard': 'Sem cartão de crédito (ou cancele quando quiser)',
    'landing.guaranteeSupport': 'Suporte especializado',
    'landing.cardTitle': 'Seu livro completo, gerado por IA',
    'landing.cardProCover': 'Capa profissional',
    'landing.cardChapters': 'Prefácio e capítulos',
    'landing.cardFormatting': 'Formatação para publicação',
    'landing.cardPlatforms': 'Pronto para Amazon KDP, Google Play e Apple Books',
    'landing.featuresSectionTitle': 'Tudo o que você precisa para criar seu livro',
    'landing.featuresSectionSubtitle': 'Uma plataforma completa, do planejamento à publicação.',
    'landing.featResearchTitle': 'Pesquisa inteligente',
    'landing.featResearchDesc': 'Descubra nichos, tendências e oportunidades para seu próximo livro.',
    'landing.featWritingTitle': 'Escrita com IA',
    'landing.featWritingDesc': 'Desenvolva ideias, capítulos e conteúdos organizados com assistência de inteligência artificial.',
    'landing.featCoverTitle': 'Criação de capas',
    'landing.featCoverDesc': 'Crie capas profissionais alinhadas ao tema e ao posicionamento do seu livro.',
    'landing.featIllustratedTitle': 'Livros ilustrados',
    'landing.featIllustratedDesc': 'Organize textos e ilustrações para projetos editoriais visuais.',
    'landing.featPdfTitle': 'Formatação para publicação',
    'landing.featPdfDesc': 'Prepare seu manuscrito para os formatos de publicação compatíveis com a plataforma.',
    'landing.featProjectTitle': 'Organização do projeto',
    'landing.featProjectDesc': 'Acompanhe as etapas da criação do livro em um fluxo organizado.',
    'landing.showcaseTitle': 'Seu livro pronto para o mundo',
    'landing.showcaseDesc': 'Após a geração, você pode revisar, personalizar e publicar seu livro diretamente nas principais plataformas.',
    'landing.showcasePassive': 'E ainda pode gerar renda passiva com suas publicações.',
    'landing.howItWorksTitle': 'Como funciona?',
    'landing.howItWorksSubtitle': 'Em apenas alguns passos, seu livro é gerado, formatado e pronto para publicar.',
    'landing.step1Title': 'Escolha um tema ou nicho',
    'landing.step1Desc': 'Informe o assunto que deseja explorar. Nossa IA pesquisa, estrutura e desenvolve o conteúdo.',
    'landing.step2Title': 'Gere seu livro completo',
    'landing.step2Desc': 'Com capítulos, prefácio, capa profissional e formatação pronta para publicação.',
    'landing.step3Title': 'Revise e personalize',
    'landing.step3Desc': 'Faça ajustes, adicione sua identidade e deixe do seu jeito.',
    'landing.step4Title': 'Publique e ganhe',
    'landing.step4Desc': 'Envie para Amazon KDP, Google Play Books e Apple Books e comece a gerar renda passiva.',
    'landing.topicsTitle': 'Alguns temas que você pode explorar',
    'landing.topicsSubtitle': 'Diversos nichos, infinitas possibilidades.',
    'landing.finalCtaTitle': 'Transforme suas ideias em uma fonte de renda real. Comece hoje!',
    'landing.finalCtaDesc': 'Milhares de pessoas já estão publicando seus livros e gerando renda com o BookEngin. Agora é a sua vez.',
    'landing.testimonialQuote': '“O BookEngin me deu a oportunidade de publicar meu primeiro livro e hoje já é minha principal fonte de renda.”',
    'landing.testimonialAuthor': '— Mariana S., autora parceira',
    'landing.footerTerms': 'Termos de Uso',
    'landing.footerPrivacy': 'Política de Privacidade',
    'landing.footerSupport': 'Ajuda e Suporte',
    'landing.footerCopyright': '© 2026 BookEngin. Todos os direitos reservados.',

    // Capas em HTML (renderizadas e traduzidas em tempo real)
    'landing.cover1.badge': 'BESTSELLER KDP',
    'landing.cover1.title': 'O ÚLTIMO SEGREDO',
    'landing.cover1.subtitle': 'UM THRILLER DE SUSPENSE',
    'landing.cover1.author': 'LEANDRO PALMEIRA',

    'landing.cover2.badge': 'EDIÇÃO ESPECIAL',
    'landing.cover2.title': 'DINOSSAUROS PARA COLORIR',
    'landing.cover2.subtitle': '50+ DESENHOS DIVERTIDOS PARA CRIANÇAS',

    'landing.cover3.badge': 'TREINO CEREBRAL',
    'landing.cover3.title': 'SUDOKU DESAFIO',
    'landing.cover3.subtitle': '100+ PUZZLES • FÁCIL A DIFÍCIL',

    // Pilares
    'landing.pillarSecure': 'Seguro',
    'landing.pillarSecureDesc': 'Seus dados protegidos',
    'landing.pillarFast': 'Rápido',
    'landing.pillarFastDesc': 'Geração em segundos',
    'landing.pillarCloud': 'Na Nuvem',
    'landing.pillarCloudDesc': 'Acesse de qualquer lugar',

    // Autenticação
    'landing.authSubtitle': 'Entre na sua conta ou crie um novo acesso para começar a criar seus livros.',
    'landing.tabLogin': 'Entrar',
    'landing.tabRegister': 'Cadastrar-se',
    'landing.labelEmail': 'E-mail do Autor / Editor',
    'landing.labelPassword': 'Senha de Acesso',
    'landing.labelName': 'Nome do Autor / Editor',
    'landing.placeholderEmail': 'seu.email@exemplo.com',
    'landing.placeholderPassword': 'Digite sua senha',
    'landing.placeholderPasswordCreate': 'Crie uma senha segura',
    'landing.placeholderName': 'Ex: Leandro Palmeira',
    'landing.rememberMe': 'Lembrar de mim neste dispositivo',
    'landing.forgotPassword': 'Esqueceu a senha?',
    'landing.btnEnterDashboard': 'Entrar no Painel do BookEngin',
    'landing.btnLoading': 'Carregando...',
    'landing.orDivider': 'OU',
    'landing.registerBoxTitle': 'Cadastre-se agora',
    'landing.registerBoxDesc': 'Crie sua conta e aproveite o acesso completo à plataforma.',
    'landing.btnCreateAccount': 'Criar minha conta',
    'landing.btnSubmitRegister': 'Criar Conta e Começar',
    'landing.subscriptionNotice': 'Assinatura mensal por R$ 25,00 para até 15 livros. Acesso imediato a todas as ferramentas.',
    'landing.securityFootnote': 'Ambiente Editorial Seguro • Acesso Direto ao Dashboard BookEngin',
    'landing.footerTagline': 'BookEngin | Your Ideas. Complete Books. One Platform.',

    // Painel Administrativo & Gestão de Clientes
    'admin.badge': 'Painel Admin & Clientes',
    'admin.title': 'Painel de Controle Editorial & Clientes',
    'admin.subtitle': 'Acompanhe todos os clientes cadastrados, planos ativos e obras criadas na plataforma',
    'admin.btnBack': 'Voltar à Dashboard',
    'admin.tabOverview': 'Visão Geral & Métricas',
    'admin.tabUsers': 'Clientes Cadastrados',
    'admin.tabProjects': 'Livros & Produção dos Clientes',
    'admin.searchPlaceholder': 'Pesquisar por nome ou e-mail do cliente...',
    'admin.filterAllPlans': 'Todos os Planos',
    'admin.filterFree': 'Plano Gratuito',
    'admin.filterPro': 'Plano Profissional',
    'admin.filterEnterprise': 'Plano Empresarial',
    'admin.colUser': 'Cliente',
    'admin.colPlan': 'Plano',
    'admin.colStatus': 'Status',
    'admin.colProjects': 'Livros Criados',
    'admin.colDate': 'Cadastro',
    'admin.colActions': 'Ações',
    'admin.btnEdit': 'Gerenciar Plano',
    'admin.btnDelete': 'Excluir',
    'admin.btnSave': 'Salvar Alterações',
    'admin.btnCancel': 'Cancelar',
    'admin.statTotalUsers': 'Total de Clientes',
    'admin.statProUsers': 'Clientes Pro & Enterprise',
    'admin.statTotalBooks': 'Livros Criados na Plataforma',
    'admin.statActiveSessions': 'Sessões Ativas Agora',
    'admin.statAiCalls': 'Chamadas de IA Hoje',
    'admin.modalTitle': 'Gerenciar Cliente',
    'admin.fieldPlan': 'Plano do Cliente',
    'admin.fieldAdmin': 'Acesso de Administrador',
    'admin.fieldVerified': 'E-mail Verificado',
    'admin.confirmDelete': 'Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.',
    'admin.noUsers': 'Nenhum cliente encontrado com os filtros aplicados.',
    'admin.noProjects': 'Nenhum livro criado pelos clientes ainda.'
  },

  'en-US': {
    // Header & Navbar
    'nav.slogan': 'Your Ideas. Complete Books. One Platform.',
    'nav.aiGuide': 'Author AI Mentor',
    'nav.help': 'Settings & Help',
    'nav.proPlan': 'Pro Plan',
    'nav.logout': 'Sign Out',
    'nav.language': 'Language',

    // Hero Banner
    'hero.greeting': 'Hello, Leandro',
    'hero.welcome': 'Welcome to BookEngin',
    'hero.description': 'Discover high-demand niches, craft professional books, and publish to Amazon KDP, Google Play Books, and Apple Books directly from your dashboard.',
    'hero.btnNewBook': 'Create New Project',
    'hero.btnBatch': 'Batch Generator (1–20)',
    'hero.btnManuals': '"How-To" Manuals',
    'hero.btnCovers': '10 Cover Styles',
    'hero.btnKdpDirect': 'Direct KDP Publish',
    'hero.btnMultiplatform': 'Multiplatform',

    // Books List
    'catalog.title': 'Books Created on Platform',
    'catalog.subtitle': 'Complete catalogue with typeset covers and publishing packages',
    'catalog.btnNew': 'New Book',
    'catalog.emptyTitle': 'No books created yet',
    'catalog.emptyAction': 'Start My First Book',
    'catalog.statusDone': 'Finalized & Ready for Amazon KDP',
    'catalog.statusInProgress': 'In Progress',
    'catalog.chapter': 'chapter',
    'catalog.chapters': 'chapters',
    'catalog.words': 'words',
    'catalog.inCreation': 'Drafting',
    'catalog.actionQuickFinalize': 'Finalize Book & Prepare for Download',
    'catalog.actionPublishKdp': 'Publish Directly to Amazon KDP In-App',
    'catalog.actionMultiplatform': 'Multiplatform Distribution',
    'catalog.actionDuplicate': 'Duplicate Book',
    'catalog.actionDelete': 'Delete',
    'catalog.btnEdit': 'Edit',
    'catalog.btnContinue': 'Continue',

    // Shelf & Downloads (FinalBooksShelf)
    'shelf.title': 'Finalized & Approved Bookshelf',
    'shelf.subtitle': 'Full manuscripts with official KDP typesetting, high-res covers, and production assets',
    'shelf.trim': 'Trim Size',
    'shelf.typesetPages': 'typeset pages',
    'shelf.fullChapters': 'complete chapters',
    'shelf.completedOn': 'Completed on',
    'shelf.noBlankPages': 'Zero blank pages',
    'shelf.btnManuscript': 'Download Manuscript',
    'shelf.btnEpub': 'Download E-book (.EPUB)',
    'shelf.btnBookPdf': 'Download Book PDF',
    'shelf.btnCoverPdf': 'Download Cover PDF',
    'shelf.btnSamplePagePdf': 'Download Sample Page PDF',
    'shelf.btnHtmlDesc': 'Page HTML / Description',
    'shelf.btnEditBook': 'Edit / Remake Book',
    'shelf.btnGenerating': 'Generating...',

    // Metrics Overview
    'overview.title': 'Executive Overview',
    'overview.today': 'Today',
    'metric.projectsCount': 'Projects in Suite',
    'metric.searchesCount': 'Searches Performed',
    'metric.nichesCount': 'Analyzed Niches',
    'metric.reportsCount': 'Market Reports',

    // Recent Activity
    'activity.title': 'Recent Activity',
    'activity.viewAll': 'View all',
    'activity.emptyTitle': 'No recent activity',
    'activity.emptyDesc': 'Your updates and reports will appear here as soon as you start working.',
    'activity.edited': 'Edited',
    'activity.started': 'Started new project',

    // Modals & Tools
    'batch.title': 'KDP Batch Book Generator',
    'batch.subtitle': 'Generate 1 to 20 books per genre with precise page counts and automated audit',
    'manuals.title': 'Technical "How-To" Manuals Library',
    'manuals.subtitle': 'Public domain projects with vector schematics and step-by-step instructions',
    'covers.title': '10 Amazon Bestseller Cover Styles',
    'covers.subtitle': 'Benchmarked with real bestseller titles and Commercial Acceptance Scores',
    'aiGuide.title': 'Author AI Mentor — Editorial KDP Copilot',
    'aiGuide.subtitle': 'Real-time guidance for profitable niches, manuscripts, and KDP compliance',

    // Footer
    'footer.brand': 'BookEngin v1.0',
    'footer.desc': 'Professional Editorial AI Creation & Publishing Platform',

    // Landing Page & Divulgação
    'landing.sloganHeader': 'Your Ideas. Complete Books. One Platform.',
    'landing.subHeaderBrand': 'Your Ideas. Complete Books. One Platform.',
    'landing.heroBadge': 'From topic to published book',
    'landing.heroTitlePrefix': 'Transform your ideas into',
    'landing.heroTitleHighlight': 'professional books',
    'landing.heroDesc': 'Plan, research, write chapters, design covers, and prepare books for publication on a single unified platform.',
    'landing.platformAmazonDesc': 'Publish and sell worldwide',
    'landing.platformGoogleDesc': 'Reach millions of readers',
    'landing.platformAppleDesc': 'Expand your global catalog',
    'landing.ctaStart': 'Get started now',
    'landing.guaranteeBooks': 'Up to 15 books per month',
    'landing.guaranteeCard': 'No credit card required (cancel anytime)',
    'landing.guaranteeSupport': 'Dedicated author support',
    'landing.cardTitle': 'Your complete book, AI-powered',
    'landing.cardProCover': 'Professional book cover',
    'landing.cardChapters': 'Preface and chapters',
    'landing.cardFormatting': 'Publication-ready formatting',
    'landing.cardPlatforms': 'Ready for Amazon KDP, Google Play and Apple Books',
    'landing.featuresSectionTitle': 'Everything you need to create your book',
    'landing.featuresSectionSubtitle': 'A complete end-to-end platform, from ideation to global publishing.',
    'landing.featResearchTitle': 'Smart research',
    'landing.featResearchDesc': 'Discover profitable niches, commercial trends, and market opportunities.',
    'landing.featWritingTitle': 'AI writing',
    'landing.featWritingDesc': 'Develop structured ideas, outline chapters, and write quality content with AI guidance.',
    'landing.featCoverTitle': 'Cover creation',
    'landing.featCoverDesc': 'Create bookstore-grade covers tailored to your book positioning and target genre.',
    'landing.featIllustratedTitle': 'Illustrated books',
    'landing.featIllustratedDesc': 'Organize manuscript copy and high-res artwork for visual publishing projects.',
    'landing.featPdfTitle': 'Publication formatting',
    'landing.featPdfDesc': 'Format your manuscript precisely for Amazon KDP and global digital distributors.',
    'landing.featProjectTitle': 'Project management',
    'landing.featProjectDesc': 'Track book production milestones across a streamlined, organized workflow.',
    'landing.showcaseTitle': 'Your book ready for the world',
    'landing.showcaseDesc': 'After generation, review, customize, and publish your book directly to top retail platforms.',
    'landing.showcasePassive': 'And build passive income streams with your published titles.',
    'landing.howItWorksTitle': 'How does it work?',
    'landing.howItWorksSubtitle': 'In just a few steps, your book is drafted, formatted, and ready to publish.',
    'landing.step1Title': 'Choose a topic or niche',
    'landing.step1Desc': 'Select your core subject. Our AI analyzes demand, crafts outlines, and structures the draft.',
    'landing.step2Title': 'Generate your full book',
    'landing.step2Desc': 'Complete with preface, structured chapters, professional cover, and calibrated layout.',
    'landing.step3Title': 'Review and customize',
    'landing.step3Desc': 'Refine copy, inject your authorial voice, and adapt every page to your standard.',
    'landing.step4Title': 'Publish and earn',
    'landing.step4Desc': 'Deploy to Amazon KDP, Google Play Books, and Apple Books to unlock passive royalties.',
    'landing.topicsTitle': 'Genres you can explore',
    'landing.topicsSubtitle': 'Endless niches, infinite commercial possibilities.',
    'landing.finalCtaTitle': 'Turn your ideas into a real income stream. Start today!',
    'landing.finalCtaDesc': 'Thousands of authors are publishing titles and earning royalties with BookEngin. Now it’s your turn.',
    'landing.testimonialQuote': '“BookEngin gave me the leverage to publish my first book, and today it has become my primary income source.”',
    'landing.testimonialAuthor': '— Mariana S., partner author',
    'landing.footerTerms': 'Terms of Use',
    'landing.footerPrivacy': 'Privacy Policy',
    'landing.footerSupport': 'Help & Support',
    'landing.footerCopyright': '© 2026 BookEngin. All rights reserved.',

    // HTML Book Covers (Dynamic Real-Time Translation)
    'landing.cover1.badge': 'KDP BESTSELLER',
    'landing.cover1.title': 'THE LAST SECRET',
    'landing.cover1.subtitle': 'A SUSPENSE THRILLER',
    'landing.cover1.author': 'LEANDRO PALMEIRA',

    'landing.cover2.badge': 'SPECIAL EDITION',
    'landing.cover2.title': 'DINOSAURS COLORING BOOK',
    'landing.cover2.subtitle': '50+ FUN PAGES FOR KIDS',

    'landing.cover3.badge': 'BRAIN TRAINING',
    'landing.cover3.title': 'SUDOKU CHALLENGE',
    'landing.cover3.subtitle': '100+ PUZZLES • EASY TO HARD',

    // Pillars
    'landing.pillarSecure': 'Secure',
    'landing.pillarSecureDesc': 'Your manuscripts protected',
    'landing.pillarFast': 'Fast',
    'landing.pillarFastDesc': 'Generated in seconds',
    'landing.pillarCloud': 'Cloud Native',
    'landing.pillarCloudDesc': 'Access anywhere on any device',

    // Authentication
    'landing.authSubtitle': 'Sign in to your account or register to start creating your books.',
    'landing.tabLogin': 'Sign In',
    'landing.tabRegister': 'Register',
    'landing.labelEmail': 'Author / Publisher Email',
    'landing.labelPassword': 'Password',
    'landing.labelName': 'Author Full Name',
    'landing.placeholderEmail': 'your.email@example.com',
    'landing.placeholderPassword': 'Enter your password',
    'landing.placeholderPasswordCreate': 'Create a secure password',
    'landing.placeholderName': 'E.g.: John Doe',
    'landing.rememberMe': 'Remember me on this device',
    'landing.forgotPassword': 'Forgot password?',
    'landing.btnEnterDashboard': 'Enter BookEngin Dashboard',
    'landing.btnLoading': 'Signing in...',
    'landing.orDivider': 'OR',
    'landing.registerBoxTitle': 'Register now',
    'landing.registerBoxDesc': 'Create your account and get full unlimited access to the suite.',
    'landing.btnCreateAccount': 'Create my account',
    'landing.btnSubmitRegister': 'Create Account & Start',
    'landing.subscriptionNotice': 'Monthly subscription for $25 for up to 15 books. Immediate access to all tools.',
    'landing.securityFootnote': 'Secure Publishing Environment • Direct Access to BookEngin Dashboard',
    'landing.footerTagline': 'BookEngin | Your Ideas. Complete Books. One Platform.',

    // Admin Control Panel & Client Management
    'admin.badge': 'Admin & Clients Panel',
    'admin.title': 'Editorial & Client Management Control Panel',
    'admin.subtitle': 'Track all registered clients, active plans, and books created on the platform',
    'admin.btnBack': 'Back to Dashboard',
    'admin.tabOverview': 'Overview & Metrics',
    'admin.tabUsers': 'Registered Clients',
    'admin.tabProjects': 'Clients Books & Projects',
    'admin.searchPlaceholder': 'Search by client name or email...',
    'admin.filterAllPlans': 'All Plans',
    'admin.filterFree': 'Free Plan',
    'admin.filterPro': 'Pro Plan',
    'admin.filterEnterprise': 'Enterprise Plan',
    'admin.colUser': 'Client',
    'admin.colPlan': 'Plan',
    'admin.colStatus': 'Status',
    'admin.colProjects': 'Books Created',
    'admin.colDate': 'Joined',
    'admin.colActions': 'Actions',
    'admin.btnEdit': 'Manage Plan',
    'admin.btnDelete': 'Delete',
    'admin.btnSave': 'Save Changes',
    'admin.btnCancel': 'Cancel',
    'admin.statTotalUsers': 'Total Clients',
    'admin.statProUsers': 'Pro & Enterprise Clients',
    'admin.statTotalBooks': 'Books Created on Platform',
    'admin.statActiveSessions': 'Active Sessions Now',
    'admin.statAiCalls': 'AI Engine Calls Today',
    'admin.modalTitle': 'Manage Client',
    'admin.fieldPlan': 'Client Plan',
    'admin.fieldAdmin': 'Administrator Privileges',
    'admin.fieldVerified': 'Email Verified',
    'admin.confirmDelete': 'Are you sure you want to delete this client? This action cannot be undone.',
    'admin.noUsers': 'No clients found matching the selected filters.',
    'admin.noProjects': 'No books created by clients yet.'
  },

  'es-ES': {
    // Header & Navbar
    'nav.slogan': 'Your Ideas. Complete Books. One Platform.',
    'nav.aiGuide': 'IA Mentor del Autor',
    'nav.help': 'Configuración y Ayuda',
    'nav.proPlan': 'Plan Pro',
    'nav.logout': 'Cerrar Sesión',
    'nav.language': 'Idioma',

    // Hero Banner
    'hero.greeting': 'Hola, Leandro',
    'hero.welcome': 'Bienvenido a BookEngin',
    'hero.description': 'Descubra nichos de alta demanda, redacte libros profesionales y publique en Amazon KDP, Google Play Books y Apple Books directamente desde la plataforma.',
    'hero.btnNewBook': 'Crear Nuevo Proyecto',
    'hero.btnBatch': 'Generador por Lotes (1 a 20)',
    'hero.btnManuals': 'Manuales "Cómo Hacer"',
    'hero.btnCovers': '10 Estilos de Portadas',
    'hero.btnKdpDirect': 'Publicar Directo en KDP',
    'hero.btnMultiplatform': 'Multiplataforma',

    // Books List
    'catalog.title': 'Libros Creados en la Plataforma',
    'catalog.subtitle': 'Catálogo completo con portadas maquetadas y archivos de publicación',
    'catalog.btnNew': 'Nuevo Libro',
    'catalog.emptyTitle': 'Aún no hay libros creados',
    'catalog.emptyAction': 'Comenzar Mi Primer Libro',
    'catalog.statusDone': 'Finalizado & Listo para Amazon KDP',
    'catalog.statusInProgress': 'En Curso',
    'catalog.chapter': 'capítulo',
    'catalog.chapters': 'capítulos',
    'catalog.words': 'palabras',
    'catalog.inCreation': 'En redacción',
    'catalog.actionQuickFinalize': 'Finalizar Obra y Preparar para Descarga',
    'catalog.actionPublishKdp': 'Publicar Directamente en Amazon KDP In-App',
    'catalog.actionMultiplatform': 'Distribución Multiplataforma',
    'catalog.actionDuplicate': 'Duplicar Obra',
    'catalog.actionDelete': 'Eliminar',
    'catalog.btnEdit': 'Editar',
    'catalog.btnContinue': 'Continuar',

    // Shelf & Downloads (FinalBooksShelf)
    'shelf.title': 'Estantería de Libros Finalizados & Aprobados',
    'shelf.subtitle': 'Obras completas con maquetación oficial KDP, portadas en alta resolución y archivos listos',
    'shelf.trim': 'Formato',
    'shelf.typesetPages': 'páginas maquetadas',
    'shelf.fullChapters': 'capítulos completos',
    'shelf.completedOn': 'Finalizado el',
    'shelf.noBlankPages': 'Sin páginas en blanco',
    'shelf.btnManuscript': 'Descargar Manuscrito',
    'shelf.btnEpub': 'Descargar E-book (.EPUB)',
    'shelf.btnBookPdf': 'Descargar PDF del Libro',
    'shelf.btnCoverPdf': 'Descargar PDF de Portada',
    'shelf.btnSamplePagePdf': 'Descargar PDF de Muestra',
    'shelf.btnHtmlDesc': 'HTML de Página / Descripción',
    'shelf.btnEditBook': 'Editar / Rehacer Libro',
    'shelf.btnGenerating': 'Generando...',

    // Metrics Overview
    'overview.title': 'Visión General',
    'overview.today': 'Hoy',
    'metric.projectsCount': 'Libros en el proyecto',
    'metric.searchesCount': 'Búsquedas realizadas',
    'metric.nichesCount': 'Nichos analizados',
    'metric.reportsCount': 'Informes generados',

    // Recent Activity
    'activity.title': 'Actividad reciente',
    'activity.viewAll': 'Ver todas',
    'activity.emptyTitle': 'Sin actividad reciente',
    'activity.emptyDesc': 'Sus acciones e informes aparecerán aquí en cuanto comience a trabajar.',
    'activity.edited': 'Editó',
    'activity.started': 'Inició nuevo proyecto',

    // Modals & Tools
    'batch.title': 'Generador de Libros por Lotes KDP',
    'batch.subtitle': 'Genere de 1 a 20 libros por género con cálculo exacto de páginas y auditoría',
    'manuals.title': 'Biblioteca de Manuales Técnicos "Cómo Hacer"',
    'manuals.subtitle': 'Proyectos públicos con diagramas vectoriales e instrucciones paso a paso',
    'covers.title': '10 Estilos de Portadas Bestseller de Amazon',
    'covers.subtitle': 'Comparativa con títulos reales y Grado de Aceptación Comercial',
    'aiGuide.title': 'IA Guía del Autor — Copiloto Editorial KDP',
    'aiGuide.subtitle': 'Orientación en tiempo real para nichos rentables, manuscritos y cumplimiento de KDP',

    // Footer
    'footer.brand': 'BookEngin v1.0',
    'footer.desc': 'Plataforma Profesional de Creación y Publicación Editorial con IA',

    // Landing Page & Divulgação
    'landing.sloganHeader': 'Your Ideas. Complete Books. One Platform.',
    'landing.subHeaderBrand': 'Your Ideas. Complete Books. One Platform.',
    'landing.heroBadge': 'De la idea al libro publicado',
    'landing.heroTitlePrefix': 'Transforma tus ideas en',
    'landing.heroTitleHighlight': 'libros profesionales',
    'landing.heroDesc': 'Planifica, investiga, escribe capítulos, diseña portadas y prepara tus libros para publicar en una sola plataforma unificada.',
    'landing.platformAmazonDesc': 'Publica y vende a nivel mundial',
    'landing.platformGoogleDesc': 'Alcanza millones de lectores',
    'landing.platformAppleDesc': 'Expande tu catálogo digital',
    'landing.ctaStart': 'Comienza ahora',
    'landing.guaranteeBooks': 'Hasta 15 libros por mes',
    'landing.guaranteeCard': 'Sin tarjeta de crédito (cancela cuando quieras)',
    'landing.guaranteeSupport': 'Soporte especializado para autores',
    'landing.cardTitle': 'Tu libro completo, generado por IA',
    'landing.cardProCover': 'Portada profesional',
    'landing.cardChapters': 'Prefacio y capítulos',
    'landing.cardFormatting': 'Maquetación lista para publicar',
    'landing.cardPlatforms': 'Listo para Amazon KDP, Google Play y Apple Books',
    'landing.featuresSectionTitle': 'Todo lo que necesitas para crear tu libro',
    'landing.featuresSectionSubtitle': 'Una plataforma completa, desde la planificación hasta la publicación.',
    'landing.featResearchTitle': 'Investigación inteligente',
    'landing.featResearchDesc': 'Descubre nichos rentables, tendencias comerciales y oportunidades de mercado.',
    'landing.featWritingTitle': 'Escritura con IA',
    'landing.featWritingDesc': 'Desarrolla ideas estructuradas, esquematiza capítulos y escribe contenidos con asistencia de IA.',
    'landing.featCoverTitle': 'Diseño de portadas',
    'landing.featCoverDesc': 'Crea portadas profesionales alineadas al tema y posicionamiento comercial de tu libro.',
    'landing.featIllustratedTitle': 'Libros ilustrados',
    'landing.featIllustratedDesc': 'Organiza textos e ilustraciones en alta definición para proyectos editoriales visuales.',
    'landing.featPdfTitle': 'Maquetación para publicación',
    'landing.featPdfDesc': 'Prepara tu manuscrito en formatos estrictamente compatibles con Amazon KDP y distribuidores.',
    'landing.featProjectTitle': 'Organización del proyecto',
    'landing.featProjectDesc': 'Acompaña las etapas de producción de tu libro en un flujo ordenado y claro.',
    'landing.showcaseTitle': 'Tu libro listo para el mundo',
    'landing.showcaseDesc': 'Tras la generación, puedes revisar, personalizar y publicar tu libro directamente en las principales tiendas.',
    'landing.showcasePassive': 'Y generar ingresos pasivos con tu catálogo de publicaciones.',
    'landing.howItWorksTitle': '¿Cómo funciona?',
    'landing.howItWorksSubtitle': 'En solo unos pasos, tu libro es redactado, formateado y listo para publicar.',
    'landing.step1Title': 'Elige un tema o nicho',
    'landing.step1Desc': 'Indica el asunto que deseas explorar. Nuestra IA investiga la demanda, estructura el índice y desarrolla el borrador.',
    'landing.step2Title': 'Genera tu libro completo',
    'landing.step2Desc': 'Con capítulos, prefacio, portada profesional y diagramación lista para publicación.',
    'landing.step3Title': 'Revisa y personaliza',
    'landing.step3Desc': 'Haz ajustes, añade tu voz de autor y personaliza cada detalle a tu estilo.',
    'landing.step4Title': 'Publica y gana',
    'landing.step4Desc': 'Publica en Amazon KDP, Google Play Books y Apple Books y empieza a generar regalías pasivas.',
    'landing.topicsTitle': 'Algunos géneros que puedes explorar',
    'landing.topicsSubtitle': 'Diversos nichos, infinitas posibilidades comerciales.',
    'landing.finalCtaTitle': '¡Convierte tus ideas en una fuente de ingresos real. Empieza hoy!',
    'landing.finalCtaDesc': 'Miles de autores ya están publicando sus libros y generando ingresos con BookEngin. Ahora es tu turno.',
    'landing.testimonialQuote': '“BookEngin me dio la oportunidad de publicar mi primer libro y hoy ya es mi principal fuente de ingresos.”',
    'landing.testimonialAuthor': '— Mariana S., autora asociada',
    'landing.footerTerms': 'Términos de Uso',
    'landing.footerPrivacy': 'Política de Privacidad',
    'landing.footerSupport': 'Ayuda y Soporte',
    'landing.footerCopyright': '© 2026 BookEngin. Todos los derechos reservados.',

    // Portadas en HTML (renderizadas y traducidas en tiempo real)
    'landing.cover1.badge': 'BESTSELLER KDP',
    'landing.cover1.title': 'EL ÚLTIMO SECRETO',
    'landing.cover1.subtitle': 'UN THRILLER DE SUSPENSO',
    'landing.cover1.author': 'LEANDRO PALMEIRA',

    'landing.cover2.badge': 'EDICIÓN ESPECIAL',
    'landing.cover2.title': 'DINOSAURIOS PARA COLOREAR',
    'landing.cover2.subtitle': '50+ DIBUJOS DIVERTIDOS PARA NIÑOS',

    'landing.cover3.badge': 'GIMNASIA CEREBRAL',
    'landing.cover3.title': 'SUDOKU DESAFÍO',
    'landing.cover3.subtitle': '100+ PUZZLES • FÁCIL A DIFÍCIL',

    // Pilares
    'landing.pillarSecure': 'Seguro',
    'landing.pillarSecureDesc': 'Tus datos protegidos',
    'landing.pillarFast': 'Rápido',
    'landing.pillarFastDesc': 'Generación en segundos',
    'landing.pillarCloud': 'En la Nube',
    'landing.pillarCloudDesc': 'Accede desde cualquier lugar',

    // Autenticación
    'landing.authSubtitle': 'Inicia sesión o crea una nueva cuenta para comenzar a crear tus libros.',
    'landing.tabLogin': 'Iniciar sesión',
    'landing.tabRegister': 'Registrarse',
    'landing.labelEmail': 'Correo del Autor / Editor',
    'landing.labelPassword': 'Contraseña de Acceso',
    'landing.labelName': 'Nombre del Autor / Editor',
    'landing.placeholderEmail': 'tu.correo@ejemplo.com',
    'landing.placeholderPassword': 'Introduce tu contraseña',
    'landing.placeholderPasswordCreate': 'Crea una contraseña segura',
    'landing.placeholderName': 'Ej: Carlos Mendoza',
    'landing.rememberMe': 'Recordarme en este dispositivo',
    'landing.forgotPassword': '¿Olvidaste tu contraseña?',
    'landing.btnEnterDashboard': 'Entrar al Panel de BookEngin',
    'landing.btnLoading': 'Iniciando sesión...',
    'landing.orDivider': 'O',
    'landing.registerBoxTitle': 'Regístrate ahora',
    'landing.registerBoxDesc': 'Crea tu cuenta y aprovecha el acceso ilimitado a la plataforma.',
    'landing.btnCreateAccount': 'Crear mi cuenta',
    'landing.btnSubmitRegister': 'Crear Cuenta y Empezar',
    'landing.subscriptionNotice': 'Suscripción mensual por US$ 25 para hasta 15 libros. Acceso inmediato a todas las herramientas.',
    'landing.securityFootnote': 'Entorno Editorial Seguro • Acceso Directo al Dashboard BookEngin',
    'landing.footerTagline': 'BookEngin | Your Ideas. Complete Books. One Platform.',
  },

  'fr-FR': {
    // Header & Navbar
    'nav.slogan': 'Intelligence éditoriale pour votre succès sur Amazon',
    'nav.aiGuide': 'IA Mentor de l’Auteur',
    'nav.help': 'Paramètres & Aide',
    'nav.proPlan': 'Forfait Pro',
    'nav.logout': 'Se déconnecter',
    'nav.language': 'Langue',

    // Hero Banner
    'hero.greeting': 'Bonjour, Leandro',
    'hero.welcome': 'Bienvenue sur BookEngin',
    'hero.description': 'Trouvez des niches rentables, créez des livres de qualité professionnelle et publiez directement sur Amazon KDP sans quitter la plateforme.',
    'hero.btnNewBook': 'Créer un Projet',
    'hero.btnBatch': 'Générateur par Lots (1 à 20)',
    'hero.btnManuals': 'Manuels "Comment Faire"',
    'hero.btnCovers': '10 Styles de Couvertures',
    'hero.btnKdpDirect': 'Publication KDP Directe',
    'hero.btnMultiplatform': 'Multiplateforme',

    // Books List
    'catalog.title': 'Livres Créés sur la Plateforme',
    'catalog.subtitle': 'Catalogue complet avec couvertures mises en page et fichiers d’édition',
    'catalog.btnNew': 'Nouveau Livre',
    'catalog.emptyTitle': 'Aucun livre créé pour l’instant',
    'catalog.emptyAction': 'Créer Mon Premier Livre',
    'catalog.statusDone': 'Finalisé & Prêt pour Amazon KDP',
    'catalog.statusInProgress': 'En Cours',
    'catalog.chapter': 'chapitre',
    'catalog.chapters': 'chapitres',
    'catalog.words': 'mots',
    'catalog.inCreation': 'En cours de rédaction',
    'catalog.actionQuickFinalize': 'Finaliser l’ouvrage et préparer au téléchargement',
    'catalog.actionPublishKdp': 'Publier directement sur Amazon KDP In-App',
    'catalog.actionMultiplatform': 'Distribution Multiplateforme',
    'catalog.actionDuplicate': 'Dupliquer l’ouvrage',
    'catalog.actionDelete': 'Supprimer',
    'catalog.btnEdit': 'Modifier',
    'catalog.btnContinue': 'Continuer',

    // Shelf & Downloads (FinalBooksShelf)
    'shelf.title': 'Bibliothèque des Livres Finalisés & Approuvés',
    'shelf.subtitle': 'Ouvrages complets avec mise en page officielle KDP, couvertures HD et fichiers prêts',
    'shelf.trim': 'Format',
    'shelf.typesetPages': 'pages mises en page',
    'shelf.fullChapters': 'chapitres complets',
    'shelf.completedOn': 'Finalisé le',
    'shelf.noBlankPages': 'Zéro page blanche',
    'shelf.btnManuscript': 'Télécharger le Manuscrit',
    'shelf.btnEpub': 'Télécharger l’E-book (.EPUB)',
    'shelf.btnBookPdf': 'Télécharger le PDF du Livre',
    'shelf.btnCoverPdf': 'Télécharger le PDF de Couverture',
    'shelf.btnSamplePagePdf': 'Télécharger le PDF d’Extrait',
    'shelf.btnHtmlDesc': 'HTML de la Page / Description',
    'shelf.btnEditBook': 'Modifier / Refaire le Livre',
    'shelf.btnGenerating': 'Génération...',

    // Metrics Overview
    'overview.title': 'Vue d’Ensemble',
    'overview.today': 'Aujourd’hui',
    'metric.projectsCount': 'Livres dans le projet',
    'metric.searchesCount': 'Recherches effectuées',
    'metric.nichesCount': 'Niches analysées',
    'metric.reportsCount': 'Rapports générés',

    // Recent Activity
    'activity.title': 'Activité récente',
    'activity.viewAll': 'Voir tout',
    'activity.emptyTitle': 'Aucune activité récente',
    'activity.emptyDesc': 'Vos actions et rapports apparaîtront ici dès que vous commencerez.',
    'activity.edited': 'A modifié',
    'activity.started': 'A commencé un nouveau projet',

    // Modals & Tools
    'batch.title': 'Générateur de Livres par Lots KDP',
    'batch.subtitle': 'Générez de 1 à 20 livres par genre avec pagination précise et audit automatique',
    'manuals.title': 'Bibliothèque de Manuels Techniques "Comment Faire"',
    'manuals.subtitle': 'Projets du domaine public avec schémas vectoriels et instructions étape par étape',
    'covers.title': '10 Styles de Couvertures Bestsellers Amazon',
    'covers.subtitle': 'Comparatif avec titres réels et Indice d’Acceptation Commerciale',
    'aiGuide.title': 'IA Mentor de l’Auteur — Copilote Éditorial KDP',
    'aiGuide.subtitle': 'Conseils en temps réel sur les niches, manuscrits et conformité KDP',

    // Footer
    'footer.brand': 'BookEngin v1.0',
    'footer.desc': 'Plateforme d’Intelligence Éditoriale pour Amazon KDP',
  },

  'de-DE': {
    // Header & Navbar
    'nav.slogan': 'Verlagsintelligenz für Ihren Amazon-Erfolg',
    'nav.aiGuide': 'KI-Autoren-Mentor',
    'nav.help': 'Einstellungen & Hilfe',
    'nav.proPlan': 'Pro-Abonnement',
    'nav.logout': 'Abmelden',
    'nav.language': 'Sprache',

    // Hero Banner
    'hero.greeting': 'Hallo, Leandro',
    'hero.welcome': 'Willkommen bei BookEngin',
    'hero.description': 'Finden Sie lukrative Marktnischen, erstellen Sie erstklassige Bücher und veröffentlichen Sie direkt auf Amazon KDP.',
    'hero.btnNewBook': 'Neues Projekt erstellen',
    'hero.btnBatch': 'Stapel-Generator (1 bis 20)',
    'hero.btnManuals': '"How-To" Handbücher',
    'hero.btnCovers': '10 Cover-Stile',
    'hero.btnKdpDirect': 'Direkt bei KDP veröffentlichen',
    'hero.btnMultiplatform': 'Multiplattform',

    // Books List
    'catalog.title': 'Auf der Plattform erstellte Bücher',
    'catalog.subtitle': 'Vollständiger Katalog mit gesetzten Buchdeckeln und Publikationsdateien',
    'catalog.btnNew': 'Neues Buch',
    'catalog.emptyTitle': 'Noch keine Bücher erstellt',
    'catalog.emptyAction': 'Mein erstes Buch beginnen',
    'catalog.statusDone': 'Fertiggestellt & Bereit für Amazon KDP',
    'catalog.statusInProgress': 'In Bearbeitung',
    'catalog.chapter': 'Kapitel',
    'catalog.chapters': 'Kapitel',
    'catalog.words': 'Wörter',
    'catalog.inCreation': 'Wird verfasst',
    'catalog.actionQuickFinalize': 'Buch abschließen & zum Download bereitstellen',
    'catalog.actionPublishKdp': 'Direkt auf Amazon KDP veröffentlichen',
    'catalog.actionMultiplatform': 'Multiplattform-Vertrieb',
    'catalog.actionDuplicate': 'Buch duplizieren',
    'catalog.actionDelete': 'Löschen',
    'catalog.btnEdit': 'Bearbeiten',
    'catalog.btnContinue': 'Fortsetzen',

    // Shelf & Downloads (FinalBooksShelf)
    'shelf.title': 'Regal der fertigen & genehmigten Bücher',
    'shelf.subtitle': 'Vollständige Manuskripte mit offiziellem KDP-Satz, hochauflösenden Covern und fertigen Dateien',
    'shelf.trim': 'Buchformat',
    'shelf.typesetPages': 'gesetzte Seiten',
    'shelf.fullChapters': 'vollständige Kapitel',
    'shelf.completedOn': 'Fertiggestellt am',
    'shelf.noBlankPages': 'Keine leeren Seiten',
    'shelf.btnManuscript': 'Manuskript herunterladen',
    'shelf.btnEpub': 'E-Book herunterladen (.EPUB)',
    'shelf.btnBookPdf': 'Buch-PDF herunterladen',
    'shelf.btnCoverPdf': 'Cover-PDF herunterladen',
    'shelf.btnSamplePagePdf': 'Proben-PDF herunterladen',
    'shelf.btnHtmlDesc': 'Seiten-HTML / Beschreibung',
    'shelf.btnEditBook': 'Buch bearbeiten / neu erstellen',
    'shelf.btnGenerating': 'Wird generiert...',

    // Metrics Overview
    'overview.title': 'Übersicht',
    'overview.today': 'Heute',
    'metric.projectsCount': 'Bücher im Projekt',
    'metric.searchesCount': 'Durchgeführte Suchen',
    'metric.nichesCount': 'Analysierte Nischen',
    'metric.reportsCount': 'Erstellte Berichte',

    // Recent Activity
    'activity.title': 'Letzte Aktivitäten',
    'activity.viewAll': 'Alle anzeigen',
    'activity.emptyTitle': 'Keine aktuellen Aktivitäten',
    'activity.emptyDesc': 'Ihre Aktionen und Berichte werden hier angezeigt, sobald Sie loslegen.',
    'activity.edited': 'Bearbeitet',
    'activity.started': 'Neues Projekt gestartet',

    // Modals & Tools
    'batch.title': 'KDP Stapel-Buchgenerator',
    'batch.subtitle': 'Generieren Sie 1 bis 20 Bücher pro Genre mit präziser Seitenanzahl und Auto-Prüfung',
    'manuals.title': 'Bibliothek für technische "How-To"-Handbücher',
    'manuals.subtitle': 'Gemeinfreie Projekte mit Vektorschemas und Schritt-für-Schritt-Anleitungen',
    'covers.title': '10 Amazon-Bestseller-Cover-Stile',
    'covers.subtitle': 'Vergleich mit echten Titeln und kommerzieller Akzeptanzrate',
    'aiGuide.title': 'KI-Autoren-Mentor — KDP-Redaktionscopilot',
    'aiGuide.subtitle': 'Echtzeit-Beratung zu Marktnischen, Manuskripten und KDP-Richtlinien',

    // Footer
    'footer.brand': 'BookEngin v1.0',
    'footer.desc': 'Verlagsintelligenz-Plattform für Amazon KDP',
  },

  'ru-RU': {
    // Header & Navbar
    'nav.slogan': 'Издательский интеллект для вашего успеха на Amazon',
    'nav.aiGuide': 'ИИ-наставник автора',
    'nav.help': 'Настройки и помощь',
    'nav.proPlan': 'Тариф Pro',
    'nav.logout': 'Выйти',
    'nav.language': 'Язык',

    // Hero Banner
    'hero.greeting': 'Здравствуйте, Leandro',
    'hero.welcome': 'Добро пожаловать в BookEngin',
    'hero.description': 'Находите прибыльные ниши, создавайте профессиональные книги и публикуйте их напрямую на Amazon KDP прямо с панели управления.',
    'hero.btnNewBook': 'Создать новый проект',
    'hero.btnBatch': 'Пакетный генератор (1–20)',
    'hero.btnManuals': 'Руководства "Сделай сам"',
    'hero.btnCovers': '10 стилей обложек',
    'hero.btnKdpDirect': 'Публикация прямо в KDP',
    'hero.btnMultiplatform': 'Мультиплатформа',

    // Books List
    'catalog.title': 'Книги, созданные на платформе',
    'catalog.subtitle': 'Полный каталог с готовыми обложками и файлами для публикации',
    'catalog.btnNew': 'Новая книга',
    'catalog.emptyTitle': 'Пока нет созданных книг',
    'catalog.emptyAction': 'Начать первую книгу',
    'catalog.statusDone': 'Завершено и готово для Amazon KDP',
    'catalog.statusInProgress': 'В процессе',
    'catalog.chapter': 'глава',
    'catalog.chapters': 'глав',
    'catalog.words': 'слов',
    'catalog.inCreation': 'В процессе написания',
    'catalog.actionQuickFinalize': 'Завершить книгу и подготовить к скачиванию',
    'catalog.actionPublishKdp': 'Опубликовать напрямую на Amazon KDP',
    'catalog.actionMultiplatform': 'Мультиплатформенная дистрибуция',
    'catalog.actionDuplicate': 'Дублировать книгу',
    'catalog.actionDelete': 'Удалить',
    'catalog.btnEdit': 'Редактировать',
    'catalog.btnContinue': 'Продолжить',

    // Shelf & Downloads (FinalBooksShelf)
    'shelf.title': 'Полка завершенных и проверенных книг',
    'shelf.subtitle': 'Полные рукописи с официальной версткой KDP, обложками высокой четкости и файлами для издания',
    'shelf.trim': 'Формат обрезки',
    'shelf.typesetPages': 'сверстанных страниц',
    'shelf.fullChapters': 'полных глав',
    'shelf.completedOn': 'Завершено',
    'shelf.noBlankPages': 'Без пустых страниц',
    'shelf.btnManuscript': 'Скачать рукопись',
    'shelf.btnEpub': 'Скачать электронную книгу (.EPUB)',
    'shelf.btnBookPdf': 'Скачать PDF книги',
    'shelf.btnCoverPdf': 'Скачать PDF обложки',
    'shelf.btnSamplePagePdf': 'Скачать PDF образца страницы',
    'shelf.btnHtmlDesc': 'HTML страницы / Описание',
    'shelf.btnEditBook': 'Редактировать книгу',
    'shelf.btnGenerating': 'Генерация...',

    // Metrics Overview
    'overview.title': 'Обзор показателей',
    'overview.today': 'Сегодня',
    'metric.projectsCount': 'Книг в проекте',
    'metric.searchesCount': 'Проведено поисков',
    'metric.nichesCount': 'Анализов ниш',
    'metric.reportsCount': 'Создано отчетов',

    // Recent Activity
    'activity.title': 'Недавняя активность',
    'activity.viewAll': 'Показать все',
    'activity.emptyTitle': 'Нет недавней активности',
    'activity.emptyDesc': 'Здесь появятся ваши действия и отчеты, как только вы начнете работу.',
    'activity.edited': 'Изменено',
    'activity.started': 'Создан новый проект',

    // Modals & Tools
    'batch.title': 'Пакетный генератор книг KDP',
    'batch.subtitle': 'Генерируйте от 1 до 20 книг в жанре с точным расчетом страниц и аудитом',
    'manuals.title': 'Библиотека технических руководств "Сделай сам"',
    'manuals.subtitle': 'Проекты из открытых источников с векторными схемами и пошаговыми инструкциями',
    'covers.title': '10 стилей обложек бестселлеров Amazon',
    'covers.subtitle': 'Сравнение с реальными бестселлерами и рейтинг признания обложки',
    'aiGuide.title': 'ИИ-наставник автора — Редакционный помощник KDP',
    'aiGuide.subtitle': 'Консультации в реальном времени по нишам, рукописям и требованиям Amazon',

    // Footer
    'footer.brand': 'BookEngin v1.0',
    'footer.desc': 'Платформа редакционной аналитики для Amazon KDP',
  }
};

/**
 * Starts in English to avoid showing Brazilian prices before country detection.
 */
export function getCurrentLanguage(): SupportedLanguage {
  return activeLanguage;
}

/**
 * Define o idioma da interface.
 * O usuário pode escolher livremente qualquer idioma suportado,
 * e sua escolha é persistida no localStorage para as próximas visitas.
 */
export function setLanguage(lang: SupportedLanguage): void {
  if (!TRANSLATIONS[lang]) return;
  languageManuallySelected = true;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('kdp_user_language', lang);
      localStorage.setItem('kdp_preferred_lang_BR', lang);
    } catch {}
  }
  applyLanguage(lang);
}

/**
 * Traduz uma chave com fallback inteligente
 */
export function t(key: string, fallback?: string): string {
  const currentLang = getCurrentLanguage();
  const langDict = TRANSLATIONS[currentLang] || TRANSLATIONS['pt-BR'];
  const text = langDict[key];
  if (text) return text;
  // Fallback para pt-BR se não existir no idioma atual
  const ptText = TRANSLATIONS['pt-BR'][key];
  if (ptText) return ptText;
  return fallback || key;
}

/**
 * Hook React reativo para usar traduções em tempo real
 */
export function useTranslation() {
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(getCurrentLanguage());
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [regionResolved, setRegionResolved] = useState(false);

  useEffect(() => {
    const handleLangChange = (e: any) => {
      const newLang = e?.detail?.lang || getCurrentLanguage();
      setCurrentLang(newLang);
    };

    window.addEventListener(EVENT_NAME, handleLangChange);
    return () => {
      window.removeEventListener(EVENT_NAME, handleLangChange);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    // Se o usuário já escolheu um idioma anteriormente, respeita essa escolha
    if (typeof window !== 'undefined') {
      try {
        const saved = (localStorage.getItem('kdp_user_language') || localStorage.getItem('kdp_preferred_lang_BR')) as SupportedLanguage | null;
        if (saved && TRANSLATIONS[saved]) {
          languageManuallySelected = true;
          applyLanguage(saved);
        }
      } catch {}
    }

    detectVisitorCountry()
      .then(country => {
        if (!mounted) return;
        detectedCountryCode = country;
        setCountryCode(country);
        if (!languageManuallySelected) {
          const preferred = localStorage.getItem('kdp_user_language') as SupportedLanguage | null;
          if (preferred && TRANSLATIONS[preferred]) {
            applyLanguage(preferred);
          } else if (isBrazilianCountry(country)) {
            applyLanguage('pt-BR');
          } else {
            applyLanguage('en-US');
          }
        }
      })
      .catch(() => {
        if (!mounted) return;
        if (isBrowserInBrazil()) {
          detectedCountryCode = 'BR';
          setCountryCode('BR');
          if (!languageManuallySelected) {
            applyLanguage('pt-BR');
          }
        } else {
          detectedCountryCode = null;
          setCountryCode(null);
          if (!languageManuallySelected) {
            applyLanguage('en-US');
          }
        }
      })
      .finally(() => {
        if (mounted) setRegionResolved(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const translate = (key: string, fallback?: string): string => {
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['pt-BR'];
    const text = dict[key];
    if (text) return text;
    const ptText = TRANSLATIONS['pt-BR'][key];
    if (ptText) return ptText;
    return fallback || key;
  };

  const changeLanguage = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    setCurrentLang(newLang);
  };

  const currentOption = SUPPORTED_LANGUAGES.find(l => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

  return {
    currentLang,
    currentOption,
    countryCode,
    isBrazil: isBrazilianCountry(countryCode),
    regionResolved,
    languages: SUPPORTED_LANGUAGES,
    t: translate,
    setLanguage: changeLanguage
  };
}
