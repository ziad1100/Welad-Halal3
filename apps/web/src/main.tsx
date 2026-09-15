import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import i18n from './lib/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { applyDir } from './lib/i18n';
import { initTheme } from './lib/theme';

try {
  const saved = localStorage.getItem('appLanguage') || 'ar';
  void i18n.changeLanguage(saved);
  applyDir(saved);
} catch {
  applyDir('ar');
}
initTheme();
const qc = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
