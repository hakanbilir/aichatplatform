import React from 'react';
import ReactDOM from 'react-dom/client';

import './i18n/config'; // Initialize i18n / i18n'i başlat
import './theme2026.css';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
