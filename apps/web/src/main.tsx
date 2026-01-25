import React from 'react';
import ReactDOM from 'react-dom/client';
import './theme/theme2026.css';
import './i18n/config'; // Initialize i18n / i18n'i başlat
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

