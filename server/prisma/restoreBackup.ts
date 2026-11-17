/**
 * Restore a JSON Backup into the Target Database
 * =============================================
 * Phase 14 / P0.4 — PostgreSQL (Neon) migration readiness.
 *
 * Companion to `prisma/backup.ts`. Reads a snapshot produced by the backup
 * script and re-inserts the records into whatever database DATABASE_URL
 * currently points at (typically Postgres after migration).
 *
 * Guarantees:
 *  • Primary keys are inserted verbatim, so UUIDs, bookmarks and download
 *    history references stay valid — nothing is remapped.
 *  • Written with per-row upserts (portable across SQLite and PostgreSQL;
 *    `createMany({ skipDuplicates })` is not supported by SQLite).
 *  • Refuses to run without --apply (dry run by default).
 *  • Reports record counts before and after so the operator can verify.
 *
 * Usage:
 *   npm run db:restore --workspace=server                       # dry run, latest backup
 *   npm run db:restore --workspace=server -- --apply
 *   npm run db:restore --workspace=server -- --file=prisma/backups/backup-XXXX.json --apply
 */

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const APPLY = process.argv.includes('--apply');
const fileArg = process.argv.find((arg) => arg.startsWith('--file='));
const explicitFile = fileArg ? fileArg.slice('--file='.length) : null;

const backupsDir = path.join(__dirname, 'backups');

function latestBackup(): string | null {
  if (!fs.existsSync(backupsDir)) return null;
  const files = fs
    .readdirSync(backupsDir)
    .filter((f) => f.startsWith('backup-') && f.endsWith('.json') && !f.includes('.summary.'))
    .sort();
  return files.length ? path.join(backupsDir, files[files.length - 1]) : null;
}

async function counts() {
  const [categories, networkNodes, datasets, users, bookmarks, downloadHistory] = await Promise.all([
    prisma.category.count(),
    prisma.networkNode.count(),
    prisma.dataset.count(),
    prisma.user.count(),
    prisma.bookmark.count(),
    prisma.downloadHistory.count(),
  ]);
  return { categories, networkNodes, datasets, users, bookmarks, downloadHistory };
}

async function main(): Promise<void> {
  const source = explicitFile ? path.resolve(process.cwd(), explicitFile) : latestBackup();

  if (!source || !fs.existsSync(source)) {
    console.error('Backup file not found. Run `npm run db:backup` first.');
    process.exitCode = 1;
    return;
  }

  const snapshot = JSON.parse(fs.readFileSync(source, 'utf-8'));

  console.log('--- Ina-Geoportal Backup Restore ---');
  console.log('Source :', path.relative(process.cwd(), source));
  console.log('Created:', snapshot._meta?.generatedAt ?? 'unknown');
  console.log('Mode   :', APPLY ? 'APPLY (writes records)' : 'DRY RUN (no writes)');
  console.log('Before :', JSON.stringify(await counts()));

  const plan = {
    categories: snapshot.categories ?? [],
    networkNodes: snapshot.networkNodes ?? [],
    datasets: snapshot.datasets ?? [],
    users: snapshot.users ?? [],
    bookmarks: snapshot.bookmarks ?? [],
    downloadHistory: snapshot.downloadHistory ?? [],
  };

  console.log('Incoming:', JSON.stringify({
    categories: plan.categories.length,
    networkNodes: plan.networkNodes.length,
    datasets: plan.datasets.length,
    users: plan.users.length,
    bookmarks: plan.bookmarks.length,
    downloadHistory: plan.downloadHistory.length,
  }));

  if (!APPLY) {
    console.log('');
    console.log('Dry run complete. Re-run with --apply to write.');
    return;
  }

  // Insert parents before children so foreign keys always resolve.
  for (const row of plan.categories) {
    await prisma.category.upsert({ where: { id: row.id }, update: row, create: row });
  }
  for (const row of plan.networkNodes) {
    await prisma.networkNode.upsert({ where: { id: row.id }, update: row, create: row });
  }
  for (const row of plan.datasets) {
    await prisma.dataset.upsert({ where: { id: row.id }, update: row, create: row });
  }
  for (const row of plan.users) {
    await prisma.user.upsert({ where: { id: row.id }, update: row, create: row });
  }
  for (const row of plan.bookmarks) {
    await prisma.bookmark.upsert({ where: { id: row.id }, update: row, create: row });
  }
  for (const row of plan.downloadHistory) {
    await prisma.downloadHistory.upsert({ where: { id: row.id }, update: row, create: row });
  }

  console.log('After  :', JSON.stringify(await counts()));
  console.log('Restore complete. Verify the counts above match the source snapshot.');
}

main()
  .catch((error) => {
    console.error('Restore failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
