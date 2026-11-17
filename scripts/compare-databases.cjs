/**
 * Compare the two local SQLite files without modifying either.
 * Read-only diagnostics for the P0.7 duplicate-database finding.
 */
const { DatabaseSync } = require('node:sqlite');

const files = [
  'server/prisma/dev.db',
  'server/prisma/server/prisma/dev.db',
];

for (const file of files) {
  let db;
  try {
    db = new DatabaseSync(file, { readOnly: true });
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'"
      )
      .all()
      .map((r) => r.name);

    const counts = {};
    for (const table of tables) {
      counts[table] = db.prepare(`SELECT COUNT(*) AS c FROM "${table}"`).get().c;
    }

    const users = tables.includes('User')
      ? db.prepare('SELECT email, provider, (password IS NOT NULL) AS hasPw FROM "User"').all()
      : [];

    console.log('---', file);
    console.log('  tables:', tables.join(', '));
    console.log('  counts:', JSON.stringify(counts));
    console.log(
      '  users :',
      users.map((u) => `${u.email.replace(/^(.).*(@.*)$/, '$1***$2')} [${u.provider}]${u.hasPw ? '' : ' (no password)'}`).join(', ') || '(none)'
    );
  } catch (error) {
    console.log('---', file, 'ERROR:', error.message);
  } finally {
    if (db) db.close();
  }
}
