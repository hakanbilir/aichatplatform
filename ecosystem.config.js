// ecosystem.config.js (Root level)
// Unified PM2 ecosystem configuration for managing multiple services
// Birden fazla servisi yönetmek için birleşik PM2 ekosistem yapılandırması
// This file allows managing api-gateway and worker-jobs from a single PM2 instance
// Bu dosya api-gateway ve worker-jobs'u tek bir PM2 örneğinden yönetmeye olanak tanır
// 
// NOTE: PM2 can run Bun scripts. The interpreter is set to 'bun' for Bun runtime.
// NOT: PM2 Bun scriptlerini çalıştırabilir. Yorumlayıcı Bun runtime için 'bun' olarak ayarlanmıştır.

const path = require('path');

module.exports = {
  apps: [
    // API Gateway service
    // API Gateway servisi
    {
      name: 'api-gateway',
      script: path.join(__dirname, 'apps/api-gateway/dist/apps/api-gateway/src/main.js'),
      cwd: path.join(__dirname, 'apps/api-gateway'),
      interpreter: 'bun', // Use Bun runtime instead of Node.js / Node.js yerine Bun runtime kullan
      
      // Cluster mode configuration
      // Cluster modu yapılandırması
      // Note: Bun doesn't support cluster mode like Node.js, so this will use fork mode
      // Not: Bun Node.js gibi cluster modunu desteklemez, bu yüzden fork modu kullanılacak
      instances: process.env.PM2_INSTANCES || 1,
      exec_mode: 'fork', // Bun uses fork mode / Bun fork modu kullanır
      
      // Watch mode for development
      // Geliştirme için watch modu
      watch: process.env.NODE_ENV === 'development',
      ignore_watch: ['node_modules', 'dist', '*.log', '.git'],
      
      // Memory management
      // Bellek yönetimi
      max_memory_restart: process.env.PM2_MAX_MEMORY || '1G',
      // Bun-specific arguments (Bun doesn't use node_args)
      // Bun'a özel argümanlar (Bun node_args kullanmaz)
      // interpreter_args: '--enable-source-maps', // Uncomment if needed / Gerekirse yorumu kaldır
      
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
      
      // Enhanced logging
      // Gelişmiş loglama
      error_file: './logs/api-gateway-error.log',
      out_file: './logs/api-gateway-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS Z',
      merge_logs: false,
      log_type: 'json',
      
      // Auto-restart configuration
      // Otomatik yeniden başlatma yapılandırması
      autorestart: true,
      max_restarts: 15,
      min_uptime: '10s',
      restart_delay: 4000,
      exp_backoff_restart_delay: 100,
      
      // Graceful shutdown
      // Zarif kapanma
      kill_timeout: 10000,
      wait_ready: true,
      listen_timeout: 15000,
      shutdown_with_message: true,
      
      // Monitoring
      // İzleme
      pmx: true,
      // Note: Bun has native source map support, source_map_support not needed
      // Not: Bun yerel source map desteğine sahip, source_map_support gerekmez
    },
    
    // Worker Jobs service
    // Worker Jobs servisi
    {
      name: 'worker-jobs',
      script: path.join(__dirname, 'apps/worker-jobs/dist/apps/worker-jobs/src/main.js'),
      cwd: path.join(__dirname, 'apps/worker-jobs'),
      interpreter: 'bun', // Use Bun runtime instead of Node.js / Node.js yerine Bun runtime kullan
      
      // Single instance for workers
      // Worker'lar için tek örnek
      instances: 1,
      exec_mode: 'fork',
      
      // Watch mode for development
      // Geliştirme için watch modu
      watch: process.env.NODE_ENV === 'development',
      ignore_watch: ['node_modules', 'dist', '*.log', '.git'],
      
      // Memory management
      // Bellek yönetimi
      max_memory_restart: process.env.PM2_MAX_MEMORY || '512M',
      // Bun-specific arguments (Bun doesn't use node_args)
      // Bun'a özel argümanlar (Bun node_args kullanmaz)
      // interpreter_args: '--enable-source-maps', // Uncomment if needed / Gerekirse yorumu kaldır
      
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
      
      // Enhanced logging
      // Gelişmiş loglama
      error_file: './logs/worker-jobs-error.log',
      out_file: './logs/worker-jobs-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS Z',
      merge_logs: true,
      log_type: 'json',
      
      // Auto-restart configuration for workers
      // Worker'lar için otomatik yeniden başlatma yapılandırması
      autorestart: true,
      max_restarts: 20,
      min_uptime: '30s',
      restart_delay: 5000,
      exp_backoff_restart_delay: 200,
      
      // Graceful shutdown for job processing
      // İş işleme için zarif kapanma
      kill_timeout: 30000,
      wait_ready: false,
      listen_timeout: 10000,
      shutdown_with_message: true,
      
      // Monitoring
      // İzleme
      pmx: true,
      // Note: Bun has native source map support, source_map_support not needed
      // Not: Bun yerel source map desteğine sahip, source_map_support gerekmez
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
  
  // Deployment configuration (optional)
  // Dağıtım yapılandırması (isteğe bağlı)
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:your-org/your-repo.git',
      path: '/var/www/production',
      'post-deploy': 'bun install --frozen-lockfile && bun run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
    },
    staging: {
      user: 'deploy',
      host: ['staging-server.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:your-org/your-repo.git',
      path: '/var/www/staging',
      'post-deploy': 'bun install --frozen-lockfile && bun run build && pm2 reload ecosystem.config.js --env staging',
      'pre-setup': '',
    },
  },
};

