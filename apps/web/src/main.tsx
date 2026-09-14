import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './styles/kstore.css';
import './i18n/dir.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { applyLang, getLang } from './store/lang';
import { applyTheme, getTheme } from './store/theme';

applyLang(getLang());
applyTheme(getTheme());
const qc = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
