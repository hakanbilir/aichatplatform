/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // appDir is enabled by default in Next.js 15 / appDir Next.js 15'te varsayılan olarak etkin
  
  // Enable standalone output for Docker optimization
  // Docker optimizasyonu için standalone çıktıyı etkinleştir
  output: 'standalone',
};

export default nextConfig;

