const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('server/prisma/dev.db', { readOnly: true });
const rows = db.prepare('SELECT email, provider, googleId, (password IS NOT NULL) AS hasPw, emailVerified FROM "User"').all();
for (const r of rows) {
  console.log({
    email: r.email.replace(/^(.).*(@.*)$/, '$1***$2'),
    provider: r.provider,
    googleId: r.googleId ? String(r.googleId).slice(0, 10) + '…' : null,
    hasPassword: !!r.hasPw,
    emailVerified: !!r.emailVerified,
  });
}
db.close();
