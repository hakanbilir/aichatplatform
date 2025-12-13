export interface ClientConfig {
  apiBaseUrl: string;
}

export function loadClientConfig(): ClientConfig {
  // Provide default for build time / Derleme zamanı için varsayılan sağla
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

  return {
    apiBaseUrl,
  };
}

