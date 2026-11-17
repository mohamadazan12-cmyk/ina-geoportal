/**
 * Safe Database Backup & Export Utility
 * =====================================
 * Phase 14 / P0.4 — PostgreSQL migration readiness.
 *
 * Reads the local SQLite database through Prisma and writes a portable JSON
 * snapshot to `server/prisma/backups/`. NOTHING is deleted or mutated:
 * this script is strictly read-only against the source database.
 *
 * Usage:
 *   npm run db:backup   --workspace=server
 *
 * Output:
 *   server/prisma/backups/backup-<ISO timestamp>.json
 *   server/prisma/backups/backup-<ISO timestamp>.summary.json
 *
 * The snapshot preserves primary keys (all `User`/`Bookmark`/
 * `DownloadHistory` identifiers are UUID strings), bcrypt password hashes,
 * relations, and timestamps so records can be re-imported into PostgreSQL
 * without remapping references.
 */

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function main(): Promise<void> {
  const backupDir = path.join(__dirname, 'backups');
  fs.mkdirSync(backupDir, { recursive: true });

  console.log('--- Ina-Geoportal Database Backup (read-only) ---');

  const [categories, nodes, datasets, users, bookmarks, downloads] = await Promise.all([
    prisma.category.findMany({ orderBy: { id: 'asc' } }),
    prisma.networkNode.findMany({ orderBy: { id: 'asc' } }),
    prisma.dataset.findMany({ orderBy: { id: 'asc' } }),
    prisma.user.findMany({ orderBy: { id: 'asc' } }),
    prisma.bookmark.findMany({ orderBy: { id: 'asc' } }),
    prisma.downloadHistory.findMany({ orderBy: { id: 'asc' } }),
  ]);

  const snapshot = {
    _meta: {
      generatedAt: new Date().toISOString(),
      sourceProvider: 'sqlite',
      prismaVersion: '6.x',
      note: 'Read-only export. Password hashes are bcrypt strings and are portable across databases.',
    },
    categories,
    networkNodes: nodes,
    datasets,
    users,
    bookmarks,
    downloadHistory: downloads,
  };

  const stamp = timestamp();
  const dataPath = path.join(backupDir, `backup-${stamp}.json`);
  fs.writeFileSync(dataPath, JSON.stringify(snapshot, null, 2), 'utf-8');

  // Integrity summary — used to verify counts before/after migration.
  const integrity = {
    generatedAt: snapshot._meta.generatedAt,
    counts: {
      categories: categories.length,
      networkNodes: nodes.length,
      datasets: datasets.length,
      users: users.length,
      bookmarks: bookmarks.length,
      downloadHistory: downloads.length,
    },
    users: {
      total: users.length,
      withPasswordHash: users.filter((u) => Boolean(u.password)).length,
      localProvider: users.filter((u) => u.provider === 'local').length,
      googleProvider: users.filter((u) => u.provider === 'google').length,
      emailVerified: users.filter((u) => u.emailVerified).length,
    },
    referentialIntegrity: {
      bookmarksOrphaned: bookmarks.filter(
        (b) => !users.some((u) => u.id === b.userId) || !datasets.some((d) => d.id === b.datasetId)
      ).length,
      downloadsOrphaned: downloads.filter((d) => !datasets.some((ds) => ds.id === d.datasetId)).length,
      datasetsOrphanedCategory: datasets.filter((d) => !categories.some((c) => c.id === d.categoryId))
        .length,
      datasetsOrphanedNode: datasets.filter((d) => !nodes.some((n) => n.id === d.nodeId)).length,
    },
    passwordHashSample: (() => {
      // Shape check only — never a full hash, never a plaintext password.
      const withHash = users.find((u) => Boolean(u.password));
      if (!withHash?.password) return null;
      return {
        algorithmPrefix: withHash.password.slice(0, 4),
        length: withHash.password.length,
        portable: withHash.password.startsWith('$2'),
      };
    })(),
  };

  const summaryPath = path.join(backupDir, `backup-${stamp}.summary.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(integrity, null, 2), 'utf-8');

  console.log('Backup written:');
  console.log('  data    :', path.relative(process.cwd(), dataPath));
  console.log('  summary :', path.relative(process.cwd(), summaryPath));
  console.log('Record counts:', JSON.stringify(integrity.counts));
  console.log(
    'Password hashes portable:',
    integrity.passwordHashSample?.portable ? 'YES (bcrypt)' : 'CHECK MANUALLY'
  );
  console.log('--- Backup complete. Source database untouched. ---');
}

main()
  .catch((error) => {
    console.error('Backup failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
