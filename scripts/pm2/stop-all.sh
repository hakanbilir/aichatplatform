#!/bin/bash
# Stop all aichatplatform services managed by PM2
# PM2 tarafından yönetilen tüm aichatplatform servislerini durdur

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

echo "Stopping all aichatplatform services..."
echo "Tüm aichatplatform servisleri durduruluyor..."

# Check if PM2 is installed
# PM2'nin kurulu olup olmadığını kontrol et
if ! command -v pm2 &> /dev/null; then
    echo "Error: PM2 is not installed."
    echo "Hata: PM2 kurulu değil."
    exit 1
fi

# Stop all services
# Tüm servisleri durdur
pm2 stop ecosystem.config.js || pm2 stop all

echo ""
echo "All services stopped."
echo "Tüm servisler durduruldu."

