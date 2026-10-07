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

const STORAGE_KEY = 'kdp_preferred_lang';
const EVENT_NAME = 'kdp-language-changed';

export const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  'pt-BR': {
    // Header & Navbar
    'nav.slogan': 'Inteligência para o seu sucesso na Amazon',
    'nav.aiGuide': 'IA Guia do Autor',
    'nav.help': 'Configurações e Ajuda',
    'nav.proPlan': 'Plano Pro',
    'nav.logout': 'Sair',
    'nav.language': 'Idioma',

    // Hero Banner
    'hero.greeting': 'Olá, Leandro',
    'hero.welcome': 'Bem-vindo ao Book Intel KDP',
    'hero.description': 'Encontre nichos lucrativos, crie livros profissionais e publique diretamente na Amazon KDP sem sair da plataforma.',
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
    'footer.brand': 'Book Intel KDP v1.0',
    'footer.desc': 'Plataforma de Inteligência Editorial para Amazon KDP',
  },

  'en-US': {
    // Header & Navbar
    'nav.slogan': 'Intelligence for your Amazon publishing success',
    'nav.aiGuide': 'Author AI Mentor',
    'nav.help': 'Settings & Help',
    'nav.proPlan': 'Pro Plan',
    'nav.logout': 'Sign Out',
    'nav.language': 'Language',

    // Hero Banner
    'hero.greeting': 'Hello, Leandro',
    'hero.welcome': 'Welcome to Book Intel KDP',
    'hero.description': 'Discover high-demand niches, craft professional books, and publish straight to Amazon KDP right from your dashboard.',
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
    'footer.brand': 'Book Intel KDP v1.0',
    'footer.desc': 'Editorial Intelligence Platform for Amazon KDP',
  },

  'es-ES': {
    // Header & Navbar
    'nav.slogan': 'Inteligencia editorial para su éxito en Amazon',
    'nav.aiGuide': 'IA Mentor del Autor',
    'nav.help': 'Configuración y Ayuda',
    'nav.proPlan': 'Plan Pro',
    'nav.logout': 'Cerrar Sesión',
    'nav.language': 'Idioma',

    // Hero Banner
    'hero.greeting': 'Hola, Leandro',
    'hero.welcome': 'Bienvenido a Book Intel KDP',
    'hero.description': 'Descubra nichos de alta demanda, redacte libros profesionales y publique directamente en Amazon KDP sin salir de la plataforma.',
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
    'footer.brand': 'Book Intel KDP v1.0',
    'footer.desc': 'Plataforma de Inteligencia Editorial para Amazon KDP',
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
    'hero.welcome': 'Bienvenue sur Book Intel KDP',
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
    'footer.brand': 'Book Intel KDP v1.0',
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
    'hero.welcome': 'Willkommen bei Book Intel KDP',
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
    'footer.brand': 'Book Intel KDP v1.0',
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
    'hero.welcome': 'Добро пожаловать в Book Intel KDP',
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
    'footer.brand': 'Book Intel KDP v1.0',
    'footer.desc': 'Платформа редакционной аналитики для Amazon KDP',
  }
};

/**
 * Obtém o idioma selecionado atualmente do localStorage ou fallback para pt-BR
 */
export function getCurrentLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'pt-BR';
  const saved = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
  if (saved && TRANSLATIONS[saved]) {
    return saved;
  }
  return 'pt-BR';
}

/**
 * Define o novo idioma ativo, persiste e emite evento reativo para toda a aplicação
 */
export function setLanguage(lang: SupportedLanguage): void {
  if (!TRANSLATIONS[lang]) return;
  localStorage.setItem(STORAGE_KEY, lang);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { lang } }));
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
    languages: SUPPORTED_LANGUAGES,
    t: translate,
    setLanguage: changeLanguage
  };
}
