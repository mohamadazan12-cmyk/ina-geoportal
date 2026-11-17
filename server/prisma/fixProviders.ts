/**
 * Provider Identity Correction — data integrity repair
 * ===================================================
 * Phase 14 / P0.7.
 *
 * Historically `User.provider` defaulted to "google", so accounts created via
 * email/password registration were stored with provider="google" and rendered
 * a "Google Verified" badge they had not earned.
 *
 * This script corrects records using OBSERVABLE evidence only:
 *   • has a bcrypt password hash  → provider = "local"
 *   • has a googleId              → provider = "google"
 *
 * It never modifies passwords, emails, roles, bookmarks or download history.
 *
 * Usage:
 *   npm run seed:fix-providers --workspace=server            # dry run
 *   npm run seed:fix-providers --workspace=server -- --apply # write changes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

async function main(): Promise<void> {
  console.log('--- Provider Identity Correction ---');
  console.log('Mode:', APPLY ? 'APPLY' : 'DRY RUN (no writes)');

  const users = await prisma.user.findMany({
    select: { id: true, email: true, provider: true, password: true, googleId: true },
    orderBy: { id: 'asc' },
  });

  const toLocal = users.filter(
    (u) => Boolean(u.password) && !u.googleId && u.provider !== 'local'
  );
  const toGoogle = users.filter((u) => Boolean(u.googleId) && u.provider !== 'google');

  console.log(`Total users            : ${users.length}`);
  console.log(`Should be "local"      : ${toLocal.length} (has password, no googleId)`);
  console.log(`Should be "google"     : ${toGoogle.length} (has googleId)`);

  if (!APPLY) {
    console.log('');
    console.log('Sample (emails masked):');
    for (const u of [...toLocal, ...toGoogle].slice(0, 10)) {
      const masked = u.email.replace(/^(.).*(@.*)$/, '$1***$2');
      const target = u.googleId ? 'google' : 'local';
      console.log(`  ${masked}  ${u.provider} → ${target}`);
    }
    console.log('');
    console.log('Dry run complete. Re-run with --apply to persist.');
    return;
  }

  let updated = 0;
  for (const u of toLocal) {
    await prisma.user.update({ where: { id: u.id }, data: { provider: 'local' } });
    updated += 1;
  }
  for (const u of toGoogle) {
    await prisma.user.update({ where: { id: u.id }, data: { provider: 'google' } });
    updated += 1;
  }

  console.log('');
  console.log(`Updated ${updated} record(s).`);
  console.log('No passwords, roles, bookmarks or download history were touched.');
}

main()
  .catch((error) => {
    console.error('Provider fix failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
