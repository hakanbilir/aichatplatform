# apps/web-app/Dockerfile
# Next.js web application Dockerfile
# Next.js web uygulaması Dockerfile

FROM oven/bun:1.3-alpine AS base
WORKDIR /app

# Install dependencies only when needed
# Yalnızca gerektiğinde bağımlılıkları yükle
FROM base AS deps

# Copy package files
# Paket dosyalarını kopyala
# Copy all apps and packages to ensure lockfile consistency
# Tüm apps ve packages'ı kopyala, lockfile tutarlılığını sağlamak için
COPY package.json bun.lock bunfig.toml ./
COPY apps ./apps
COPY packages ./packages
COPY tsconfig.base.json turbo.json ./

# Install dependencies
# Bağımlılıkları yükle
RUN bun install --frozen-lockfile

# Rebuild the source code only when needed
# Yalnızca gerektiğinde kaynak kodu yeniden derle
FROM base AS builder

# Copy dependencies from deps stage
# deps aşamasından bağımlılıkları kopyala
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web-app/node_modules ./apps/web-app/node_modules

# Copy source code
# Kaynak kodu kopyala
COPY apps/web-app ./apps/web-app
COPY packages ./packages
COPY tsconfig.base.json turbo.json ./

# Set build-time environment variables
# Derleme zamanı ortam değişkenlerini ayarla
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL:-http://localhost:8080}

# Build Next.js application
# Next.js uygulamasını derle
RUN cd apps/web-app && bun run build

# Production image, copy all the files and run next
# Production görüntüsü, tüm dosyaları kopyala ve next'i çalıştır
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
# Güvenlik için root olmayan kullanıcı oluştur
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder
# Builder'dan gerekli dosyaları kopyala
COPY --from=builder /app/apps/web-app/public ./apps/web-app/public
COPY --from=builder /app/apps/web-app/.next/standalone ./
COPY --from=builder /app/apps/web-app/.next/static ./apps/web-app/.next/static

# Set correct permissions
# Doğru izinleri ayarla
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
# Sağlık kontrolü
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Start Next.js server
# Next.js sunucusunu başlat
# The standalone output places server.js at the root of the copied directory
# Standalone çıktısı server.js'i kopyalanan dizinin köküne yerleştirir
CMD ["bun", "run", "server.js"]

