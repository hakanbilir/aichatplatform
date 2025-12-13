// apps/api-gateway/ecosystem.config.js
// PM2 ecosystem configuration for API Gateway
// PM2 ekosistem yapılandırması API Gateway için
// Enhanced with production-grade features: cluster mode, advanced logging, monitoring
// Üretim kalitesi özelliklerle geliştirildi: cluster modu, gelişmiş loglama, izleme

const path = require('path');

// Determine script path based on environment
// Ortama göre script yolunu belirle
const getScriptPath = () => {
  // In Docker, use absolute path; locally, use relative path
  // Docker'da mutlak yol kullan; yerelde göreli yol kullan
  if (process.env.PM2_SCRIPT_PATH) {
    return process.env.PM2_SCRIPT_PATH;
  }
  // Default to Docker path (ecosystem.config.js is at /app in Docker)
  // Varsayılan olarak Docker yolu (ecosystem.config.js Docker'da /app'te)
  // In Docker, the ecosystem.config.js is copied to /app, so use absolute path
  // Docker'da ecosystem.config.js /app'e kopyalanır, bu yüzden mutlak yol kullan
  return process.env.NODE_ENV === 'production'
    ? '/app/apps/api-gateway/dist/apps/api-gateway/src/main.js'
    : path.join(__dirname, 'dist/apps/api-gateway/src/main.js');
};

module.exports = {
  apps: [
    {
      name: 'api-gateway',
      script: getScriptPath(),
      
      // Cluster mode configuration
      // Cluster modu yapılandırması
      instances: process.env.PM2_INSTANCES || 1, // Use 'max' for all CPU cores, or specific number
      exec_mode: process.env.PM2_INSTANCES && process.env.PM2_INSTANCES !== '1' ? 'cluster' : 'fork',
      
      // Watch mode for development
      // Geliştirme için watch modu
      watch: process.env.NODE_ENV === 'development',
      ignore_watch: ['node_modules', 'dist', '*.log', '.git'],
      watch_options: {
        followSymlinks: false,
        usePolling: false,
      },
      
      // Memory management
      // Bellek yönetimi
      max_memory_restart: process.env.PM2_MAX_MEMORY || '1G', // Restart if memory exceeds limit
      node_args: process.env.NODE_ARGS || '--enable-source-maps', // Enable source maps for better error tracking
      
      // Environment-specific configurations
      // Ortama özel yapılandırmalar
      env: {
        NODE_ENV: 'development',
        LOG_LEVEL: 'debug',
      },
      env_staging: {
        NODE_ENV: 'staging',
        LOG_LEVEL: 'info',
      },
      env_production: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
      },
      
      // Enhanced logging configuration
      // Gelişmiş loglama yapılandırması
      error_file: process.env.PM2_ERROR_LOG || '/var/log/pm2/api-gateway-error.log',
      out_file: process.env.PM2_OUT_LOG || '/var/log/pm2/api-gateway-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS Z',
      merge_logs: false, // Keep separate logs per instance for better debugging
      log_type: 'json', // Structured logging for better parsing
      log_file: '/var/log/pm2/api-gateway-combined.log',
      
      // Log rotation (requires pm2-logrotate module)
      // Log rotasyonu (pm2-logrotate modülü gerekir)
      // Configure via: pm2 set pm2-logrotate:max_size 10M
      // Configure via: pm2 set pm2-logrotate:retain 30
      
      // Auto-restart configuration with exponential backoff
      // Üstel geri çekilme ile otomatik yeniden başlatma yapılandırması
      autorestart: true,
      max_restarts: 15, // Increased from 10 for better resilience
      min_uptime: '10s', // Minimum uptime before considering app stable
      restart_delay: 4000, // Initial delay before restart
      exp_backoff_restart_delay: 100, // Exponential backoff base delay
      
      // Graceful shutdown configuration
      // Zarif kapanma yapılandırması
      kill_timeout: 10000, // Increased timeout for graceful shutdown
      wait_ready: true, // Wait for app to emit 'ready' event
      listen_timeout: 15000, // Timeout for app to become ready
      shutdown_with_message: true, // Send shutdown message to app
      
      // Health check integration
      // Sağlık kontrolü entegrasyonu
      // Uses /readyz endpoint for readiness checks
      // /readyz endpoint'ini hazır olma kontrolleri için kullanır
      
      // Process management
      // Süreç yönetimi
      pid_file: '/var/run/pm2/api-gateway.pid',
      instance_var: 'INSTANCE_ID', // Environment variable for instance ID
      
      // Advanced monitoring
      // Gelişmiş izleme
      pmx: true, // Enable PM2 monitoring
      monitoring: false, // Disable PM2 Plus monitoring by default (enable if needed)
      
      // Source map support
      // Source map desteği
      source_map_support: true,
      
      // Cron restart (optional - uncomment if needed)
      // Cron yeniden başlatma (isteğe bağlı - gerekirse yorumu kaldır)
      // cron_restart: '0 4 * * *', // Daily restart at 4 AM
      
      // Additional environment variables
      // Ek ortam değişkenleri
      env_file: process.env.ENV_FILE || '.env',
      
      // Interpreter (defaults to node)
      // Yorumlayıcı (varsayılan olarak node)
      interpreter: 'node',
      interpreter_args: '',
    },
  ],
  
  // PM2 module configuration
  // PM2 modül yapılandırması
  module: {
    // Recommended modules to install:
    // Önerilen modüller:
    // pm2 install pm2-logrotate  (for log rotation)
    // pm2 install pm2-server-monit  (for server monitoring)
    // pm2 set pm2-logrotate:max_size 10M
    // pm2 set pm2-logrotate:retain 30
    // pm2 set pm2-logrotate:compress true
    // pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
  },
};

