import type { Request, Response, NextFunction } from 'express';
import { config, ConfigError } from '../config';
import { sendError } from '../utils/responseFormatter';

export type RateLimitScope =
  | 'global'
  | 'auth'
  | 'login'
  | 'register'
  | 'download'
  | 'write';

export interface RateLimitPolicy {
  /** Sliding window duration in milliseconds. */
  windowMs: number;
  /** Maximum number of requests allowed inside the window. */
  max: number;
  /** Human-readable message returned when the limit is exceeded. */
  message: string;
}

/**
 * Per-scope policies. Authentication and download endpoints get tighter
 * budgets than read-only catalogue traffic.
 */
export const RATE_LIMIT_POLICIES: Record<RateLimitScope, RateLimitPolicy> = {
  global: {
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: 'Terlalu banyak permintaan dari IP ini, silakan coba lagi beberapa saat.',
  },
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 60,
    message: 'Terlalu banyak percobaan autentikasi. Silakan tunggu beberapa menit.',
  },
  login: {
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Terlalu banyak percobaan login. Silakan tunggu 15 menit sebelum mencoba lagi.',
  },
  register: {
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: 'Terlalu banyak pendaftaran akun dari alamat ini. Silakan coba lagi nanti.',
  },
  download: {
    windowMs: 60 * 60 * 1000,
    max: 100,
    message: 'Kuota permintaan unduhan Anda telah tercapai. Silakan coba lagi nanti.',
  },
  write: {
    windowMs: 60 * 1000,
    max: 30,
    message: 'Terlalu banyak operasi tulis. Silakan perlambat permintaan Anda.',
  },
};

export type RateLimiterBackend = 'upstash' | 'memory';

export interface RateLimiterDiagnostics {
  backend: RateLimiterBackend;
  shared: boolean;
  productionSafe: boolean;
  warning?: string;
}

let diagnostics: RateLimiterDiagnostics = {
  backend: 'memory',
  shared: false,
  productionSafe: false,
  warning: 'Rate limiter belum diinisialisasi.',
};

export function getRateLimiterDiagnostics(): RateLimiterDiagnostics {
  return diagnostics;
}

/** Resolve the client IP, honouring Vercel's proxy chain. */
function clientKey(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return String(forwarded[0]).split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

type Limiter = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/** Minimal in-process fixed-window limiter (development and tests only). */
function createMemoryLimiter(policy: RateLimitPolicy, scope: RateLimitScope): Limiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  // Opportunistic cleanup so the map cannot grow unbounded in a long-lived
  // development process.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, Math.min(policy.windowMs, 60_000));
  if (typeof sweep.unref === 'function') sweep.unref();

  return async (req, res, next) => {
    if (process.env.NODE_ENV === 'test') {
      next();
      return;
    }

    const key = `${scope}:${clientKey(req)}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + policy.windowMs });
      res.setHeader('X-RateLimit-Limit', String(policy.max));
      res.setHeader('X-RateLimit-Remaining', String(policy.max - 1));
      next();
      return;
    }

    bucket.count += 1;
    const remaining = Math.max(0, policy.max - bucket.count);
    res.setHeader('X-RateLimit-Limit', String(policy.max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > policy.max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      sendError(res, 'TOO_MANY_REQUESTS', policy.message, 429, {
        scope,
        retryAfterSeconds: retryAfter,
      });
      return;
    }

    next();
  };
}

/** Upstash Redis sliding-window limiter (shared across serverless instances). */
function createUpstashLimiter(
  policy: RateLimitPolicy,
  scope: RateLimitScope,
  RatelimitCtor: any,
  RedisCtor: any
): Limiter {
  const redis = new RedisCtor({
    url: config.upstashRedisRestUrl,
    token: config.upstashRedisRestToken,
  });

  const ratelimit = new RatelimitCtor({
    redis,
    limiter: RatelimitCtor.slidingWindow(policy.max, `${Math.round(policy.windowMs / 1000)} s`),
    prefix: `ina-geoportal:rl:${scope}`,
    analytics: false,
  });

  return async (req, res, next) => {
    try {
      const identifier = `${clientKey(req)}`;
      const result = await ratelimit.limit(identifier);

      res.setHeader('X-RateLimit-Limit', String(result.limit ?? policy.max));
      res.setHeader('X-RateLimit-Remaining', String(result.remaining ?? 0));
      if (result.reset) {
        res.setHeader('X-RateLimit-Reset', String(Math.ceil(result.reset / 1000)));
      }
      res.setHeader('X-RateLimit-Backend', 'upstash');

      if (!result.success) {
        const retryAfter = Math.max(
          1,
          Math.ceil(((result.reset || Date.now() + policy.windowMs) - Date.now()) / 1000)
        );
        res.setHeader('Retry-After', String(retryAfter));
        sendError(res, 'TOO_MANY_REQUESTS', policy.message, 429, {
          scope,
          retryAfterSeconds: retryAfter,
        });
        return;
      }

      next();
    } catch (error) {
      // Never let an upstream Redis hiccup take the whole API down, but make
      // the degradation visible instead of failing open silently.
      console.error(
        `[rate-limit] Upstash call failed for scope "${scope}":`,
        error instanceof Error ? error.message : error
      );
      res.setHeader('X-RateLimit-Degraded', 'upstash-unavailable');
      next();
    }
  };
}

/**
 * Choose the limiter backend once, at module initialisation time.
 *
 * ARSITEKTUR RATE LIMITING:
 * 1. Distributed Protection (Upstash Redis REST):
 *    Menyediakan kuota rate limiting bersama lintas seluruh instance serverless Vercel.
 *    Diaktifkan saat UPSTASH_REDIS_REST_URL dan UPSTASH_REDIS_REST_TOKEN terkonfigurasi.
 * 2. Fallback In-Memory (Per-Instance):
 *    Menjaga ketersediaan aplikasi agar tidak crash saat Upstash belum tersedia, atau saat
 *    RATE_LIMIT_ALLOW_MEMORY=true.
 *    CATATAN PENTING: Rate limiter in-memory ini bersifat per-instance (process-local) dan
 *    bukan distributed protection; kuota dihitung per container serverless dan ter-reset
 *    saat instance baru dibuat/dimatikan.
 */
export const RATE_LIMITER_BACKEND: RateLimiterBackend = (() => {
  const allowMemory = (process.env.RATE_LIMIT_ALLOW_MEMORY || '').toLowerCase() === 'true';

  if (config.hasUpstashCredentials) {
    diagnostics = {
      backend: 'upstash',
      shared: true,
      productionSafe: true,
    };
    return 'upstash';
  }

  // Fallback in-memory jika Upstash belum terkonfigurasi
  const warningMsg =
    'DOKUMENTASI ARSITEKTUR: Menggunakan fallback in-memory rate limiter per-instance (non-distributed). ' +
    'Proteksi kuota bersama lintas instance serverless membutuhkan konfigurasi UPSTASH_REDIS_REST_URL dan UPSTASH_REDIS_REST_TOKEN.';

  if (config.isProduction) {
    console.warn(`[rate-limit] ${warningMsg}`);
  }

  diagnostics = {
    backend: 'memory',
    shared: false,
    productionSafe: false,
    warning: warningMsg,
  };
  return 'memory';
})();

/** Lazily-resolved Upstash modules so dev installs never load them. */
let upstashModules: { Ratelimit: any; Redis: any } | null = null;

async function loadUpstashModules(): Promise<{ Ratelimit: any; Redis: any }> {
  if (upstashModules) return upstashModules;
  const [ratelimitModule, redisModule] = await Promise.all([
    import('@upstash/ratelimit'),
    import('@upstash/redis'),
  ]);
  upstashModules = {
    Ratelimit: (ratelimitModule as any).Ratelimit ?? (ratelimitModule as any).default,
    Redis: (redisModule as any).Redis ?? (redisModule as any).default,
  };
  return upstashModules;
}

/**
 * Build a limiter middleware for the given scope.
 *
 * When the Upstash backend is selected the modules are imported lazily and the
 * returned middleware defers to a small readiness gate until they resolve, so
 * mounting order stays synchronous.
 */
export function createRateLimiter(scope: RateLimitScope): Limiter {
  const policy = RATE_LIMIT_POLICIES[scope];

  if (RATE_LIMITER_BACKEND === 'memory') {
    return createMemoryLimiter(policy, scope);
  }

  let resolved: Limiter | null = null;
  let loadFailure: Error | null = null;
  const ready = loadUpstashModules()
    .then(({ Ratelimit, Redis }) => {
      resolved = createUpstashLimiter(policy, scope, Ratelimit, Redis);
    })
    .catch((error) => {
      loadFailure = error instanceof Error ? error : new Error(String(error));
      console.error(`[rate-limit] Gagal memuat Upstash untuk scope "${scope}":`, loadFailure.message);
    });

  return async (req, res, next) => {
    await ready;
    if (resolved) {
      await resolved(req, res, next);
      return;
    }
    if (loadFailure) {
      // Upstash was requested but the SDK could not load — surface it.
      res.setHeader('X-RateLimit-Degraded', 'upstash-load-failed');
      next();
      return;
    }
    // Should be unreachable; keep the request moving rather than hang.
    next();
  };
}

export const globalRateLimiter = createRateLimiter('global');
export const authRateLimiter = createRateLimiter('auth');
export const loginRateLimiter = createRateLimiter('login');
export const registerRateLimiter = createRateLimiter('register');
export const downloadRateLimiter = createRateLimiter('download');
export const writeRateLimiter = createRateLimiter('write');
