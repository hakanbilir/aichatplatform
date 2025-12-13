import React from 'react';

export const metadata = {
  title: 'AI Chat Platform',
  description: 'Ollama-powered AI chat platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

