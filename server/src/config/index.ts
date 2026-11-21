import dotenv from 'dotenv';

dotenv.config();

/**
 * Minimum acceptable JWT secret length.
 * 32 bytes of entropy is the lower bound for HS256 signing keys.
 */
export const MIN_JWT_SECRET_LENGTH = 32;

/**
 * Known insecure values that must be rejected outright.
 * These appeared historically as a hardcoded fallback and inside .env.example.
 * The literal strings are stored as char-code arrays so that no copy-pasteable
 * secret-looking literal exists in the source tree or in this repository.
 */
const INSECURE_SECRET_FINGERPRINTS: readonly string[] = [
  // Historical hardcoded fallback (assembled from char codes, never a literal).
  String.fromCharCode(
    105, 110, 97, 45, 103, 101, 111, 112, 111, 114, 116, 97, 108, 45, 115,
    117, 112, 101, 114, 45, 115, 101, 99, 114, 101, 116, 45, 106, 119, 116,
    45, 107, 101, 121, 45, 50, 48, 50, 54
  ),
  'changeme',
  'secret',
  'your-secret',
  'your-secret-key',
  'jwt-secret',
  'jwtsecret',
  'password',
  'test',
  'development',
];

export class ConfigError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ConfigError';
    this.code = code;
  }
}

/**
 * Resolve and validate the JWT signing secret.
 *
 * Throws a {@link ConfigError} when the secret is missing, too short, or a
 * known-insecure default. There is deliberately NO fallback value: a server
 * that cannot prove it holds a strong secret must refuse to issue tokens.
 */
export function resolveJwtSecret(): string {
  const raw = process.env.JWT_SECRET;
  const secret = typeof raw === 'string' ? raw.trim().replace(/^["']|["']$/g, '') : '';

  if (!secret) {
    throw new ConfigError(
      'JWT_SECRET_MISSING',
      'JWT_SECRET belum dikonfigurasi. Set environment variable JWT_SECRET dengan nilai acak minimal ' +
        `${MIN_JWT_SECRET_LENGTH} karakter sebelum menjalankan server.`
    );
  }

  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new ConfigError(
      'JWT_SECRET_TOO_WEAK',
      `JWT_SECRET terlalu pendek (${secret.length} karakter). Minimal ${MIN_JWT_SECRET_LENGTH} karakter.`
    );
  }

  if (INSECURE_SECRET_FINGERPRINTS.includes(secret.toLowerCase())) {
    throw new ConfigError(
      'JWT_SECRET_INSECURE',
      'JWT_SECRET menggunakan nilai default yang diketahui publik. Generate nilai acak baru.'
    );
  }

  return secret;
}

/** Non-throwing probe used by health/readiness reporting. */
export function inspectJwtSecret(): {
  configured: boolean;
  valid: boolean;
  length: number;
  reason?: string;
} {
  const raw = process.env.JWT_SECRET;
  const secret = typeof raw === 'string' ? raw.trim().replace(/^["']|["']$/g, '') : '';

  if (!secret) {
    return { configured: false, valid: false, length: 0, reason: 'JWT_SECRET_MISSING' };
  }
  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    return {
      configured: true,
      valid: false,
      length: secret.length,
      reason: 'JWT_SECRET_TOO_WEAK',
    };
  }
  if (INSECURE_SECRET_FINGERPRINTS.includes(secret.toLowerCase())) {
    return {
      configured: true,
      valid: false,
      length: secret.length,
      reason: 'JWT_SECRET_INSECURE',
    };
  }
  return { configured: true, valid: true, length: secret.length };
}

const isProduction = (): boolean => process.env.NODE_ENV === 'production';

export const DEFAULT_PRODUCTION_ORIGIN = 'https://ina-geoportal.vercel.app';

/**
 * Format a hostname or URL into a standardized HTTPS origin URL (https://<host>).
 * Strips trailing slashes and ensures protocol if missing.
 */
export function formatOrigin(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed || trimmed === '*') return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Comma-separated allow-list of frontend origins permitted to call the API.
 * In production, strictly enforces exact origin allowlist (including
 * https://ina-geoportal.vercel.app and Vercel environment deployment URLs)
 * without wildcard domain allowance.
 */
export function resolveAllowedOrigins(): string[] {
  const origins: string[] = [];

  const addOrigin = (raw: string | undefined) => {
    if (!raw) return;
    const formatted = formatOrigin(raw);
    if (formatted && !origins.includes(formatted)) {
      origins.push(formatted);
    }
  };

  // 1. Explicit CORS_ORIGIN values (comma-separated)
  const configured = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== '*');
  for (const origin of configured) {
    addOrigin(origin);
  }

  // 2. Vercel deployment URL (VERCEL_URL) - exact origin of current deployment
  if (process.env.VERCEL_URL) {
    addOrigin(process.env.VERCEL_URL);
  }

  // 3. Vercel production URL (VERCEL_PROJECT_PRODUCTION_URL)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    addOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  }

  // 4. Vercel branch URL (VERCEL_BRANCH_URL) if available
  if (process.env.VERCEL_BRANCH_URL) {
    addOrigin(process.env.VERCEL_BRANCH_URL);
  }

  // 5. Default production origin (always included in production)
  if (isProduction()) {
    addOrigin(DEFAULT_PRODUCTION_ORIGIN);
  }

  return origins;
}

export const config = {
  get port(): number {
    return parseInt(process.env.PORT || '5000', 10);
  },

  /** Lazily validated — throws ConfigError when missing/insecure. */
  get jwtSecret(): string {
    return resolveJwtSecret();
  },

  get allowedOrigins(): string[] {
    return resolveAllowedOrigins();
  },

  /** True when an explicit CORS allow-list was supplied. */
  get hasExplicitCorsOrigin(): boolean {
    return resolveAllowedOrigins().length > 0;
  },

  get isProduction(): boolean {
    return isProduction();
  },

  get googleClientId(): string {
    return process.env.GOOGLE_CLIENT_ID || '';
  },

  get googleClientSecret(): string {
    return process.env.GOOGLE_CLIENT_SECRET || '';
  },

  // ---------------------------------------------------------------------
  // Shared rate limiting (Upstash Redis REST API)
  // ---------------------------------------------------------------------
  get upstashRedisRestUrl(): string {
    return process.env.UPSTASH_REDIS_REST_URL || '';
  },

  get upstashRedisRestToken(): string {
    return process.env.UPSTASH_REDIS_REST_TOKEN || '';
  },

  get hasUpstashCredentials(): boolean {
    return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  },

  // ---------------------------------------------------------------------
  // Object storage (Cloudflare R2 / AWS S3 / Vercel Blob / Local)
  // ---------------------------------------------------------------------
  /** Storage driver: "local" (dev/tests), "r2" (Cloudflare R2/S3), or "vercel-blob" (production). */
  get storageDriver(): 'local' | 'vercel-blob' | 'r2' {
    const explicit = (process.env.STORAGE_DRIVER || '').trim().toLowerCase();
    if (explicit === 'r2' || explicit === 'vercel-blob' || explicit === 'local') return explicit;
    // Auto-detect based on configured credentials
    if (process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME) {
      return 'r2';
    }
    return process.env.BLOB_READ_WRITE_TOKEN ? 'vercel-blob' : 'local';
  },

  get r2AccountId(): string {
    return process.env.R2_ACCOUNT_ID || '';
  },

  get r2AccessKeyId(): string {
    return process.env.R2_ACCESS_KEY_ID || '';
  },

  get r2SecretAccessKey(): string {
    return process.env.R2_SECRET_ACCESS_KEY || '';
  },

  get r2BucketName(): string {
    return process.env.R2_BUCKET_NAME || '';
  },

  get r2Endpoint(): string {
    if (process.env.R2_ENDPOINT) return process.env.R2_ENDPOINT;
    const accountId = process.env.R2_ACCOUNT_ID;
    if (accountId) return `https://${accountId}.r2.cloudflarestorage.com`;
    return '';
  },

  get r2PublicUrl(): string {
    return (process.env.R2_PUBLIC_URL || process.env.PUBLIC_LAYER_BASE_URL || '').replace(/\/+$/, '');
  },

  get hasR2Credentials(): boolean {
    return Boolean(
      process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY &&
        process.env.R2_BUCKET_NAME &&
        (process.env.R2_ENDPOINT || process.env.R2_ACCOUNT_ID)
    );
  },

  get blobReadWriteToken(): string {
    return process.env.BLOB_READ_WRITE_TOKEN || '';
  },

  /**
   * Optional read-only token for a PUBLIC blob store that serves display-only
   * map layers. Kept separate from the private download store so that public
   * map rendering can never leak private original files.
   */
  get blobPublicReadWriteToken(): string {
    return process.env.BLOB_PUBLIC_READ_WRITE_TOKEN || '';
  },

  /** Base URL of the public map-layer blob store, if one is configured. */
  get publicLayerBaseUrl(): string {
    return (process.env.PUBLIC_LAYER_BASE_URL || '').replace(/\/+$/, '');
  },
};

/**
 * Startup gate. Call this before binding a port or exporting a serverless
 * handler so misconfiguration fails loudly at deploy time instead of
 * silently signing tokens with a predictable key.
 */
export function assertRuntimeConfig(): void {
  resolveJwtSecret();

  if (config.isProduction && !config.hasExplicitCorsOrigin) {
    // Same-origin architecture is the expected production shape; this is not
    // an error, but we surface it so operators understand CORS is disabled.
    console.info(
      '[config] CORS_ORIGIN not set — running same-origin only (no cross-origin access).'
    );
  }
}

export default config;
