import React from 'react';
import { BookPromotionalPageData } from '../../../types/promotional-page';
import '../../../styles/book-promotional-page.css';
import { Sparkles, BookOpen, Check, ExternalLink } from 'lucide-react';

interface Props {
  data: BookPromotionalPageData;
  viewMode?: 'desktop' | 'mobile';
  isEditable?: boolean;
  onUpdateField?: (field: keyof BookPromotionalPageData, value: any) => void;
}

export const BookPromotionalPage: React.FC<Props> = ({
  data,
  viewMode = 'desktop',
  isEditable = false,
  onUpdateField
}) => {
  const { genreTheme } = data;

  const handleTextChange = (field: keyof BookPromotionalPageData, val: string) => {
    if (isEditable && onUpdateField) {
      onUpdateField(field, val);
    }
  };

  return (
    <div
      className={`promotional-page-container ${viewMode === 'mobile' ? 'mobile-view' : 'desktop-view'}`}
      style={{
        backgroundColor: genreTheme.bodyBg,
        color: genreTheme.textPrimary,
        fontFamily: genreTheme.fontFamilyBody
      }}
    >
      {/* BACKGROUND COM TEXTURA E CAPA DESFOCADA */}
      <div className="promo-backdrop">
        {data.coverImageUrl && (
          <div
            className="promo-backdrop-image"
            style={{ backgroundImage: `url('${data.coverImageUrl}')` }}
          />
        )}
        <div className="promo-backdrop-overlay" />
      </div>

      <div className="promo-content-wrapper">
        {/* 1. HERO PRINCIPAL */}
        <section className="promo-hero-section">
          <div className="promo-cover-display">
            {data.coverImageUrl ? (
              <img
                src={data.coverImageUrl}
                alt={data.title}
                className="promo-cover-image"
              />
            ) : (
              <div
                className="promo-cover-image"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: genreTheme.cardBg,
                  border: `1px solid ${genreTheme.borderColor}`,
                  flexDirection: 'column',
                  gap: 12
                }}
              >
                <BookOpen size={48} color={genreTheme.accentColor} />
                <span style={{ fontSize: '0.85rem', color: genreTheme.textSecondary }}>Capa da Obra</span>
              </div>
            )}
          </div>

          <div className="promo-hero-text">
            <span
              className="promo-genre-badge"
              style={{
                background: genreTheme.atmosphereBadgeBg,
                color: genreTheme.atmosphereBadgeColor
              }}
            >
              <Sparkles size={13} /> {data.genre} • {genreTheme.moodTag}
            </span>

            <h1
              className="promo-hero-title"
              style={{ fontFamily: genreTheme.fontFamilyTitle }}
              contentEditable={isEditable}
              suppressContentEditableWarning
              onBlur={(e) => handleTextChange('title', e.currentTarget.innerText)}
            >
              {data.title}
            </h1>

            {data.subtitle && (
              <div
                className="promo-hero-subtitle"
                contentEditable={isEditable}
                suppressContentEditableWarning
                onBlur={(e) => handleTextChange('subtitle', e.currentTarget.innerText)}
              >
                {data.subtitle}
              </div>
            )}

            <div className="promo-author-row" style={{ color: genreTheme.textSecondary }}>
              <span>UMA OBRA POR</span>
              <strong style={{ color: genreTheme.textPrimary }}>{data.author}</strong>
            </div>

            {data.heroHook && (
              <div
                className="promo-hook-box"
                style={{
                  borderColor: genreTheme.accentColor,
                  color: genreTheme.textPrimary
                }}
                contentEditable={isEditable}
                suppressContentEditableWarning
                onBlur={(e) => handleTextChange('heroHook', e.currentTarget.innerText)}
              >
                {data.heroHook}
              </div>
            )}
          </div>
        </section>

        {/* 2. APRESENTAÇÃO DO LIVRO */}
        <section
          className="promo-presentation-section"
          style={{
            backgroundColor: genreTheme.cardBg,
            borderColor: genreTheme.borderColor
          }}
        >
          <h2
            className="promo-presentation-headline"
            style={{
              fontFamily: genreTheme.fontFamilyTitle,
              color: genreTheme.textPrimary
            }}
            contentEditable={isEditable}
            suppressContentEditableWarning
            onBlur={(e) => handleTextChange('headline', e.currentTarget.innerText)}
          >
            {data.headline}
          </h2>
          <p
            className="promo-presentation-synopsis"
            style={{ color: genreTheme.textSecondary }}
            contentEditable={isEditable}
            suppressContentEditableWarning
            onBlur={(e) => handleTextChange('synopsis', e.currentTarget.innerText)}
          >
            {data.synopsis}
          </p>
        </section>

        {/* 3. FRASE DE IMPACTO */}
        {data.impactQuote && (
          <section className="promo-impact-section">
            <blockquote
              className="promo-impact-quote"
              style={{
                fontFamily: genreTheme.fontFamilyTitle,
                color: genreTheme.textPrimary
              }}
              contentEditable={isEditable}
              suppressContentEditableWarning
              onBlur={(e) => handleTextChange('impactQuote', e.currentTarget.innerText)}
            >
              {data.impactQuote}
            </blockquote>
          </section>
        )}

        {/* 4. CARACTERÍSTICAS DO LIVRO (3 CARDS) */}
        {data.features && data.features.length > 0 && (
          <section className="promo-features-grid">
            {data.features.map((feat, idx) => (
              <div
                key={idx}
                className="promo-feature-card"
                style={{
                  backgroundColor: genreTheme.cardBg,
                  borderColor: genreTheme.borderColor
                }}
              >
                <div
                  className="promo-feature-title"
                  style={{ color: genreTheme.accentColor }}
                >
                  {feat.title}
                </div>
                <div
                  className="promo-feature-subtitle"
                  style={{ color: genreTheme.textSecondary }}
                >
                  {feat.subtitle}
                </div>
                <p
                  className="promo-feature-desc"
                  style={{ color: genreTheme.textPrimary }}
                >
                  {feat.description}
                </p>
              </div>
            ))}
          </section>
        )}

        {/* 5. IMAGEM PROMOCIONAL NARRATIVA */}
        {data.promotionalImageUrl && (
          <section className="promo-narrative-image-section">
            <img
              src={data.promotionalImageUrl}
              alt="Cena Narrativa Promocional"
              className="promo-narrative-image"
            />
            <div className="promo-narrative-caption">
              <span>Arte Conceitual & Atmosfera Original • {data.title}</span>
            </div>
          </section>
        )}

        {/* 6. EXPERIÊNCIA / UNIVERSO DO LIVRO */}
        <section className="promo-experience-section">
          <div>
            <h3
              className="promo-experience-title"
              style={{
                fontFamily: genreTheme.fontFamilyTitle,
                color: genreTheme.textPrimary
              }}
              contentEditable={isEditable}
              suppressContentEditableWarning
              onBlur={(e) => handleTextChange('experienceTitle', e.currentTarget.innerText)}
            >
              {data.experienceTitle}
            </h3>
            {data.experienceDescription && (
              <p
                className="promo-experience-text"
                style={{ color: genreTheme.textSecondary }}
                contentEditable={isEditable}
                suppressContentEditableWarning
                onBlur={(e) => handleTextChange('experienceDescription', e.currentTarget.innerText)}
              >
                {data.experienceDescription}
              </p>
            )}
          </div>

          <ul className="promo-experience-items-list">
            {(data.experienceItems || []).map((item, idx) => (
              <li
                key={idx}
                className="promo-experience-item"
                style={{ color: genreTheme.textPrimary }}
              >
                <span
                  className="promo-item-bullet"
                  style={{ backgroundColor: genreTheme.accentColor }}
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 7. ENCERRAMENTO & CTA */}
        <section
          className="promo-closing-section"
          style={{
            backgroundColor: genreTheme.cardBg,
            borderColor: genreTheme.borderColor
          }}
        >
          <div
            className="promo-closing-question"
            style={{
              fontFamily: genreTheme.fontFamilyTitle,
              color: genreTheme.textPrimary
            }}
            contentEditable={isEditable}
            suppressContentEditableWarning
            onBlur={(e) => handleTextChange('closingQuestion', e.currentTarget.innerText)}
          >
            {data.closingQuestion}
          </div>

          <a
            href="https://kdp.amazon.com"
            target="_blank"
            rel="noopener noreferrer"
            className="promo-cta-button"
            style={{
              background: genreTheme.accentGradient,
              color: '#ffffff'
            }}
          >
            <BookOpen size={18} /> {data.closingCtaText} <ExternalLink size={16} />
          </a>

          {data.closingBadges && (
            <div
              className="promo-closing-badges"
              style={{ color: genreTheme.textSecondary }}
            >
              {data.closingBadges}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
