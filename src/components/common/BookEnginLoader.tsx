import React from 'react';
import { BookEnginAnimatedBook } from './BookEnginAnimatedBook';
import './BookEnginLoader.css';

export interface BookEnginLoaderProps {
  /**
   * Título principal da operação (ex: "Quase pronto...", "Escrevendo Capítulo 3...")
   */
  title?: string;
  /**
   * Mensagem contextual detalhada explicando o que a IA está realizando
   */
  message?: string;
  /**
   * Progresso real numérico (0 a 100), se mensurável. Se indefinido, utiliza barra de pulso indeterminada.
   */
  progress?: number;
  /**
   * Etapa atual e total (ex: currentStep={3}, totalSteps={8} -> "Etapa 3 de 8")
   */
  currentStep?: number;
  totalSteps?: number;
  /**
   * Variante visual do loader:
   * - 'button': ultra compacto para caber dentro de botões sem quebrar o layout.
   * - 'inline': bloco elegante pequeno/médio na área onde foi clicado.
   * - 'overlay': sobreposição restrita ao card/container pai.
   * - 'fullscreen': sobreposição de tela inteira para finalização total.
   */
  variant?: 'button' | 'inline' | 'overlay' | 'fullscreen';
  /**
   * Tamanho do livro animado
   */
  size?: 'micro' | 'sm' | 'md' | 'lg';
  /**
   * Texto de rodapé opcional
   */
  footerNote?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const BookEnginLoader: React.FC<BookEnginLoaderProps> = ({
  title = 'Quase pronto...',
  message = 'Estamos gerando seu livro, criando imagens, textos ou processando suas revisões.',
  progress,
  currentStep,
  totalSteps,
  variant = 'inline',
  size,
  footerNote = 'Isso pode levar alguns instantes. Obrigado pela sua paciência!',
  className = '',
  style
}) => {
  // Tamanho do livro padrão por variante
  const computedSize = size || (variant === 'button' ? 'micro' : variant === 'inline' ? 'md' : 'md');

  // 1. VARIANTE BOTÃO (ULTRA COMPACTA)
  if (variant === 'button') {
    return (
      <span
        className={`bookengin-loader-button ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          verticalAlign: 'middle',
          ...style
        }}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <BookEnginAnimatedBook size="micro" />
        <span style={{ fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit' }}>
          {title || message || 'Processando...'}
        </span>
      </span>
    );
  }

  // 2. CONTEÚDO PADRÃO COM LIVRO, TÍTULO, MENSAGEM E BARRA DE PROGRESSO
  const loaderCard = (
    <div
      className={`bookengin-loader-content ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        maxWidth: 480,
        width: '100%',
        padding: variant === 'inline' ? '18px 20px' : '28px 24px',
        borderRadius: 16,
        background: variant === 'inline' ? 'rgba(15, 23, 42, 0.94)' : 'transparent',
        boxShadow: variant === 'inline' ? '0 10px 30px rgba(0, 0, 0, 0.35)' : 'none',
        border: variant === 'inline' ? '1px solid rgba(56, 189, 248, 0.25)' : 'none',
        color: '#ffffff',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        boxSizing: 'border-box',
        ...style
      }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {/* LIVRO ABERTO COM PÁGINAS VIRANDO E CANETA */}
      <BookEnginAnimatedBook size={computedSize} style={{ marginBottom: 12 }} />

      {/* INDICADOR DE ETAPA (SE HOUVER) */}
      {currentStep !== undefined && totalSteps !== undefined && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#38bdf8',
            background: 'rgba(2, 132, 199, 0.22)',
            padding: '3px 10px',
            borderRadius: 999,
            marginBottom: 8,
            border: '1px solid rgba(56, 189, 248, 0.3)'
          }}
        >
          Etapa {currentStep} de {totalSteps}
        </span>
      )}

      {/* TÍTULO DA OPERAÇÃO */}
      <h3
        style={{
          margin: '0 0 6px',
          fontSize: variant === 'inline' ? 17 : 20,
          fontWeight: 800,
          color: '#ffffff',
          letterSpacing: '-0.01em',
          lineHeight: 1.3
        }}
      >
        {title}
      </h3>

      {/* MENSAGEM CONTEXTUAL */}
      {message && (
        <p
          style={{
            margin: '0 0 16px',
            fontSize: variant === 'inline' ? 13 : 14,
            color: '#cbd5e1',
            lineHeight: 1.5,
            maxWidth: 420
          }}
        >
          {message}
        </p>
      )}

      {/* BARRA DE PROGRESSO BOOKENGIN GLOW */}
      <div
        className="bookengin-progress-track"
        style={{ maxWidth: 320, width: '100%', marginBottom: footerNote ? 12 : 0 }}
      >
        {typeof progress === 'number' && progress >= 0 && progress <= 100 ? (
          <div
            className="bookengin-progress-fill-determinate"
            style={{ width: `${Math.max(4, progress)}%` }}
          />
        ) : (
          <div className="bookengin-progress-fill-indeterminate" />
        )}
      </div>

      {/* NOTA DE RODAPÉ INFORMATIVA */}
      {footerNote && (
        <span
          style={{
            fontSize: 11.5,
            color: '#94a3b8',
            fontStyle: 'normal'
          }}
        >
          {footerNote}
        </span>
      )}
    </div>
  );

  // 3. VARIANTE OVERLAY (RESTRITA AO CONTAINER DA ÁREA ONDE FOI CLICADO)
  if (variant === 'overlay') {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 50,
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          borderRadius: 'inherit',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {loaderCard}
      </div>
    );
  }

  // 4. VARIANTE FULLSCREEN (TELA INTEIRA COM BACKDROP BLUR)
  if (variant === 'fullscreen') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'rgba(11, 19, 43, 0.92)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          animation: 'fadeIn 0.25s ease-out'
        }}
      >
        {loaderCard}
      </div>
    );
  }

  // 5. VARIANTE INLINE (PADRÃO: NA ÁREA ONDE FOI CLICADO)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 0',
        width: '100%'
      }}
    >
      {loaderCard}
    </div>
  );
};
