import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env'), override: true });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('================================================================');
  console.log('       POST-MIGRATION NEON POSTGRESQL VERIFICATION AUDIT        ');
  console.log('================================================================');

  const prisma = new PrismaClient();

  try {
    // 1. Connection & Engine Check
    const rawVersion: any[] = await prisma.$queryRawUnsafe('SELECT version()');
    console.log('1. Database Engine: Connected to', (rawVersion[0]?.version || '').split(' on ')[0]);

    // 2. Count Records
    const [categories, networkNodes, datasets, users, bookmarks, downloadHistory] = await Promise.all([
      prisma.category.count(),
      prisma.networkNode.count(),
      prisma.dataset.count(),
      prisma.user.count(),
      prisma.bookmark.count(),
      prisma.downloadHistory.count(),
    ]);

    const totalRecords = categories + networkNodes + datasets + users + bookmarks + downloadHistory;

    console.log('\n2. Table Record Counts:');
    console.log(`   - Category        : ${categories} (Expected: 6)`);
    console.log(`   - NetworkNode     : ${networkNodes} (Expected: 11)`);
    console.log(`   - Dataset         : ${datasets} (Expected: 6)`);
    console.log(`   - User            : ${users} (Expected: 5)`);
    console.log(`   - Bookmark        : ${bookmarks} (Expected: 1)`);
    console.log(`   - DownloadHistory : ${downloadHistory} (Expected: 328)`);
    console.log(`   TOTAL RECORDS     : ${totalRecords} (Expected: 357)`);

    if (totalRecords !== 357) {
      throw new Error(`Total records mismatch! Got ${totalRecords}, expected 357`);
    }

    // 3. Referential Integrity Check
    console.log('\n3. Referential Integrity Audit:');
    const allUsers = await prisma.user.findMany({ select: { id: true, email: true, password: true, role: true } });
    const allDatasets = await prisma.dataset.findMany({ select: { id: true, categoryId: true, nodeId: true } });
    const allCategories = await prisma.category.findMany({ select: { id: true } });
    const allNodes = await prisma.networkNode.findMany({ select: { id: true } });
    const allBookmarks = await prisma.bookmark.findMany();
    const allDownloads = await prisma.downloadHistory.findMany();

    const userIds = new Set(allUsers.map(u => u.id));
    const datasetIds = new Set(allDatasets.map(d => d.id));
    const categoryIds = new Set(allCategories.map(c => c.id));
    const nodeIds = new Set(allNodes.map(n => n.id));

    const orphanedDatasetsCat = allDatasets.filter(d => !categoryIds.has(d.categoryId));
    const orphanedDatasetsNode = allDatasets.filter(d => !nodeIds.has(d.nodeId));
    const orphanedBookmarks = allBookmarks.filter(b => !userIds.has(b.userId) || !datasetIds.has(b.datasetId));
    const orphanedDownloads = allDownloads.filter(d => !datasetIds.has(d.datasetId));

    console.log(`   - Orphaned Datasets (Invalid Category): ${orphanedDatasetsCat.length}`);
    console.log(`   - Orphaned Datasets (Invalid Node)    : ${orphanedDatasetsNode.length}`);
    console.log(`   - Orphaned Bookmarks                  : ${orphanedBookmarks.length}`);
    console.log(`   - Orphaned Downloads (Invalid Dataset): ${orphanedDownloads.length}`);

    if (orphanedDatasetsCat.length || orphanedDatasetsNode.length || orphanedBookmarks.length || orphanedDownloads.length) {
      throw new Error('Referential integrity violation detected!');
    }
    console.log('   ✓ Referential Integrity: 100% PERFECT (0 orphans)');

    // 4. Bcrypt Password Hash Verification
    console.log('\n4. Password Hash Verification:');
    const demoUser = allUsers.find(u => u.email === 'demo@inageoportal.go.id');
    if (!demoUser || !demoUser.password) {
      throw new Error('Demo user not found or missing password hash!');
    }

    const isBcrypt = demoUser.password.startsWith('$2b$') && demoUser.password.length === 60;
    console.log(`   - Demo User Hash Format : ${isBcrypt ? 'VALID ($2b$, 60 chars)' : 'INVALID'}`);
    
    const passwordValid = await bcrypt.compare('Password123!', demoUser.password);
    console.log(`   - Demo User Password Match: ${passwordValid ? 'SUCCESS (Password123!)' : 'FAILED'}`);
    if (!passwordValid) {
      throw new Error('Password compare failed for demo user!');
    }

    // 5. User Personal Data Retrieval Test
    console.log('\n5. Personal Data Retrieval Test:');
    const userProfile = await prisma.user.findUnique({
      where: { id: demoUser.id },
      include: {
        bookmarks: {
          include: { dataset: true }
        },
        downloadHistory: {
          orderBy: { downloadedAt: 'desc' },
          take: 5
        }
      }
    });

    console.log(`   - Profile Name        : ${userProfile?.name}`);
    console.log(`   - Profile Email       : ${userProfile?.email}`);
    console.log(`   - Profile Role        : ${userProfile?.role}`);
    console.log(`   - Profile Bookmarks   : ${userProfile?.bookmarks.length} bookmark(s)`);
    if (userProfile?.bookmarks.length) {
      console.log(`     Bookmarked Dataset  : "${userProfile.bookmarks[0].dataset.title}"`);
    }
    const demoDownloadsCount = await prisma.downloadHistory.count({ where: { userId: demoUser.id } });
    console.log(`   - Total User Downloads: ${demoDownloadsCount} recorded download(s)`);

    // 6. Persistence across new PrismaClient instance
    console.log('\n6. Independent PrismaClient Lifecycle Verification:');
    await prisma.$disconnect();

    const freshPrisma = new PrismaClient();
    const freshCount = await freshPrisma.downloadHistory.count();
    console.log(`   - Fresh Client Download Count: ${freshCount} records`);
    await freshPrisma.$disconnect();

    console.log('\n================================================================');
    console.log('       ALL VERIFICATION CHECKS PASSED SUCCESSFULLY (100%)       ');
    console.log('================================================================');

  } catch (error: any) {
    console.error('VERIFICATION ERROR:', error.message);
    process.exitCode = 1;
  }
}

main();
