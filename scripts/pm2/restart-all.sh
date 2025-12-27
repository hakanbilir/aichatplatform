#!/bin/bash
# Restart all aichatplatform services managed by PM2
# PM2 tarafından yönetilen tüm aichatplatform servislerini yeniden başlat

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

echo "Restarting all aichatplatform services..."
echo "Tüm aichatplatform servisleri yeniden başlatılıyor..."

# Check if PM2 is installed
# PM2'nin kurulu olup olmadığını kontrol et
if ! command -v pm2 &> /dev/null; then
    echo "Error: PM2 is not installed."
    echo "Hata: PM2 kurulu değil."
    exit 1
fi

# Load environment variables
# Ortam değişkenlerini yükle
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Restart all services
# Tüm servisleri yeniden başlat
pm2 restart ecosystem.config.js --env "${NODE_ENV:-development}" || pm2 restart all

echo ""
echo "All services restarted."
echo "Tüm servisler yeniden başlatıldı."

