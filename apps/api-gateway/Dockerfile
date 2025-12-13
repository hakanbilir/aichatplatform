# apps/api-gateway/Dockerfile

FROM oven/bun:1.3-alpine AS base
WORKDIR /app

# === Build stage ===
FROM base AS build

# Copy monorepo files (adjust paths according to your repo structure)
COPY package.json bun.lock bunfig.toml ./
COPY apps ./apps
COPY packages ./packages
COPY tsconfig.base.json turbo.json ./

RUN bun install --frozen-lockfile

# Generate Prisma client
RUN bun --filter @ai-chat/db prisma:generate

# Build all workspace packages that api-gateway depends on
# Build order: config and core-types first (no dependencies), then ollama-client (depends on config/core-types),
# then chat-orchestrator (depends on ollama-client), then db
# Build packages directly by changing directory since bun --filter doesn't work reliably in Docker
RUN (cd packages/config && bun run build) && \
    (cd packages/core-types && bun run build) && \
    (cd packages/ollama-client && bun run build) && \
    (cd packages/db && bun run build) && \
    (cd packages/chat-orchestrator && bun run build)

# Build the api-gateway package
RUN (cd apps/api-gateway && bun run build)

# === Runtime stage ===
FROM oven/bun:1.3-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Use existing bun user (oven/bun already has bun user)
# Mevcut bun kullanıcısını kullan (oven/bun zaten bun kullanıcısına sahip)
# Ensure bun user has correct UID/GID
# Bun kullanıcısının doğru UID/GID'ye sahip olduğundan emin ol
RUN if ! id -u bun > /dev/null 2>&1; then \
        addgroup -g 1000 bun && \
        adduser -u 1000 -G bun -s /bin/sh -D bun; \
    fi

# Copy workspace configuration files
# Workspace yapılandırma dosyalarını kopyala
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/bun.lock ./bun.lock
COPY --from=build /app/bunfig.toml ./bunfig.toml

# Copy built packages (workspace dependencies) - include dist folders if they exist
# Derlenmiş paketleri (workspace bağımlılıkları) kopyala - varsa dist klasörlerini dahil et
# We need to copy the entire packages directory structure with source and dist
# Kaynak ve dist ile tüm packages dizin yapısını kopyalamamız gerekiyor
COPY --from=build /app/packages ./packages

# Copy apps directory structure (needed for workspace resolution)
# Apps dizin yapısını kopyala (workspace çözümlemesi için gerekli)
COPY --from=build /app/apps ./apps

# Install only production dependencies (this will link workspace packages correctly)
# Sadece production bağımlılıklarını yükle (bu workspace paketlerini doğru şekilde bağlayacak)
# Bun automatically links workspace packages when package.json has workspaces defined
# Bun, package.json'da workspaces tanımlı olduğunda otomatik olarak workspace paketlerini bağlar
RUN bun install --frozen-lockfile --production

# Generate Prisma client in runtime stage (needed for @ai-chat/db package)
# Runtime aşamasında Prisma client'ı oluştur (@ai-chat/db paketi için gerekli)
RUN (cd packages/db && bun run prisma:generate)

# Install npm (required for PM2) and PM2 globally with recommended modules
# PM2 için gerekli npm'i ve PM2'yi önerilen modüllerle global olarak yükle
RUN apk add --no-cache npm && \
    npm install -g pm2 && \
    pm2 install pm2-logrotate pm2-server-monit && \
    pm2 set pm2-logrotate:max_size 10M && \
    pm2 set pm2-logrotate:retain 30 && \
    pm2 set pm2-logrotate:compress true && \
    pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss

# Copy PM2 ecosystem config
# PM2 ekosistem yapılandırmasını kopyala
COPY --from=build /app/apps/api-gateway/ecosystem.config.js ./ecosystem.config.js

# Create log and PID directories with proper permissions
# Log ve PID dizinlerini uygun izinlerle oluştur
RUN mkdir -p /var/log/pm2 /var/run/pm2 && \
    chmod 755 /var/log/pm2 /var/run/pm2 && \
    chown -R bun:bun /var/log/pm2 /var/run/pm2

# Change ownership of app directory to non-root user
# Uygulama dizininin sahipliğini root olmayan kullanıcıya değiştir
RUN chown -R bun:bun /app

# Switch to non-root user
# Root olmayan kullanıcıya geç
USER bun

# Expose HTTP port
EXPOSE 8080

# Enhanced health check
# Gelişmiş sağlık kontrolü
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD bun -e "Bun.serve({ fetch: () => new Response() }).fetch('http://localhost:8080/healthz').then(r => process.exit(r.status === 200 ? 0 : 1)).catch(() => process.exit(1))" || wget --no-verbose --tries=1 --spider http://localhost:8080/healthz || exit 1

# Use PM2 to start the application (pm2-runtime keeps container alive)
# PM2 ile uygulamayı başlat (pm2-runtime container'ı canlı tutar)
CMD ["pm2-runtime", "start", "ecosystem.config.js", "--env", "production"]

