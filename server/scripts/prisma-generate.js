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

const SERVER_DIR = path.resolve(__dirname, '..');
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const PRISMA_DIR = path.resolve(SERVER_DIR, 'prisma');

function resolveTarget() {
  const explicit = (process.env.PRISMA_TARGET || '').trim().toLowerCase();
  if (explicit === 'postgres' || explicit === 'postgresql') return 'postgres';
  if (explicit === 'sqlite' || explicit === 'local') return 'sqlite';

  const url = (process.env.DATABASE_URL || '').trim();
  if (/^postgres(ql)?:\/\//i.test(url)) return 'postgres';
  return 'sqlite';
}

function findLocalPrisma() {
  // Collect candidate base directories: service server dir, monorepo root, cwd, script dir
  const candidateBases = [
    SERVER_DIR,
    ROOT_DIR,
    process.cwd(),
    __dirname,
  ];

  // Walk up ancestor directories from SERVER_DIR
  let curr = SERVER_DIR;
  while (curr) {
    if (!candidateBases.includes(curr)) {
      candidateBases.push(curr);
    }
    const parent = path.dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }

  // 1. Check direct file path for prisma/build/index.js in node_modules of all candidates
  for (const base of candidateBases) {
    const directJs = path.join(base, 'node_modules', 'prisma', 'build', 'index.js');
    if (fs.existsSync(directJs)) {
      const pkgPath = path.join(base, 'node_modules', 'prisma', 'package.json');
      let version = '6.19.3';
      try {
        if (fs.existsSync(pkgPath)) {
          version = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version || version;
        }
      } catch {}
      return { type: 'node', path: directJs, version };
    }
  }

  // 2. Resolve via require.resolve from candidate bases
  for (const base of candidateBases) {
    try {
      const pkgJsonPath = require.resolve('prisma/package.json', { paths: [base] });
      const pkgDir = path.dirname(pkgJsonPath);
      const directJs = path.join(pkgDir, 'build', 'index.js');
      if (fs.existsSync(directJs)) {
        let version = '6.19.3';
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
          version = pkg.version || version;
        } catch {}
        return { type: 'node', path: directJs, version };
      }
    } catch {}
  }

  // 3. Check local node_modules/.bin/prisma executable directly
  for (const base of candidateBases) {
    const binDir = path.join(base, 'node_modules', '.bin');
    const binCandidates = process.platform === 'win32'
      ? [
          path.join(binDir, 'prisma.cmd'),
          path.join(binDir, 'prisma.exe'),
          path.join(binDir, 'prisma')
        ]
      : [path.join(binDir, 'prisma')];

    for (const binPath of binCandidates) {
      if (fs.existsSync(binPath)) {
        return { type: 'exec', path: binPath, version: 'local-bin' };
      }
    }
  }

  return null;
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

  const localPrisma = findLocalPrisma();
  if (!localPrisma) {
    console.error('[prisma-generate] Error: Local Prisma CLI not found in node_modules.');
    console.error('[prisma-generate] Refusing to use "npx prisma" to prevent downloading unpinned or RC versions from npm.');
    console.error('[prisma-generate] Please ensure "prisma" (v6.19.3) is installed in dependencies.');
    process.exit(1);
  }

  console.log(`[prisma-generate] Using local Prisma CLI v${localPrisma.version} (${localPrisma.path})`);

  try {
    const relSchema = `prisma/${schemaFile}`;
    if (localPrisma.type === 'node') {
      execFileSync(
        process.execPath,
        [localPrisma.path, 'generate', `--schema=${relSchema}`],
        { stdio: 'inherit', cwd: SERVER_DIR, env: process.env }
      );
    } else {
      execFileSync(
        localPrisma.path,
        ['generate', `--schema=${relSchema}`],
        { stdio: 'inherit', cwd: SERVER_DIR, env: process.env, shell: process.platform === 'win32' }
      );
    }
  } catch (error) {
    console.error('[prisma-generate] prisma generate failed:', error.message);
    process.exitCode = 1;
  }
}

main();
