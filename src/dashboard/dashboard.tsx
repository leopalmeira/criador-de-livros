import React from 'react';
import { createRoot } from 'react-dom/client';
import '../components/studio/book-studio.css';
import { BookStudioApp } from '../components/studio/BookStudioApp';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { BookEnginLoadingProvider } from '../components/common/BookEnginLoadingContext';

// Polyfill de resiliência DOM: previne quebras com Google Tradutor e extensões do Chrome
// que alteram TextNodes em tempo real e causam o erro 'insertBefore / removeChild' no React.
if (typeof window !== 'undefined' && typeof Node !== 'undefined') {
  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      return this.appendChild(newNode);
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child && child.parentNode !== this) {
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };
}

export const DashboardApp: React.FC = () => (
  <ErrorBoundary fallbackTitle="Painel Editorial BookEngin" onReset={() => window.location.reload()}>
    <BookEnginLoadingProvider>
      <BookStudioApp />
    </BookEnginLoadingProvider>
  </ErrorBoundary>
);

const dashboardContainer = document.getElementById('dashboard-root')!;
const hotData = import.meta.hot?.data as { dashboardRoot?: ReturnType<typeof createRoot> } | undefined;
const root = hotData?.dashboardRoot || createRoot(dashboardContainer);
if (import.meta.hot) import.meta.hot.data.dashboardRoot = root;
root.render(<DashboardApp />);
