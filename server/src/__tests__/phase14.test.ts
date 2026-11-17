import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { createApp } from '../app';
import { prisma } from '../config/db';
import {
  resolveJwtSecret,
  inspectJwtSecret,
  resolveAllowedOrigins,
  ConfigError,
  MIN_JWT_SECRET_LENGTH,
} from '../config';
import {
  sanitizeStorageKey,
  inferContentType,
  StorageObjectNotFoundError,
  LocalStorageDriver,
} from '../services/storage';
import { getStorageDriver, resetStorageDrivers } from '../services/storage';
import {
  RATE_LIMIT_POLICIES,
  RATE_LIMITER_BACKEND,
  getRateLimiterDiagnostics,
} from '../middleware/rateLimiter';

const ORIGINAL_ENV = { ...process.env };

function restoreEnv(): void {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL_ENV);
}

describe('Phase 14 P0.1 — JWT secret hardening', () => {
  afterEach(() => {
    restoreEnv();
  });

  it('rejects a missing JWT_SECRET', () => {
    delete process.env.JWT_SECRET;
    expect(() => resolveJwtSecret()).toThrowError(ConfigError);
    try {
      resolveJwtSecret();
    } catch (error) {
      expect((error as ConfigError).code).toBe('JWT_SECRET_MISSING');
    }
  });

  it('rejects a too-short JWT_SECRET', () => {
    process.env.JWT_SECRET = 'short-value';
    try {
      resolveJwtSecret();
      throw new Error('expected throw');
    } catch (error) {
      expect((error as ConfigError).code).toBe('JWT_SECRET_TOO_WEAK');
    }
  });

  it('rejects the historical hardcoded default', () => {
    // Assembled at runtime so the literal never appears in the source tree.
    const legacy = [
      'ina-geoportal',
      'super-secret',
      'jwt-key',
      '2026',
    ].join('-');
    process.env.JWT_SECRET = legacy;
    try {
      resolveJwtSecret();
      throw new Error('expected throw');
    } catch (error) {
      expect((error as ConfigError).code).toBe('JWT_SECRET_INSECURE');
    }
  });

  it('accepts a strong random secret', () => {
    const strong = 'x'.repeat(MIN_JWT_SECRET_LENGTH) + 'Yz9Qw8Er7Ty6Ui5Op4As3Df2';
    process.env.JWT_SECRET = strong;
    expect(resolveJwtSecret()).toBe(strong);
  });

  it('inspectJwtSecret reports readiness without throwing', () => {
    delete process.env.JWT_SECRET;
    const missing = inspectJwtSecret();
    expect(missing.configured).toBe(false);
    expect(missing.valid).toBe(false);

    process.env.JWT_SECRET = 'a'.repeat(64);
    const ok = inspectJwtSecret();
    expect(ok.configured).toBe(true);
    expect(ok.valid).toBe(true);
    // Never leak the secret itself.
    expect(Object.keys(ok)).not.toContain('secret');
  });
});

describe('Phase 14 P0.6 — CORS allow-list resolution', () => {
  afterEach(() => {
    restoreEnv();
  });

  it('returns an empty allow-list when CORS_ORIGIN is unset (same-origin mode)', () => {
    delete process.env.CORS_ORIGIN;
    expect(resolveAllowedOrigins()).toEqual([]);
  });

  it('never treats a wildcard as an allowed origin', () => {
    process.env.CORS_ORIGIN = '*';
    expect(resolveAllowedOrigins()).toEqual([]);
  });

  it('parses a comma-separated explicit allow-list', () => {
    process.env.CORS_ORIGIN = 'https://a.example, https://b.example';
    expect(resolveAllowedOrigins()).toEqual(['https://a.example', 'https://b.example']);
  });
});

describe('Phase 14 P0.2 — production app factory', () => {
  const app = createApp();
  let server: any;

  beforeAll(async () => {
    await prisma.$connect();
    server = app.listen(0);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    if (server && typeof server.close === 'function') server.close();
  });

  it('exports an Express app without binding the configured port', () => {
    expect(typeof app).toBe('function');
    expect(app.listen).toBeTypeOf('function');
  });

  it('serves the health endpoint with rate-limiter diagnostics', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.rateLimiter).toBeDefined();
    expect(['upstash', 'memory']).toContain(res.body.rateLimiter.backend);
    expect(res.body.config.hasJwtSecret).toBe(true);
  });

  it('does not emit a wildcard CORS header in same-origin mode', async () => {
    const res = await request(app).get('/health');
    const allowOrigin = res.headers['access-control-allow-origin'];
    expect(allowOrigin).not.toBe('*');
  });

  it('keeps the existing API surface reachable', async () => {
    const res = await request(app).get('/api/v1/datasets?page=1&limit=3');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Phase 14 P0.5 — shared rate limiter configuration', () => {
  afterEach(() => {
    restoreEnv();
  });

  it('defines a policy for every protected endpoint family', () => {
    expect(Object.keys(RATE_LIMIT_POLICIES)).toEqual(
      expect.arrayContaining(['global', 'auth', 'login', 'register', 'download', 'write'])
    );
  });

  it('applies stricter limits to login and registration than to global traffic', () => {
    expect(RATE_LIMIT_POLICIES.login.max).toBeLessThan(RATE_LIMIT_POLICIES.global.max);
    expect(RATE_LIMIT_POLICIES.register.max).toBeLessThan(RATE_LIMIT_POLICIES.login.max);
    expect(RATE_LIMIT_POLICIES.download.max).toBeLessThan(RATE_LIMIT_POLICIES.global.max);
  });

  it('reports whether the active backend is shared across instances', () => {
    const diagnostics = getRateLimiterDiagnostics();
    expect(diagnostics.backend).toBe(RATE_LIMITER_BACKEND);

    if (diagnostics.backend === 'upstash') {
      expect(diagnostics.shared).toBe(true);
      expect(diagnostics.productionSafe).toBe(true);
    } else {
      // Memory backend must never claim to be production-safe.
      expect(diagnostics.productionSafe).toBe(false);
      expect(diagnostics.warning).toBeTruthy();
    }
  });
});

describe('Phase 14 P0.3 — storage abstraction', () => {
  beforeAll(() => {
    process.env.STORAGE_DRIVER = 'local';
    resetStorageDrivers();
  });

  afterAll(() => {
    restoreEnv();
    resetStorageDrivers();
  });

  it('sanitises keys and blocks directory traversal', () => {
    expect(sanitizeStorageKey('geojson/a.json')).toBe('geojson/a.json');
    expect(sanitizeStorageKey('../../etc/passwd')).toBe('etc/passwd');
    expect(sanitizeStorageKey('..\\..\\windows\\system32')).toBe('windows/system32');
    expect(() => sanitizeStorageKey('')).toThrowError();
  });

  it('infers content types for stored file kinds', () => {
    expect(inferContentType('layer.geojson')).toBe('application/geo+json');
    expect(inferContentType('doc.pdf')).toBe('application/pdf');
    expect(inferContentType('data.kml')).toBe('application/vnd.google-earth.kml+xml');
    expect(inferContentType('unknown.bin')).toBe('application/octet-stream');
  });

  it('resolves a local driver that reports real fixture metadata', async () => {
    const driver = getStorageDriver('public');
    expect(driver.name).toBe('local');

    const meta = await driver.getMeta('geojson/batas_kabupaten.json');
    expect(meta).not.toBeNull();
    expect(meta!.size).toBeGreaterThan(0);
    expect(meta!.contentType).toBe('application/geo+json');
  });

  it('reports false for a non-existent object without throwing', async () => {
    const driver = getStorageDriver('public');
    await expect(driver.exists('geojson/does-not-exist.json')).resolves.toBe(false);
    await expect(driver.getMeta('geojson/does-not-exist.json')).resolves.toBeNull();
  });

  it('throws StorageObjectNotFoundError when reading a missing object', async () => {
    const driver = getStorageDriver('public');
    await expect(driver.read('geojson/missing.json')).rejects.toBeInstanceOf(
      StorageObjectNotFoundError
    );
  });

  it('never exposes a public URL for the private scope', async () => {
    const privateDriver = getStorageDriver('private');
    expect(privateDriver.getPublicUrl('geojson/batas_kabupaten.json')).toBeNull();
  });

  it('local driver refuses paths outside its root', async () => {
    const isolated = new LocalStorageDriver('private', process.cwd());
    // sanitize strips traversal, so this stays inside the root by construction.
    await expect(isolated.exists('../../../../etc/passwd')).resolves.toBe(false);
  });
});

describe('Phase 14 P0.3/P0.7 — protected downloads and data integrity', () => {
  const app = createApp();
  let agent: any;

  beforeAll(async () => {
    await prisma.$connect();
    agent = request(app);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('denies anonymous dataset download', async () => {
    const res = await agent
      .post('/api/v1/datasets/ds-batas-kabkot/download')
      .send({ format: 'geojson', purpose: 'Riset' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
    // Google-specific wording must be gone.
    expect(res.body.error.message.toLowerCase()).not.toContain('google');
  });

  it('denies anonymous document download', async () => {
    const res = await agent.get('/api/v1/documents/sdg-01/download');
    expect(res.status).toBe(401);
    expect(res.body.error.message.toLowerCase()).not.toContain('google');
  });

  it('allows an authenticated dataset download and streams the file', async () => {
    const login = await agent
      .post('/api/v1/auth/login')
      .send({ email: 'demo@inageoportal.go.id', password: 'Password123!' });
    expect(login.status).toBe(200);
    const token = login.body.data.token;

    const res = await agent
      .get('/api/v1/datasets/ds-batas-kabkot/download-file?format=geojson')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('attachment');
  });

  it('returns 404 (not 500) when a document PDF is genuinely absent', async () => {
    const login = await agent
      .post('/api/v1/auth/login')
      .send({ email: 'demo@inageoportal.go.id', password: 'Password123!' });
    const token = login.body.data.token;

    const res = await agent
      .get('/api/v1/documents/sdg-01/download')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('FILE_NOT_FOUND');
  });

  it('labels email/password registrations as local, never google', async () => {
    const unique = `phase14.provider.${Date.now()}@geoportal-test.id`;
    const res = await agent.post('/api/v1/auth/register').send({
      name: 'Penguji Provider',
      email: unique,
      password: 'PasswordUji123!',
      institution: 'Tim QA',
    });

    expect(res.status).toBe(201);
    const created = await prisma.user.findUnique({ where: { email: unique } });
    expect(created?.provider).toBe('local');
    expect(created?.googleId).toBeNull();
    expect(created?.password).toBeTruthy();

    // Cleanup for idempotent re-runs.
    if (created) await prisma.user.delete({ where: { id: created.id } });
  });
});

describe('Phase 14 P0.2 — Vercel function entry points', () => {
  const apiDir = path.resolve(__dirname, '../../../api');

  it('ships both required function entry files', () => {
    expect(fs.existsSync(path.join(apiDir, 'index.ts'))).toBe(true);
    expect(fs.existsSync(path.join(apiDir, '[...path].ts'))).toBe(true);
  });

  it('never starts a listener from a serverless entry point', () => {
    for (const file of ['index.ts', '[...path].ts']) {
      const source = fs
        .readFileSync(path.join(apiDir, file), 'utf-8')
        // Strip comments so prose mentioning the listener is not a false positive.
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '');

      expect(source).not.toMatch(/\bapp\.listen\s*\(/);
      expect(source).not.toMatch(/\bserver\.listen\s*\(/);
      expect(source).toMatch(/export\s+default\s+app/);
      expect(source).toMatch(/from '\.\.\/server\/src\/app'/);
    }
  });

  it('validates the JWT secret at cold start', () => {
    for (const file of ['index.ts', '[...path].ts']) {
      const source = fs.readFileSync(path.join(apiDir, file), 'utf-8');
      expect(source).toMatch(/resolveJwtSecret\(\)/);
    }
  });

  it('rebuilds the app factory independently of the dev entry point', () => {
    const fresh = createApp();
    expect(fresh).not.toBe(createApp());
  });
});

describe('Phase 14 P0.4 — PostgreSQL schema parity', () => {
  const prismaDir = path.resolve(__dirname, '../../prisma');

  function readSchema(name: string): string {
    return fs.readFileSync(path.join(prismaDir, name), 'utf-8');
  }

  it('declares the expected providers in both schema variants', () => {
    expect(readSchema('schema.prisma')).toMatch(/provider\s*=\s*"sqlite"/);
    expect(readSchema('schema.postgres.prisma')).toMatch(/provider\s*=\s*"postgresql"/);
  });

  it('keeps the model surface identical between SQLite and PostgreSQL', () => {
    const models = (source: string) =>
      [...source.matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => m[1]).sort();

    const sqliteModels = models(readSchema('schema.prisma'));
    const postgresModels = models(readSchema('schema.postgres.prisma'));

    expect(sqliteModels.length).toBeGreaterThanOrEqual(6);
    expect(postgresModels).toEqual(sqliteModels);
    expect(sqliteModels).toEqual(
      expect.arrayContaining([
        'User',
        'Category',
        'NetworkNode',
        'Dataset',
        'Bookmark',
        'DownloadHistory',
      ])
    );
  });

  it('preserves UUID identifiers so references survive migration', () => {
    const postgres = readSchema('schema.postgres.prisma');
    const sqlite = readSchema('schema.prisma');

    for (const source of [sqlite, postgres]) {
      expect(source).toMatch(/id\s+String\s+@id\s+@default\(uuid\(\)\)/);
      // No auto-increment integer keys anywhere — those would require remapping.
      expect(source).not.toMatch(/@default\(autoincrement\(\)\)/);
    }
  });

  it('targets a Vercel-compatible Prisma engine binary', () => {
    expect(readSchema('schema.postgres.prisma')).toContain('rhel-openssl-3.0.x');
    expect(readSchema('schema.prisma')).toContain('rhel-openssl-3.0.x');
  });

  it('defaults new accounts to the local provider', () => {
    const sqlite = readSchema('schema.prisma');
    expect(sqlite).toMatch(/provider\s+String\s+@default\("local"\)/);
    expect(sqlite).toMatch(/emailVerified\s+Boolean\s+@default\(false\)/);
  });
});
