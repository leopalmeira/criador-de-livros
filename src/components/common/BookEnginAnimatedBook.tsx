import React from 'react';
import './BookEnginLoader.css';

export interface BookEnginAnimatedBookProps {
  size?: 'micro' | 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}

export const BookEnginAnimatedBook: React.FC<BookEnginAnimatedBookProps> = ({
  size = 'md',
  className = '',
  style
}) => {
  // Tamanho MICRO: Ideal para dentro de botões compactos
  if (size === 'micro') {
    return (
      <span
        className={`bookengin-btn-mini-book ${className}`}
        style={{ width: 20, height: 20, ...style }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
          {/* Capa do Livro Aberto */}
          <path
            d="M3 18.5C3 17.5 4 16.5 6 16.5H12V5H6C4 5 3 6 3 7.5V18.5Z"
            fill="#0369a1"
            stroke="#38bdf8"
            strokeWidth="1.2"
          />
          <path
            d="M21 18.5C21 17.5 20 16.5 18 16.5H12V5H18C20 5 21 6 21 7.5V18.5Z"
            fill="#0284c7"
            stroke="#38bdf8"
            strokeWidth="1.2"
          />
          {/* Páginas Internas */}
          <path
            d="M4.5 17C5.5 17 8 16.5 11.5 16.5V6C8 6 5.5 6.5 4.5 7V17Z"
            fill="#f8fafc"
          />
          <path
            d="M19.5 17C18.5 17 16 16.5 12.5 16.5V6C16 6 18.5 6.5 19.5 7V17Z"
            fill="#ffffff"
          />
          {/* Página virando no centro */}
          <path
            className="bookengin-btn-mini-page"
            d="M12 6C14 6 16 8 17 11C16 14 14 16.5 12 16.5V6Z"
            fill="#e2e8f0"
            stroke="#94a3b8"
            strokeWidth="0.6"
          />
          {/* Canetinha escrevendo na página direita */}
          <g className="bookengin-btn-mini-pen">
            <line x1="14" y1="9" x2="18" y2="9" stroke="#cbd5e1" strokeWidth="1" strokeLinecap="round" />
            <line x1="14" y1="12" x2="17" y2="12" stroke="#38bdf8" strokeWidth="1" strokeLinecap="round" />
            {/* Caneta */}
            <path d="M18 5L15 12L14 14L16 13L19 7L18 5Z" fill="#f59e0b" />
            <path d="M14 14L13.5 14.5L14.5 14L14 14Z" fill="#0f172a" />
          </g>
        </svg>
      </span>
    );
  }

  // Dimensões proporcionais por tamanho
  const dimensions = {
    sm: { width: 44, height: 40 },
    md: { width: 140, height: 110 },
    lg: { width: 220, height: 165 }
  }[size] || { width: 140, height: 110 };

  return (
    <div
      className={`bookengin-book-wrapper ${className}`}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        ...style
      }}
      aria-hidden="true"
    >
      {/* 1. Efeitos de Iluminação e Aura BookEngin */}
      <div className="bookengin-aura-blue" />
      <div className="bookengin-spine-glow" />

      {/* 2. SVG Principal do Livro em Perspectiva */}
      <svg
        viewBox="0 0 200 150"
        width="100%"
        height="100%"
        fill="none"
        style={{ overflow: 'visible', filter: 'drop-shadow(0 12px 24px rgba(2, 6, 23, 0.45))' }}
      >
        <defs>
          {/* Gradientes da Capa Azul BookEngin */}
          <linearGradient id="bookCoverLeft" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0c4a6e" />
            <stop offset="70%" stopColor="#0369a1" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>

          <linearGradient id="bookCoverRight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="60%" stopColor="#0369a1" />
            <stop offset="100%" stopColor="#075985" />
          </linearGradient>

          {/* Gradientes das Páginas (Marfim suave + brilho de papel nobre) */}
          <linearGradient id="pagePaperLeft" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f1f5f9" />
            <stop offset="70%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#fef3c7" stopOpacity="0.85" />
          </linearGradient>

          <linearGradient id="pagePaperRight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.95" />
            <stop offset="30%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f8fafc" />
          </linearGradient>

          {/* Gradiente da Página no Ar (Virando) */}
          <linearGradient id="pageTurning" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="50%" stopColor="#fef3c7" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>

          {/* Gradiente da Caneta Dourada e Azul */}
          <linearGradient id="penBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="40%" stopColor="#0284c7" />
            <stop offset="80%" stopColor="#0f172a" />
          </linearGradient>

          <linearGradient id="penGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="50%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>

        {/* ── ARCOS DE BRILHO AZUL CYAN NA PARTE TRASEIRA ── */}
        <path
          d="M35 55 C 30 40, 50 25, 75 28"
          stroke="#38bdf8"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeOpacity="0.45"
          filter="blur(0.5px)"
        />
        <path
          d="M125 28 C 150 25, 170 40, 165 55"
          stroke="#38bdf8"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeOpacity="0.45"
          filter="blur(0.5px)"
        />

        {/* ── CAPA DURA EXTERNA (PERSPECTIVA ISOMÉTRICA) ── */}
        {/* Capa Esquerda */}
        <path
          d="M15 106 C 25 108, 65 115, 100 114 L 100 95 C 65 96, 25 89, 17 87 Z"
          fill="#082f49"
          opacity="0.9"
        />
        <path
          d="M17 87 C 25 89, 65 96, 100 95 L 100 38 C 65 37, 25 30, 17 32 Z"
          fill="url(#bookCoverLeft)"
          stroke="#38bdf8"
          strokeWidth="1.2"
        />

        {/* Capa Direita */}
        <path
          d="M100 114 C 135 115, 175 108, 185 106 L 183 87 C 175 89, 135 96, 100 95 Z"
          fill="#082f49"
          opacity="0.9"
        />
        <path
          d="M100 95 C 135 96, 175 89, 183 87 L 183 32 C 175 30, 135 37, 100 38 Z"
          fill="url(#bookCoverRight)"
          stroke="#38bdf8"
          strokeWidth="1.2"
        />

        {/* Lombada Inferior Central */}
        <path
          d="M95 114 C 98 116, 102 116, 105 114 L 105 95 C 102 97, 98 97, 95 95 Z"
          fill="#0369a1"
        />

        {/* ── BLOCO DE PÁGINAS EMPILHADAS (BORDA INFERIOR 3D) ── */}
        <path
          d="M20 86 C 30 89, 68 95, 100 94 C 132 95, 170 89, 180 86 L 178 82 C 168 85, 132 91, 100 90 C 68 91, 32 85, 22 82 Z"
          fill="#e2e8f0"
        />
        <path
          d="M22 82 C 32 85, 68 91, 100 90 C 132 91, 168 85, 178 82 L 176 78 C 166 81, 132 87, 100 86 C 68 87, 34 81, 24 78 Z"
          fill="#cbd5e1"
        />

        {/* ── PÁGINA ESQUERDA ABERTA (COM TEXTO ESCRITO) ── */}
        <path
          d="M100 91 C 66 91, 32 84, 23 80 L 25 35 C 34 38, 68 44, 100 42 Z"
          fill="url(#pagePaperLeft)"
          stroke="#e2e8f0"
          strokeWidth="0.8"
        />
        {/* Linhas de texto estáticas na página esquerda */}
        <line x1="38" y1="46" x2="88" y2="48" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="37" y1="53" x2="86" y2="55" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="39" y1="60" x2="89" y2="62" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="40" y1="67" x2="78" y2="69" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="42" y1="74" x2="85" y2="76" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" />

        {/* ── PÁGINA DIREITA ABERTA (ONDE A CANETA ESCREVE) ── */}
        <path
          d="M100 42 C 132 44, 166 38, 175 35 L 177 80 C 168 84, 134 91, 100 91 Z"
          fill="url(#pagePaperRight)"
          stroke="#e2e8f0"
          strokeWidth="0.8"
        />
        {/* Linhas de texto progressivas (animadas) */}
        <line className="bookengin-line-write-1" x1="112" y1="48" x2="162" y2="46" stroke="#0284c7" strokeWidth="1.8" strokeLinecap="round" />
        <line className="bookengin-line-write-2" x1="113" y1="55" x2="164" y2="53" stroke="#0284c7" strokeWidth="1.8" strokeLinecap="round" />
        <line className="bookengin-line-write-3" x1="112" y1="62" x2="158" y2="60" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
        <line className="bookengin-line-write-4" x1="114" y1="69" x2="150" y2="67" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />

        {/* ── PÁGINAS EM PROCESSO DE VIRAR (FOLHEANDO O LIVRO SUAVEMENTE) ── */}
        <g className="bookengin-page-flip-1">
          <path
            d="M100 42 C 108 34, 122 28, 138 34 C 130 52, 118 72, 100 91 Z"
            fill="url(#pageTurning)"
            stroke="#cbd5e1"
            strokeWidth="0.8"
            opacity="0.95"
          />
        </g>
        <g className="bookengin-page-flip-2">
          <path
            d="M100 42 C 94 32, 85 24, 72 28 C 80 48, 90 70, 100 91 Z"
            fill="url(#pageTurning)"
            stroke="#cbd5e1"
            strokeWidth="0.8"
            opacity="0.9"
          />
        </g>

        {/* ── MÃO E CANETA ESCREVENDO COM PRECISÃO ── */}
        <g className="bookengin-writing-hand">
          {/* Sombra suave projetada pela mão e caneta na página */}
          <ellipse cx="140" cy="74" rx="14" ry="4" fill="rgba(15, 23, 42, 0.15)" filter="blur(2px)" />

          {/* Caneta Executiva */}
          {/* Ponta de escrita dourada tocando a linha */}
          <polygon points="135,72 138,65 133,66" fill="url(#penGold)" />
          <circle cx="134.5" cy="72.5" r="1" fill="#0284c7" />

          {/* Anel Dourado Metálico */}
          <rect x="137" y="62" width="7" height="3" rx="1" fill="url(#penGold)" transform="rotate(-38 140 63)" />

          {/* Corpo da Caneta Azul Marinho/Dourado */}
          <rect
            x="140"
            y="35"
            width="7.5"
            height="30"
            rx="2.5"
            fill="url(#penBody)"
            stroke="url(#penGold)"
            strokeWidth="0.6"
            transform="rotate(-38 143 50)"
          />

          {/* Clipe metálico da caneta */}
          <line
            x1="152"
            y1="38"
            x2="146"
            y2="46"
            stroke="#fef08a"
            strokeWidth="1.2"
            strokeLinecap="round"
          />

          {/* Mão Estilizada Segurando a Caneta */}
          {/* Dedo indicador */}
          <path
            d="M142 56 C 146 54, 154 58, 158 64 C 160 67, 157 71, 152 70 C 147 69, 143 64, 142 56 Z"
            fill="#fbcfe8"
            opacity="0.9"
          />
          {/* Polegar e mão em perspectiva */}
          <ellipse
            cx="156"
            cy="58"
            rx="10"
            ry="7.5"
            fill="#fbcfe8"
            transform="rotate(-20 156 58)"
          />
          {/* Manga da roupa azul executiva (conforme imagem) */}
          <path
            d="M162 48 C 166 45, 178 50, 185 58 L 180 66 C 174 60, 164 56, 162 48 Z"
            fill="#1e3a8a"
            stroke="#3b82f6"
            strokeWidth="1"
          />
        </g>
      </svg>
    </div>
  );
};
