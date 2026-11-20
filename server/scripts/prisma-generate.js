/**
 * Prisma client generation — environment-aware schema selection.
 *
 * Prisma cannot read the datasource `provider` from an environment variable,
 * so the project keeps two schemas that differ only in that one line:
 *
 *   prisma/schema.prisma           → provider = "sqlite"      (local development)
 *   prisma/schema.postgres.prisma  → provider = "postgresql"  (Neon / production)
 *
 * The generated client is provider-specific: generating from the SQLite schema
 * and then connecting to PostgreSQL fails at runtime. This script picks the
 * schema that matches the configured DATABASE_URL so local development and
 * deployment each get a correct client.
 *
 * Override explicitly with PRISMA_TARGET=postgres|sqlite.
 *
 * Never prints DATABASE_URL or any part of it.
 */
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

try {
  require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });
  require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), override: true });
} catch {
  // dotenv optional
}

const PRISMA_DIR = path.resolve(__dirname, '..', 'prisma');

function resolveTarget() {
  const explicit = (process.env.PRISMA_TARGET || '').trim().toLowerCase();
  if (explicit === 'postgres' || explicit === 'postgresql') return 'postgres';
  if (explicit === 'sqlite' || explicit === 'local') return 'sqlite';

  const url = (process.env.DATABASE_URL || '').trim();
  if (/^postgres(ql)?:\/\//i.test(url)) return 'postgres';
  return 'sqlite';
}

function main() {
  const target = resolveTarget();
  const schemaFile = target === 'postgres' ? 'schema.postgres.prisma' : 'schema.prisma';
  const schemaPath = path.join(PRISMA_DIR, schemaFile);

  if (!fs.existsSync(schemaPath)) {
    console.error(`[prisma-generate] Schema not found: ${schemaPath}`);
    process.exitCode = 1;
    return;
  }

  console.log(`[prisma-generate] Target: ${target} → prisma/${schemaFile}`);

  try {
    const relSchema = `prisma/${schemaFile}`;
    if (process.platform === 'win32') {
      execFileSync(
        'cmd.exe',
        ['/c', 'npx', 'prisma', 'generate', `--schema=${relSchema}`],
        { stdio: 'inherit', cwd: path.resolve(__dirname, '..') }
      );
    } else {
      execFileSync(
        'npx',
        ['prisma', 'generate', `--schema=${relSchema}`],
        { stdio: 'inherit', cwd: path.resolve(__dirname, '..') }
      );
    }
  } catch (error) {
    console.error('[prisma-generate] prisma generate failed:', error.message);
    process.exitCode = 1;
  }
}

main();
