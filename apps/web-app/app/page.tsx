import { loadClientConfig } from '../src/config/client';

export default function HomePage() {
  const { apiBaseUrl } = loadClientConfig();

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>AI Chat Platform</h1>
      <p>Frontend scaffold is running.</p>
      <p>
        API base URL: <code>{apiBaseUrl}</code>
      </p>
    </main>
  );
}

