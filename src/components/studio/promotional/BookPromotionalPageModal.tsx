import React, { useState } from 'react';
import {
  X, Monitor, Smartphone, Sparkles, RefreshCw,
  Download, Image as ImageIcon, Check, Printer, FileCode
} from 'lucide-react';
import { BookPromotionalPageData } from '../../../types/promotional-page';
import { BookPromotionalPage } from './BookPromotionalPage';
import {
  gerarConteudoPaginaPromocional,
  gerarImagemPromocionalNarrativa
} from '../../../services/kdp-ai-engine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialData: BookPromotionalPageData;
  onSave?: (updated: BookPromotionalPageData) => void;
}

export const BookPromotionalPageModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialData,
  onSave
}) => {
  const [data, setData] = useState<BookPromotionalPageData>(initialData);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isRegeneratingText, setIsRegeneratingText] = useState(false);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleUpdateField = (field: keyof BookPromotionalPageData, val: any) => {
    const updated = { ...data, [field]: val, lastUpdatedAt: Date.now() };
    setData(updated);
    if (onSave) onSave(updated);
  };

  // Regenerar textos completos com Gemini
  const handleRegenerateTexts = async () => {
    setIsRegeneratingText(true);
    try {
      showToast('✨ Gerando nova versão editorial com Gemini...');
      const novosDados = await gerarConteudoPaginaPromocional(
        {
          title: data.title,
          subtitle: data.subtitle,
          author: data.author,
          genre: data.genre,
          topic: data.synopsis
        },
        data.coverImageUrl,
        data.promotionalImageUrl
      );
      setData(novosDados);
      if (onSave) onSave(novosDados);
      showToast('✓ Textos da página promocional atualizados com sucesso!');
    } catch (err: any) {
      alert(`Erro ao regenerar textos: ${err.message}`);
    } finally {
      setIsRegeneratingText(false);
    }
  };

  // Regenerar imagem promocional com Imagen 3
  const handleRegenerateImage = async () => {
    setIsRegeneratingImage(true);
    try {
      showToast('🎨 Criando nova cena narrativa com Imagen 3...');
      const novaImg = await gerarImagemPromocionalNarrativa({
        title: data.title,
        genre: data.genre,
        topic: data.synopsis
      });
      const updated = { ...data, promotionalImageUrl: novaImg, lastUpdatedAt: Date.now() };
      setData(updated);
      if (onSave) onSave(updated);
      showToast('✓ Imagem promocional atualizada!');
    } catch (err: any) {
      alert(`Erro ao gerar imagem: ${err.message}`);
    } finally {
      setIsRegeneratingImage(false);
    }
  };

  // Upload manual de imagem substituta
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const updated = { ...data, promotionalImageUrl: url, lastUpdatedAt: Date.now() };
      setData(updated);
      if (onSave) onSave(updated);
      showToast('✓ Imagem promocional substituída.');
    };
    reader.readAsDataURL(file);
  };

  // Exportar HTML standalone completo
  const handleExportHTML = () => {
    const theme = data.genreTheme;
    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title} — Página Promocional Oficial</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,400;1,600&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: ${theme.bodyBg};
      color: ${theme.textPrimary};
      font-family: ${theme.fontFamilyBody};
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      padding: 40px 20px;
    }
    .wrapper {
      max-width: 1040px;
      margin: 0 auto;
      position: relative;
    }
    .hero {
      display: grid;
      grid-template-columns: 340px 1fr;
      gap: 48px;
      align-items: center;
      margin-bottom: 64px;
    }
    @media (max-width: 800px) {
      .hero { grid-template-columns: 1fr; text-align: center; }
    }
    .cover-box img {
      width: 100%;
      border-radius: 8px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.8);
      display: block;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      background: ${theme.atmosphereBadgeBg};
      color: ${theme.atmosphereBadgeColor};
      margin-bottom: 16px;
    }
    h1 {
      font-family: ${theme.fontFamilyTitle};
      font-size: 2.8rem;
      line-height: 1.1;
      margin-bottom: 12px;
    }
    .subtitle {
      font-size: 1.25rem;
      font-style: italic;
      color: ${theme.textSecondary};
      margin-bottom: 20px;
    }
    .author {
      font-size: 0.95rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-bottom: 24px;
      color: ${theme.textSecondary};
    }
    .hook {
      padding: 16px;
      border-left: 3px solid ${theme.accentColor};
      background: rgba(255,255,255,0.03);
      font-size: 0.95rem;
      border-radius: 6px;
    }
    .card {
      background: ${theme.cardBg};
      border: 1px solid ${theme.borderColor};
      border-radius: 12px;
      padding: 36px;
      margin: 48px 0;
    }
    .card h2 {
      font-family: ${theme.fontFamilyTitle};
      font-size: 1.6rem;
      margin-bottom: 16px;
    }
    .card p {
      font-size: 1.05rem;
      color: ${theme.textSecondary};
      line-height: 1.7;
    }
    .quote {
      text-align: center;
      margin: 64px 0;
      font-family: ${theme.fontFamilyTitle};
      font-size: 2rem;
      font-style: italic;
      max-width: 800px;
      margin-left: auto;
      margin-right: auto;
    }
    .grid3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin: 56px 0;
    }
    @media (max-width: 768px) {
      .grid3 { grid-template-columns: 1fr; }
    }
    .grid3 .tile {
      background: ${theme.cardBg};
      border: 1px solid ${theme.borderColor};
      padding: 24px;
      border-radius: 10px;
    }
    .grid3 .tile h3 {
      color: ${theme.accentColor};
      font-size: 1.15rem;
      margin-bottom: 6px;
    }
    .grid3 .tile .sub {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: ${theme.textSecondary};
      margin-bottom: 10px;
    }
    .promo-img img {
      width: 100%;
      aspect-ratio: 16 / 9;
      object-fit: cover;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.7);
      display: block;
      margin: 56px 0;
    }
    .experience {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 36px;
      margin: 56px 0;
      align-items: center;
    }
    @media (max-width: 768px) {
      .experience { grid-template-columns: 1fr; }
    }
    .experience h3 {
      font-family: ${theme.fontFamilyTitle};
      font-size: 1.8rem;
      margin-bottom: 12px;
    }
    .items {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .items li {
      padding: 10px 14px;
      background: rgba(255,255,255,0.03);
      border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.06);
      font-size: 0.95rem;
    }
    .closing {
      text-align: center;
      padding: 56px 24px;
      background: ${theme.cardBg};
      border: 1px solid ${theme.borderColor};
      border-radius: 14px;
      margin-top: 64px;
    }
    .closing h2 {
      font-family: ${theme.fontFamilyTitle};
      font-size: 2.2rem;
      margin-bottom: 24px;
    }
    .cta-btn {
      display: inline-block;
      background: ${theme.accentGradient};
      color: #fff;
      font-weight: 700;
      text-decoration: none;
      padding: 16px 42px;
      border-radius: 50px;
      font-size: 1.05rem;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }
    .badges {
      margin-top: 18px;
      font-size: 0.85rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: ${theme.textSecondary};
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="hero">
      <div class="cover-box">
        <img src="${data.coverImageUrl}" alt="${data.title}">
      </div>
      <div>
        <span class="badge">${data.genre} • ${theme.moodTag}</span>
        <h1>${data.title}</h1>
        <div class="subtitle">${data.subtitle}</div>
        <div class="author">Uma obra por <strong>${data.author}</strong></div>
        <div class="hook">${data.heroHook}</div>
      </div>
    </div>

    <div class="card">
      <h2>${data.headline}</h2>
      <p>${data.synopsis}</p>
    </div>

    <div class="quote">“${data.impactQuote}”</div>

    <div class="grid3">
      ${(data.features || []).map(f => `
        <div class="tile">
          <h3>${f.title}</h3>
          <div class="sub">${f.subtitle}</div>
          <p>${f.description}</p>
        </div>
      `).join('')}
    </div>

    ${data.promotionalImageUrl ? `
      <div class="promo-img">
        <img src="${data.promotionalImageUrl}" alt="Arte Narrativa Promocional">
      </div>
    ` : ''}

    <div class="experience">
      <div>
        <h3>${data.experienceTitle}</h3>
        <p style="color: ${theme.textSecondary};">${data.experienceDescription}</p>
      </div>
      <ul class="items">
        ${(data.experienceItems || []).map(i => `<li>• ${i}</li>`).join('')}
      </ul>
    </div>

    <div class="closing">
      <h2>${data.closingQuestion}</h2>
      <a href="https://kdp.amazon.com" class="cta-btn">${data.closingCtaText}</a>
      <div class="badges">${data.closingBadges}</div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.title.replace(/\s+/g, '_')}_promocional.html`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('📥 Arquivo HTML promocional baixado com sucesso!');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* BARRA SUPERIOR DO MODAL */}
      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
            ✨ Página Promocional do Livro
          </span>
          <span
            style={{
              fontSize: 12,
              padding: '3px 8px',
              borderRadius: 6,
              background: '#f1f5f9',
              color: '#64748b'
            }}
          >
            {data.genre}
          </span>
        </div>

        {/* CONTROLES CENTRAIS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Alternância Desktop / Mobile */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: 3, borderRadius: 8 }}>
            <button
              onClick={() => setViewMode('desktop')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                border: 'none',
                borderRadius: 6,
                background: viewMode === 'desktop' ? '#ffffff' : 'transparent',
                color: viewMode === 'desktop' ? '#0f172a' : '#64748b',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
                boxShadow: viewMode === 'desktop' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <Monitor size={14} /> Desktop
            </button>
            <button
              onClick={() => setViewMode('mobile')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                border: 'none',
                borderRadius: 6,
                background: viewMode === 'mobile' ? '#ffffff' : 'transparent',
                color: viewMode === 'mobile' ? '#0f172a' : '#64748b',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
                boxShadow: viewMode === 'mobile' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <Smartphone size={14} /> Mobile
            </button>
          </div>

          {/* Regenerar Textos */}
          <button
            onClick={handleRegenerateTexts}
            disabled={isRegeneratingText}
            className="promo-btn-tool"
          >
            <Sparkles size={14} color="#7c3aed" />
            {isRegeneratingText ? 'Regenerando...' : 'Regenerar Textos'}
          </button>

          {/* Regenerar Imagem */}
          <button
            onClick={handleRegenerateImage}
            disabled={isRegeneratingImage}
            className="promo-btn-tool"
          >
            <ImageIcon size={14} color="#0284c7" />
            {isRegeneratingImage ? 'Gerando Imagem...' : 'Regenerar Imagem'}
          </button>

          {/* Upload Imagem */}
          <label className="promo-btn-tool" style={{ cursor: 'pointer' }}>
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
            Trocar Imagem
          </label>

          {/* Exportar HTML */}
          <button onClick={handleExportHTML} className="promo-btn-tool primary">
            <Download size={14} /> Baixar HTML
          </button>

          {/* Imprimir */}
          <button onClick={() => window.print()} className="promo-btn-tool">
            <Printer size={14} /> Imprimir / PDF
          </button>
        </div>

        {/* FECHAR */}
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: 6,
            borderRadius: 6
          }}
          title="Fechar Visualização"
        >
          <X size={20} />
        </button>
      </header>

      {/* ÁREA DE SCROLL COM O COMPONENTE RENDERIZADO */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '32px 16px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start'
        }}
      >
        <BookPromotionalPage
          data={data}
          viewMode={viewMode}
          isEditable={true}
          onUpdateField={handleUpdateField}
        />
      </div>

      {/* TOAST FLUTUANTE */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#0f172a',
            color: '#f8fafc',
            padding: '12px 20px',
            borderRadius: 8,
            boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
            fontSize: 14,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            zIndex: 10000,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <Check size={16} color="#10b981" />
          {toastMessage}
        </div>
      )}
    </div>
  );
};
