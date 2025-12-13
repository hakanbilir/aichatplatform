// apps/api-gateway/src/config/secrets.ts

/**
 * Centralized secrets management
 * All secrets should be loaded from environment variables or a secure vault
 * Never commit secrets to version control
 */

export interface SecretsConfig {
  // Database
  databaseUrl: string;

  // JWT
  jwtPrivateKey: string;
  jwtPublicKey: string;

  // PAYTR
  paytrMerchantId: string;
  paytrMerchantKey: string;
  paytrMerchantSalt: string;

  // LLM Providers
  ollamaBaseUrl: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;

  // Object Storage (S3/MinIO)
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
  s3Bucket?: string;
  s3Endpoint?: string;

  // Email
  smtpHost?: string;
  smtpUser?: string;
  smtpPassword?: string;

  // Other
  encryptionKey?: string;
}

export function loadSecrets(): SecretsConfig {
  const required = [
    'DATABASE_URL',
    'JWT_PRIVATE_KEY',
    'JWT_PUBLIC_KEY',
    'OLLAMA_BASE_URL'
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required secret: ${key}`);
    }
  }

  return {
    databaseUrl: process.env.DATABASE_URL!,
    jwtPrivateKey: process.env.JWT_PRIVATE_KEY!,
    jwtPublicKey: process.env.JWT_PUBLIC_KEY!,
    paytrMerchantId: process.env.PAYTR_MERCHANT_ID || '',
    paytrMerchantKey: process.env.PAYTR_MERCHANT_KEY || '',
    paytrMerchantSalt: process.env.PAYTR_MERCHANT_SALT || '',
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    s3AccessKeyId: process.env.S3_ACCESS_KEY_ID,
    s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    s3Bucket: process.env.S3_BUCKET,
    s3Endpoint: process.env.S3_ENDPOINT,
    smtpHost: process.env.SMTP_HOST,
    smtpUser: process.env.SMTP_USER,
    smtpPassword: process.env.SMTP_PASSWORD,
    encryptionKey: process.env.ENCRYPTION_KEY
  };
}
