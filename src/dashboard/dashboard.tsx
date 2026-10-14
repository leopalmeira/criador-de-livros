import React from 'react';
import { createRoot } from 'react-dom/client';
import '../components/studio/book-studio.css';
import { BookStudioApp } from '../components/studio/BookStudioApp';

import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { BookEnginLoadingProvider } from '../components/common/BookEnginLoadingContext';

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
