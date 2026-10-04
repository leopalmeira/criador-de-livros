import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou erro:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 24,
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #fee2e2',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)',
          margin: '16px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 12
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: '#fef2f2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#991b1b' }}>
              {this.props.fallbackTitle || 'Houve um problema ao carregar este módulo'}
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b', maxWidth: 460 }}>
              {this.state.error?.message || 'Ocorreu um erro inesperado durante a renderização deste componente.'}
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              marginTop: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} /> Recarregar Módulo
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
