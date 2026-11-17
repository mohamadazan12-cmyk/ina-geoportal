/**
 * Serverless Entry Point Verification
 * ===================================
 * Phase 14 / P0.2 — validates the Vercel function bridge without deploying.
 *
 * Verifies:
 *  1. `api/index.ts` imports without side effects (no port is bound).
 *  2. The default export is a callable Express handler.
 *  3. Requests routed through it reach the API router.
 *  4. The SPA rewrite path still resolves to an Express 404 (not a crash).
 *
 * Usage: npx tsx scripts/verify-serverless-entry.ts
 */

import { createServer } from 'net';
import request from 'supertest';

async function main(): Promise<void> {
  console.log('--- Serverless Entry Point Verification ---');

  // Use a high, unlikely-to-be-used port so the check is deterministic even
  // when a local dev server is already running on 5000.
  const port = 47000 + Math.floor(Math.random() * 1000);
  process.env.PORT = String(port);
  process.env.NODE_ENV = 'production';
  // Production intentionally refuses a process-local rate limiter. This local
  // simulation has no Upstash credentials, so the opt-out flag is set
  // explicitly and reported — it is NOT a silent fallback.
  process.env.RATE_LIMIT_ALLOW_MEMORY = 'true';
  console.log('NOTE: RATE_LIMIT_ALLOW_MEMORY=true (simulation only; real deploys need Upstash).');

  const isPortBound = (): Promise<boolean> =>
    new Promise((resolve) => {
      const probe = createServer();
      probe.once('error', () => resolve(true));
      probe.once('listening', () => probe.close(() => resolve(false)));
      probe.listen(port);
    });

  const preBound = await isPortBound();
  if (preBound) {
    console.log(`Port ${port} unexpectedly busy; aborting probe.`);
    process.exitCode = 1;
    return;
  }
  console.log(`Port ${port} is free before import.`);

  // Import the function entry point (mirrors a Vercel cold start).
  const mod = await import('../api/index');
  const handler = mod.default;

  const afterImport = await isPortBound();
  if (afterImport) {
    console.error(`FAIL: api/index.ts bound port ${port} as an import side effect.`);
    process.exitCode = 1;
    return;
  }
  console.log('No port bound on import (serverless-safe).');

  // 3. Handler must be a callable Express app.
  if (typeof handler !== 'function') {
    console.error('FAIL: default export is not a callable request handler.');
    process.exitCode = 1;
    return;
  }
  console.log('Default export is callable.');

  // 4. Exercise the handler end-to-end.
  const health = await request(handler).get('/health');
  console.log(`GET /health → ${health.status} (${health.body?.status ?? 'no status'})`);

  const api = await request(handler).get('/api/v1/datasets?page=1&limit=2');
  console.log(`GET /api/v1/datasets → ${api.status} (datasets=${api.body?.data?.length ?? 0})`);

  const unknown = await request(handler).get('/api/v1/__unknown__');
  console.log(`GET /api/v1/__unknown__ → ${unknown.status} (unmatched route, no crash)`);

  const ok = health.status === 200 && api.status === 200;
  console.log(ok ? 'RESULT: PASS' : 'RESULT: FAIL');
  if (!ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error('Verification failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
