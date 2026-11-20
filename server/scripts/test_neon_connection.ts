import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env'), override: true });

import { PrismaClient } from '@prisma/client';

async function main() {
  console.log('=== TESTING NEON POSTGRESQL CONNECTION ===');
  const prisma = new PrismaClient();

  try {
    const rawInfo: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        current_database() AS db_name, 
        current_user AS user_role, 
        version() AS pg_version
    `);
    console.log('Connection: SUCCESSFUL');
    console.log('Database  :', rawInfo[0]?.db_name);
    console.log('User Role :', rawInfo[0]?.user_role);
    console.log('Version   :', (rawInfo[0]?.pg_version || '').split(' on ')[0]);

    // Check existing tables in public schema
    const tables: any[] = await prisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('\n=== EXISTING PUBLIC TABLES AUDIT ===');
    console.log(`Found ${tables.length} table(s) in public schema:`);
    if (tables.length === 0) {
      console.log('  (Database is completely empty - Safe for initial migration)');
    } else {
      tables.forEach(t => console.log('  -', t.table_name));
    }

    const appTables = ['User', 'Category', 'NetworkNode', 'Dataset', 'Bookmark', 'DownloadHistory', '_prisma_migrations'];
    const matchedAppTables = tables.filter(t => appTables.includes(t.table_name));
    console.log(`\nApplication tables found: ${matchedAppTables.length}/${appTables.length}`);

  } catch (err: any) {
    console.error('Connection failed:', err.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
