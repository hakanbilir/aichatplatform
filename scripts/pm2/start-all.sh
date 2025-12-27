#!/bin/bash
# Start all aichatplatform services with PM2
# Tüm aichatplatform servislerini PM2 ile başlat

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

echo "Starting all aichatplatform services with PM2..."
echo "Tüm aichatplatform servislerini PM2 ile başlatılıyor..."

# Check if PM2 is installed
# PM2'nin kurulu olup olmadığını kontrol et
if ! command -v pm2 &> /dev/null; then
    echo "Error: PM2 is not installed. Please install it with: npm install -g pm2"
    echo "Hata: PM2 kurulu değil. Lütfen şu komutla kurun: npm install -g pm2"
    exit 1
fi

# Load environment variables
# Ortam değişkenlerini yükle
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Start all services
# Tüm servisleri başlat
pm2 start ecosystem.config.js --env "${NODE_ENV:-development}"

echo ""
echo "All services started. Use 'pm2 status' to check status."
echo "Tüm servisler başlatıldı. Durumu kontrol etmek için 'pm2 status' kullanın."
echo ""
echo "Useful commands:"
echo "Yararlı komutlar:"
echo "  pm2 status              - View status of all services"
echo "  pm2 logs                - View logs from all services"
echo "  pm2 monit               - Monitor all services"
echo "  pm2 stop all            - Stop all services"
echo "  pm2 restart all         - Restart all services"

