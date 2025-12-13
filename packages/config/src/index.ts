import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';
import { existsSync } from 'fs';

// Load .env files in development and test environments
// .env dosyalarını development ve test ortamlarında yükle
if (!process.env.SKIP_DOTENV) {
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Calculate path to project root by walking up from current directory
  // Mevcut dizinden başlayarak proje kök dizinine giden yolu hesapla
  // until we find pnpm-workspace.yaml or turbo.json
  // pnpm-workspace.yaml veya turbo.json bulana kadar
  let projectRoot = process.cwd();
  let current = process.cwd();
  
  while (current !== path.dirname(current)) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml')) || 
        existsSync(path.join(current, 'turbo.json'))) {
      projectRoot = current;
      break;
    }
    current = path.dirname(current);
  }
  
  // Try loading from project root first (explicit path resolution)
  // Önce proje kökünden yüklemeyi dene (açık yol çözümleme)
  const rootEnvPath = path.resolve(projectRoot, '.env');
  const rootEnvDevPath = path.resolve(projectRoot, `.env.${nodeEnv}`);
  
  // Load .env files - dotenv.config() will merge variables, later loads override earlier ones
  // .env dosyalarını yükle - dotenv.config() değişkenleri birleştirir, sonraki yüklemeler öncekileri geçersiz kılar
  if (existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath });
  }
  if (existsSync(rootEnvDevPath)) {
    dotenv.config({ path: rootEnvDevPath });
  }
  
  // Also try loading from current working directory as fallback
  // Ayrıca geri dönüş olarak mevcut çalışma dizininden de yüklemeyi dene
  dotenv.config();
  dotenv.config({ path: `.env.${nodeEnv}` });
}

const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),

  // API
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z
    .string()
    .default('4000')
    .transform((val) => {
      const parsed = Number(val);
      if (Number.isNaN(parsed) || parsed <= 0) {
        throw new Error(`Invalid API_PORT: ${val}`);
      }
      return parsed;
    }),

  // Web
  WEB_PORT: z
    .string()
    .default('3000')
    .transform((val) => {
      const parsed = Number(val);
      if (Number.isNaN(parsed) || parsed <= 0) {
        throw new Error(`Invalid WEB_PORT: ${val}`);
      }
      return parsed;
    }),
  NEXT_PUBLIC_API_BASE_URL: z
    .string()
    .url()
    .default('http://localhost:4000'),

  // Worker
  WORKER_CONCURRENCY: z
    .string()
    .default('5')
    .transform((val) => {
      const parsed = Number(val);
      if (Number.isNaN(parsed) || parsed <= 0) {
        throw new Error(`Invalid WORKER_CONCURRENCY: ${val}`);
      }
      return parsed;
    }),

  // Database & Redis
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  // Ollama
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
  DEFAULT_MODEL: z.string().default('llama3.1'),

  // Auth & Security
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long'),
  JWT_EXPIRES_IN: z.string().default('1h'), // Short-lived access tokens
  REFRESH_TOKEN_TTL_DAYS: z
    .string()
    .default('30')
    .transform((val) => {
      const parsed = Number(val);
      if (Number.isNaN(parsed) || parsed <= 0) {
        throw new Error(`Invalid REFRESH_TOKEN_TTL_DAYS: ${val}`);
      }
      return parsed;
    }),
  BCRYPT_SALT_ROUNDS: z
    .string()
    .default('10')
    .transform((val) => {
      const parsed = Number(val);
      if (Number.isNaN(parsed) || parsed <= 0) {
        throw new Error(`Invalid BCRYPT_SALT_ROUNDS: ${val}`);
      }
      return parsed;
    }),
  RATE_LIMIT_MAX: z
    .string()
    .default('100')
    .transform((val) => Number(val)),
  RATE_LIMIT_TIME_WINDOW_MS: z
    .string()
    .default('60000')
    .transform((val) => Number(val)),

  // Telemetry
  PROMETHEUS_METRICS_PORT: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const parsed = Number(val);
      if (Number.isNaN(parsed) || parsed <= 0) {
        throw new Error(`Invalid PROMETHEUS_METRICS_PORT: ${val}`);
      }
      return parsed;
    }),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),

  // Misc
  DEFAULT_TENANT_NAME: z.string().default('Default Org'),
  ALLOW_SIGNUP: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
});

export type AppConfig = z.infer<typeof baseSchema> & {
  /** Derived booleans */
  isDev: boolean;
  isTest: boolean;
  isProd: boolean;
};

let cachedConfig: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;

  const parsed = baseSchema.safeParse(process.env);

  if (!parsed.success) {
    // Build a human-readable error message
    // İnsan tarafından okunabilir bir hata mesajı oluştur
    const message = parsed.error.errors
      .map((err) => `${err.path.join('.')}: ${err.message}`)
      .join('; ');

    // eslint-disable-next-line no-console
    console.error('Configuration validation error:', message);
    throw new Error(`Invalid environment configuration: ${message}`);
  }

  const cfg = parsed.data;

  const enriched: AppConfig = {
    ...cfg,
    isDev: cfg.NODE_ENV === 'development',
    isTest: cfg.NODE_ENV === 'test',
    isProd: cfg.NODE_ENV === 'production',
  };

  cachedConfig = enriched;
  return enriched;
}

export function getConfig(): AppConfig {
  return loadConfig();
}
