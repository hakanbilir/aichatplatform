#!/bin/bash
# Show status of all aichatplatform services managed by PM2
# PM2 tarafından yönetilen tüm aichatplatform servislerinin durumunu göster

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

echo "Status of all aichatplatform services:"
echo "Tüm aichatplatform servislerinin durumu:"
echo ""

pm2 status

echo ""
echo "For detailed information, use:"
echo "Detaylı bilgi için kullanın:"
echo "  pm2 describe <service-name>  - Detailed info about a service"
echo "  pm2 monit                     - Real-time monitoring"

