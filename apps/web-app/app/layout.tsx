import React from 'react';

import { EcoModeProvider } from '../src/hooks/useEcoMode';
import { RefractionFilter } from '../src/components/ui/RefractionFilter';
import { KineticController } from '../src/components/KineticController';
import '../src/styles/theme2026.css';

export const metadata = {
  title: 'AI Chat Platform',
  description: 'Ollama-powered AI chat platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, overflowX: 'hidden', background: '#000', color: '#fff', minHeight: '100vh' }}>
        <EcoModeProvider>
          <RefractionFilter />
          <KineticController />
          {children}
        </EcoModeProvider>
      </body>
    </html>
  );
}
