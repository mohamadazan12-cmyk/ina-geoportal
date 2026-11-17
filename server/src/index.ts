import { app } from './app';
import { config, assertRuntimeConfig } from './config';

// ---------------------------------------------------------------------------
// Local development startup ONLY — serverless deploys import app.ts directly
// (via api/index.ts). Tests import this module too, so we must never bind a
// port under NODE_ENV=test.
// ---------------------------------------------------------------------------
const shouldListen =
  process.env.NODE_ENV !== 'test' && process.env.VERCEL !== '1' && !process.env.VERCEL_ENV;

let server: any = null;

if (shouldListen) {
  // Validate configuration early so misconfiguration fails fast.
  assertRuntimeConfig();

  server = app.listen(config.port, () => {
    console.log(`🚀 Ina-Geoportal v2 Server running on http://localhost:${config.port}`);
    console.log(`📡 API v1 endpoints mounted on http://localhost:${config.port}/api/v1`);
    console.log(`🗄️  Storage driver: ${config.storageDriver}`);
    console.log(
      `🛡️  Rate limiter: ${config.hasUpstashCredentials ? 'Upstash (shared)' : 'in-memory (dev)'}`
    );
  });
}

export { app, server };
export default app;
