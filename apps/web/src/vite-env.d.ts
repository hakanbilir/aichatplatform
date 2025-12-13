/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  // Add other env variables as needed / Gerektiğinde diğer env değişkenlerini ekle
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

