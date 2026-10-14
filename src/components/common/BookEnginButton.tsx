import React, { useRef, useLayoutEffect, useState } from 'react';
import { BookEnginAnimatedBook } from './BookEnginAnimatedBook';

export interface BookEnginButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
}

export const BookEnginButton: React.FC<BookEnginButtonProps> = ({
  children,
  loading = false,
  loadingText,
  icon,
  variant = 'primary',
  disabled,
  onClick,
  style,
  className = '',
  ...props
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [lockedWidth, setLockedWidth] = useState<number | undefined>(undefined);

  // Trava a largura mínima do botão antes do loading para evitar qualquer salto de layout na interface
  useLayoutEffect(() => {
    if (!loading && buttonRef.current) {
      setLockedWidth(buttonRef.current.offsetWidth);
    }
  }, [loading, children]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (onClick) {
      onClick(e);
    }
  };

  // Cores por variante visual BookEngin
  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: loading ? '#0284c7' : 'linear-gradient(135deg, #0284c7, #0369a1)',
      color: '#ffffff',
      border: 'none',
      boxShadow: '0 2px 8px rgba(2, 132, 199, 0.28)'
    },
    success: {
      background: loading ? '#059669' : 'linear-gradient(135deg, #10b981, #059669)',
      color: '#ffffff',
      border: 'none',
      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.28)'
    },
    secondary: {
      background: '#f1f5f9',
      color: '#334155',
      border: '1px solid #cbd5e1'
    },
    outline: {
      background: 'transparent',
      color: '#0284c7',
      border: '1.5px solid #0284c7'
    },
    danger: {
      background: '#ef4444',
      color: '#ffffff',
      border: 'none'
    },
    ghost: {
      background: 'transparent',
      color: '#64748b',
      border: 'none'
    }
  };

  const currentVariant = variantStyles[variant] || variantStyles.primary;

  return (
    <button
      ref={buttonRef}
      type={props.type || 'button'}
      disabled={disabled || loading}
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        padding: '9px 16px',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 700,
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.15s ease',
        minWidth: lockedWidth ? `${lockedWidth}px` : undefined,
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        ...currentVariant,
        ...style
      }}
      className={`bookengin-btn ${className}`}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <>
          <BookEnginAnimatedBook size="micro" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  );
};
