# apps/web/Dockerfile

FROM oven/bun:1.3-alpine AS base
WORKDIR /app

FROM base AS build

COPY package.json bun.lock bunfig.toml ./
COPY apps ./apps
COPY packages ./packages
COPY tsconfig.base.json turbo.json ./

RUN bun install --frozen-lockfile

# Build the web app for production
# Build directly by changing directory since bun --filter doesn't work reliably in Docker
RUN (cd apps/web && bun run build)

# === Static file server (nginx) ===
FROM nginx:1.27-alpine AS runtime

# Copy custom nginx configuration with security headers
# Güvenlik başlıklarıyla özel nginx yapılandırmasını kopyala
COPY --from=build /app/apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output to nginx html dir (adjust path if your build directory differs)
# Nginx html dizinine derleme çıktısını kopyala (derleme dizininiz farklıysa yolu ayarlayın)
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

# Create nginx cache and log directories with proper permissions
# Uygun izinlerle nginx önbellek ve log dizinlerini oluştur
RUN mkdir -p /var/cache/nginx /var/log/nginx /var/run && \
    chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /var/run && \
    chmod -R 755 /usr/share/nginx/html

# Nginx already runs as non-root user (nginx), but ensure proper permissions
# Nginx zaten root olmayan kullanıcı (nginx) olarak çalışıyor, ancak uygun izinleri sağla
# The nginx user is created by the base image
# nginx kullanıcısı temel görüntü tarafından oluşturulur

EXPOSE 80

# Enhanced health check using the healthz endpoint
# healthz endpoint'ini kullanan gelişmiş sağlık kontrolü
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/healthz || exit 1

# Start nginx in foreground mode
# Nginx'i ön planda başlat
CMD ["nginx", "-g", "daemon off;"]

