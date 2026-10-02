import React from 'react';
import { createRoot } from 'react-dom/client';
import '../components/studio/book-studio.css';
import { BookStudioApp } from '../components/studio/BookStudioApp';

export const DashboardApp: React.FC = () => (
  <BookStudioApp />
);

const dashboardContainer = document.getElementById('dashboard-root')!;
const hotData = import.meta.hot?.data as { dashboardRoot?: ReturnType<typeof createRoot> } | undefined;
const root = hotData?.dashboardRoot || createRoot(dashboardContainer);
if (import.meta.hot) import.meta.hot.data.dashboardRoot = root;
root.render(<DashboardApp />);
