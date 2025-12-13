// apps/worker-jobs/ecosystem.config.js
// PM2 ecosystem configuration for Worker Jobs service
// PM2 ekosistem yapılandırması Worker Jobs servisi için
// Background job processing with different restart strategies
// Farklı yeniden başlatma stratejileriyle arka plan iş işleme

const path = require('path');

// Determine script path based on environment
// Ortama göre script yolunu belirle
const getScriptPath = () => {
  if (process.env.PM2_SCRIPT_PATH) {
    return process.env.PM2_SCRIPT_PATH;
  }
  // Default to Docker path, but support local development
  // Varsayılan olarak Docker yolu, ancak yerel geliştirmeyi destekle
  return process.env.NODE_ENV === 'production'
    ? '/app/apps/worker-jobs/dist/apps/worker-jobs/src/main.js'
    : path.join(__dirname, 'dist/apps/worker-jobs/src/main.js');
};

module.exports = {
  apps: [
    {
      name: 'worker-jobs',
      script: getScriptPath(),
      
      // Worker processes typically run as single instance
      // Worker süreçleri genellikle tek örnek olarak çalışır
      instances: 1,
      exec_mode: 'fork',
      
      // Watch mode for development
      // Geliştirme için watch modu
      watch: process.env.NODE_ENV === 'development',
      ignore_watch: ['node_modules', 'dist', '*.log', '.git'],
      watch_options: {
        followSymlinks: false,
        usePolling: false,
      },
      
      // Memory management for background jobs
      // Arka plan işleri için bellek yönetimi
      max_memory_restart: process.env.PM2_MAX_MEMORY || '512M',
      node_args: process.env.NODE_ARGS || '--enable-source-maps',
      
      // Environment-specific configurations
      // Ortama özel yapılandırmalar
      env: {
        NODE_ENV: 'development',
        LOG_LEVEL: 'debug',
        WORKER_CONCURRENCY: '5',
      },
      env_staging: {
        NODE_ENV: 'staging',
        LOG_LEVEL: 'info',
        WORKER_CONCURRENCY: '10',
      },
      env_production: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
        WORKER_CONCURRENCY: '10',
      },
      
      // Enhanced logging configuration
      // Gelişmiş loglama yapılandırması
      error_file: process.env.PM2_ERROR_LOG || '/var/log/pm2/worker-jobs-error.log',
      out_file: process.env.PM2_OUT_LOG || '/var/log/pm2/worker-jobs-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS Z',
      merge_logs: true, // Single instance, so merge logs
      log_type: 'json',
      log_file: '/var/log/pm2/worker-jobs-combined.log',
      
      // Auto-restart configuration for workers
      // Worker'lar için otomatik yeniden başlatma yapılandırması
      autorestart: true,
      max_restarts: 20, // Workers may need more restarts due to job processing errors
      min_uptime: '30s', // Longer uptime required for workers to be considered stable
      restart_delay: 5000, // Longer delay for workers to handle job cleanup
      exp_backoff_restart_delay: 200,
      
      // Graceful shutdown for job processing
      // İş işleme için zarif kapanma
      kill_timeout: 30000, // Longer timeout to allow jobs to complete
      wait_ready: false, // Workers don't emit ready events typically
      listen_timeout: 10000,
      shutdown_with_message: true,
      
      // Process management
      // Süreç yönetimi
      pid_file: '/var/run/pm2/worker-jobs.pid',
      
      // Advanced monitoring
      // Gelişmiş izleme
      pmx: true,
      monitoring: false,
      
      // Source map support
      // Source map desteği
      source_map_support: true,
      
      // Cron restart (optional - for periodic maintenance)
      // Cron yeniden başlatma (isteğe bağlı - periyodik bakım için)
      // cron_restart: '0 3 * * *', // Daily restart at 3 AM
      
      // Additional environment variables
      // Ek ortam değişkenleri
      env_file: process.env.ENV_FILE || '.env',
      
      // Interpreter
      // Yorumlayıcı
      interpreter: 'node',
      interpreter_args: '',
    },
  ],
};

