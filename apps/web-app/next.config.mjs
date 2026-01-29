/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // appDir is enabled by default in Next.js 15 / appDir Next.js 15'te varsayılan olarak etkin

  // Enable standalone output for Docker optimization
  // Docker optimizasyonu için standalone çıktıyı etkinleştir
  output: 'standalone',

  // Skip ESLint during build (root eslint-plugin-node uses getScope, incompatible with Next ESLint runner)
  // Derleme sırasında ESLint atlanır (kök eslint-plugin-node getScope kullanır, Next ESLint ile uyumsuz)
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;

