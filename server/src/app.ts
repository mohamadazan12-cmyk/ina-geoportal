import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import { config } from './config';
import apiRouter from './routes';
import { errorHandler } from './middleware/errorHandler';
import { globalRateLimiter, getRateLimiterDiagnostics } from './middleware/rateLimiter';

/**
 * Create and configure the Express application.
 *
 * No side effects (no .listen()) — suitable for serverless import.
 */
export function createApp(): express.Express {
  const app = express();

  // -------------------------------------------------------------------------
  // Trust proxy (Vercel / Cloudflare / any edge proxy)
  // -------------------------------------------------------------------------
  app.set('trust proxy', 1);

  // -------------------------------------------------------------------------
  // Security headers (helmet default + CORS overrides handled below)
  // -------------------------------------------------------------------------
  app.use(
    helmet({
      // Disable CSP for now — Vite inline styles/emitted assets may need
      // explicit policy tuning. Can be tightened later.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // -------------------------------------------------------------------------
  // Logging — only in development
  // -------------------------------------------------------------------------
  if (!config.isProduction) {
    app.use(morgan('dev'));
  }

  // -------------------------------------------------------------------------
  // CORS — same-origin by default (no CORS headers when empty).
  // When CORS_ORIGIN is explicitly provided, allow only those origins.
  // -------------------------------------------------------------------------
  if (config.hasExplicitCorsOrigin) {
    app.use(
      cors({
        origin: config.allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
      })
    );
  } else if (!config.isProduction) {
    // Development: allow the Vite dev server origin so the SPA can call
    // the API from localhost:5173 even though it's technically cross-origin.
    app.use(
      cors({
        origin: process.env.DEV_CLIENT_ORIGIN || 'http://localhost:5173',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
      })
    );
  }
  // Production + no CORS_ORIGIN → no cors() middleware → requests must be
  // same-origin (i.e. SPA served from the same Vercel project). This is the
  // intended architecture and avoids wildcard CORS entirely.

  // -------------------------------------------------------------------------
  // Body parsing (limits intentionally conservative for serverless)
  // -------------------------------------------------------------------------
  app.use(express.json({ limit: '4mb' }));
  app.use(express.urlencoded({ extended: true, limit: '4mb' }));

  // -------------------------------------------------------------------------
  // Global rate limiting (shared Upstash or production-safe in-memory)
  // -------------------------------------------------------------------------
  app.use('/api', globalRateLimiter);

  // -------------------------------------------------------------------------
  // Health check (un-throttled, public)
  //
  // Registered on both `/health` and `/api/health` so it stays reachable
  // regardless of whether the platform forwards the rewritten or the original
  // path to the serverless function.
  // -------------------------------------------------------------------------
  const healthHandler: express.RequestHandler = (_req, res) => {
    const rlDiag = getRateLimiterDiagnostics();
    res.json({
      status: 'OK',
      app: 'Ina-Geoportal Web App Redesign v2.0 Backend',
      timestamp: new Date().toISOString(),
      environment: config.isProduction ? 'production' : 'development',
      rateLimiter: {
        backend: rlDiag.backend,
        shared: rlDiag.shared,
        productionSafe: rlDiag.productionSafe,
        ...(rlDiag.warning ? { warning: rlDiag.warning } : {}),
      },
      config: {
        hasJwtSecret: true,
        hasCorsOrigin: config.hasExplicitCorsOrigin,
        hasUpstash: config.hasUpstashCredentials,
        storageDriver: config.storageDriver,
      },
    });
  };

  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  // -------------------------------------------------------------------------
  // API v1 Mount
  // -------------------------------------------------------------------------
  app.use('/api/v1', apiRouter);

  // -------------------------------------------------------------------------
  // Central error handler (must be last)
  // -------------------------------------------------------------------------
  app.use(errorHandler);

  return app;
}

/** Default export for serverless platforms. */
export const app = createApp();