#!/bin/bash
# View logs from all aichatplatform services managed by PM2
# PM2 tarafından yönetilen tüm aichatplatform servislerinin günlüklerini görüntüle

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

# Check if PM2 is installed
# PM2'nin kurulu olup olmadığını kontrol et
if ! command -v pm2 &> /dev/null; then
    echo "Error: PM2 is not installed."
    echo "Hata: PM2 kurulu değil."
    exit 1
fi

# Check if service name is provided
# Servis adı sağlanmış mı kontrol et
if [ -n "$1" ]; then
    echo "Showing logs for service: $1"
    echo "Servis için günlükler gösteriliyor: $1"
    pm2 logs "$1" --lines 100
else
    echo "Showing logs from all services (press Ctrl+C to exit):"
    echo "Tüm servislerden günlükler gösteriliyor (çıkmak için Ctrl+C):"
    echo ""
    pm2 logs --lines 100
fi

