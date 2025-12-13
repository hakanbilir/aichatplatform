"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.getConfig = getConfig;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
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
    while (current !== path_1.default.dirname(current)) {
        if ((0, fs_1.existsSync)(path_1.default.join(current, 'pnpm-workspace.yaml')) ||
            (0, fs_1.existsSync)(path_1.default.join(current, 'turbo.json'))) {
            projectRoot = current;
            break;
        }
        current = path_1.default.dirname(current);
    }
    // Try loading from project root first (explicit path resolution)
    // Önce proje kökünden yüklemeyi dene (açık yol çözümleme)
    const rootEnvPath = path_1.default.resolve(projectRoot, '.env');
    const rootEnvDevPath = path_1.default.resolve(projectRoot, `.env.${nodeEnv}`);
    // Load .env files - dotenv.config() will merge variables, later loads override earlier ones
    // .env dosyalarını yükle - dotenv.config() değişkenleri birleştirir, sonraki yüklemeler öncekileri geçersiz kılar
    if ((0, fs_1.existsSync)(rootEnvPath)) {
        dotenv_1.default.config({ path: rootEnvPath });
    }
    if ((0, fs_1.existsSync)(rootEnvDevPath)) {
        dotenv_1.default.config({ path: rootEnvDevPath });
    }
    // Also try loading from current working directory as fallback
    // Ayrıca geri dönüş olarak mevcut çalışma dizininden de yüklemeyi dene
    dotenv_1.default.config();
    dotenv_1.default.config({ path: `.env.${nodeEnv}` });
}
const baseSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    LOG_LEVEL: zod_1.z
        .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
        .default('info'),
    // API
    API_HOST: zod_1.z.string().default('0.0.0.0'),
    API_PORT: zod_1.z
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
    WEB_PORT: zod_1.z
        .string()
        .default('3000')
        .transform((val) => {
        const parsed = Number(val);
        if (Number.isNaN(parsed) || parsed <= 0) {
            throw new Error(`Invalid WEB_PORT: ${val}`);
        }
        return parsed;
    }),
    NEXT_PUBLIC_API_BASE_URL: zod_1.z
        .string()
        .url()
        .default('http://localhost:4000'),
    // Worker
    WORKER_CONCURRENCY: zod_1.z
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
    DATABASE_URL: zod_1.z.string().min(1, 'DATABASE_URL is required'),
    REDIS_URL: zod_1.z.string().min(1, 'REDIS_URL is required'),
    // Ollama
    OLLAMA_BASE_URL: zod_1.z.string().url().default('http://localhost:11434'),
    DEFAULT_MODEL: zod_1.z.string().default('llama3.1'),
    // Auth & Security
    JWT_SECRET: zod_1.z.string().min(16, 'JWT_SECRET must be at least 16 characters long'),
    JWT_EXPIRES_IN: zod_1.z.string().default('1h'), // Short-lived access tokens
    REFRESH_TOKEN_TTL_DAYS: zod_1.z
        .string()
        .default('30')
        .transform((val) => {
        const parsed = Number(val);
        if (Number.isNaN(parsed) || parsed <= 0) {
            throw new Error(`Invalid REFRESH_TOKEN_TTL_DAYS: ${val}`);
        }
        return parsed;
    }),
    BCRYPT_SALT_ROUNDS: zod_1.z
        .string()
        .default('10')
        .transform((val) => {
        const parsed = Number(val);
        if (Number.isNaN(parsed) || parsed <= 0) {
            throw new Error(`Invalid BCRYPT_SALT_ROUNDS: ${val}`);
        }
        return parsed;
    }),
    RATE_LIMIT_MAX: zod_1.z
        .string()
        .default('100')
        .transform((val) => Number(val)),
    RATE_LIMIT_TIME_WINDOW_MS: zod_1.z
        .string()
        .default('60000')
        .transform((val) => Number(val)),
    // Telemetry
    PROMETHEUS_METRICS_PORT: zod_1.z
        .string()
        .optional()
        .transform((val) => {
        if (!val)
            return undefined;
        const parsed = Number(val);
        if (Number.isNaN(parsed) || parsed <= 0) {
            throw new Error(`Invalid PROMETHEUS_METRICS_PORT: ${val}`);
        }
        return parsed;
    }),
    OTEL_EXPORTER_OTLP_ENDPOINT: zod_1.z.string().optional(),
    // Misc
    DEFAULT_TENANT_NAME: zod_1.z.string().default('Default Org'),
    ALLOW_SIGNUP: zod_1.z
        .string()
        .default('true')
        .transform((val) => val === 'true'),
});
let cachedConfig = null;
function loadConfig() {
    if (cachedConfig)
        return cachedConfig;
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
    const enriched = {
        ...cfg,
        isDev: cfg.NODE_ENV === 'development',
        isTest: cfg.NODE_ENV === 'test',
        isProd: cfg.NODE_ENV === 'production',
    };
    cachedConfig = enriched;
    return enriched;
}
function getConfig() {
    return loadConfig();
}
//# sourceMappingURL=index.js.map