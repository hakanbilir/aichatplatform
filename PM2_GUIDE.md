# PM2 Process Management Guide - AI Chat Platform
# PM2 Süreç Yönetimi Kılavuzu - AI Chat Platform

## Overview / Genel Bakış

This project uses PM2 for process management of all services.
Bu proje tüm servislerin süreç yönetimi için PM2 kullanır.

## Services Managed / Yönetilen Servisler

1. **api-gateway** - API Gateway service (Bun runtime) - Port 4000
2. **worker-jobs** - Background job processing (Bun runtime)
3. **web-app** - Next.js web application (Bun runtime) - Port 3000

## Installation / Kurulum

### Install PM2 globally
### PM2'yi global olarak kurun

```bash
npm install -g pm2
```

### Install PM2 modules (recommended)
### PM2 modüllerini kurun (önerilir)

```bash
# Log rotation / Günlük rotasyonu
pm2 install pm2-logrotate

# Server monitoring / Sunucu izleme
pm2 install pm2-server-monit

# Configure log rotation / Günlük rotasyonunu yapılandırın
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
```

## Quick Start / Hızlı Başlangıç

### Start all services
### Tüm servisleri başlat

```bash
./scripts/pm2/start-all.sh
```

Or manually:
Veya manuel olarak:

```bash
pm2 start ecosystem.config.js --env development
```

### Stop all services
### Tüm servisleri durdur

```bash
./scripts/pm2/stop-all.sh
```

Or manually:
Veya manuel olarak:

```bash
pm2 stop all
```

### Restart all services
### Tüm servisleri yeniden başlat

```bash
./scripts/pm2/restart-all.sh
```

Or manually:
Veya manuel olarak:

```bash
pm2 restart all
```

### View status
### Durumu görüntüle

```bash
./scripts/pm2/status-all.sh
```

Or manually:
Veya manuel olarak:

```bash
pm2 status
```

### View logs
### Günlükleri görüntüle

```bash
# All services / Tüm servisler
./scripts/pm2/logs-all.sh

# Specific service / Belirli bir servis
./scripts/pm2/logs-all.sh api-gateway
```

Or manually:
Veya manuel olarak:

```bash
pm2 logs                    # All services / Tüm servisler
pm2 logs api-gateway        # Specific service / Belirli bir servis
pm2 logs api-gateway --lines 100  # Last 100 lines / Son 100 satır
```

## Common Commands / Yaygın Komutlar

### Service Management / Servis Yönetimi

```bash
# Start a specific service / Belirli bir servisi başlat
pm2 start api-gateway

# Stop a specific service / Belirli bir servisi durdur
pm2 stop api-gateway

# Restart a specific service / Belirli bir servisi yeniden başlat
pm2 restart api-gateway

# Delete a service from PM2 / PM2'den bir servisi sil
pm2 delete api-gateway

# Reload a service (zero-downtime) / Bir servisi yeniden yükle (kesintisiz)
pm2 reload api-gateway
```

### Monitoring / İzleme

```bash
# Real-time monitoring / Gerçek zamanlı izleme
pm2 monit

# Detailed information about a service / Bir servis hakkında detaylı bilgi
pm2 describe api-gateway

# Show process list / Süreç listesini göster
pm2 list

# Show process information / Süreç bilgisini göster
pm2 show api-gateway
```

### Logs / Günlükler

```bash
# View logs / Günlükleri görüntüle
pm2 logs

# View logs with timestamps / Zaman damgalı günlükleri görüntüle
pm2 logs --timestamp

# Clear all logs / Tüm günlükleri temizle
pm2 flush

# View error logs only / Yalnızca hata günlüklerini görüntüle
pm2 logs --err
```

### Environment / Ortam

```bash
# Start with specific environment / Belirli bir ortamla başlat
pm2 start ecosystem.config.js --env production
pm2 start ecosystem.config.js --env staging
pm2 start ecosystem.config.js --env development
```

## Configuration / Yapılandırma

The PM2 configuration is in `ecosystem.config.js` at the project root.
PM2 yapılandırması proje kökündeki `ecosystem.config.js` dosyasındadır.

### Key Settings / Önemli Ayarlar

- **instances**: Number of instances (1 for workers, configurable for API Gateway)
- **exec_mode**: 'fork' for Bun, 'cluster' for Node.js (not used with Bun)
- **max_memory_restart**: Auto-restart if memory exceeds this limit
- **watch**: Enable file watching in development
- **autorestart**: Auto-restart on crash
- **env_file**: Path to .env file

## Troubleshooting / Sorun Giderme

### Service won't start / Servis başlamıyor

1. Check logs: `pm2 logs <service-name>`
2. Check if port is already in use: `netstat -tuln | grep <port>`
3. Verify .env file exists and has required variables
4. Check if dependencies are installed

### Service keeps restarting / Servis sürekli yeniden başlıyor

1. Check logs for errors: `pm2 logs <service-name> --err`
2. Check memory usage: `pm2 monit`
3. Increase max_memory_restart if needed
4. Check for infinite loops or unhandled errors

### Port conflicts / Port çakışmaları

All ports are allocated to avoid conflicts:
Tüm portlar çakışmayı önlemek için tahsis edilmiştir:

- API Gateway: 4000
- Web App: 3000
- Database: 5400
- Redis: 6300

If conflicts occur:
Çakışma olursa:

1. Check which process is using the port: `ss -tuln | grep :<port>`
2. Verify port allocation: See `/root/PORT_ALLOCATION.md`
3. Update port in .env file if needed
4. Restart the service

## Production Deployment / Üretim Dağıtımı

### Save PM2 process list
### PM2 süreç listesini kaydet

```bash
pm2 save
```

### Setup PM2 to start on system boot
### PM2'yi sistem açılışında başlatmak için ayarla

```bash
pm2 startup
# Follow the instructions shown / Gösterilen talimatları izleyin
pm2 save
```

### Production startup
### Üretim başlatma

```bash
pm2 start ecosystem.config.js --env production
pm2 save
```

## Additional Resources / Ek Kaynaklar

- PM2 Documentation: https://pm2.keymetrics.io/docs/
- PM2 GitHub: https://github.com/Unitech/pm2

