/**
 * Compiled-runtime verification (CJS).
 *
 * Proves that `node dist/index.js`-style execution can actually read GeoJSON
 * fixtures and serve downloads — the exact failure mode found in the audit,
 * where `tsc` emitted no `fixtures/` directory.
 *
 * Usage: node scripts/verify-dist-runtime.cjs
 */
process.env.NODE_ENV = 'production';
process.env.RATE_LIMIT_ALLOW_MEMORY = 'true';

const path = require('path');

(async () => {
  const fs = require('fs');
  const distFixtures = path.resolve(__dirname, '..', 'server', 'dist', 'fixtures', 'geojson');

  console.log('--- Compiled Runtime Verification ---');
  console.log('dist fixtures present:', fs.existsSync(distFixtures));
  if (!fs.existsSync(distFixtures)) {
    console.error('FAIL: server/dist/fixtures/geojson is missing. Run `npm run build`.');
    process.exit(1);
  }

  const { app } = require('../server/dist/app.js');
  const { prisma } = require('../server/dist/config/db.js');
  const request = require('supertest');

  const geo = await request(app).get('/api/v1/datasets/ds-batas-kabkot/geojson');
  console.log(
    `GET .../ds-batas-kabkot/geojson → ${geo.status}`,
    `| source=${geo.headers['x-data-source']}`,
    `| features=${geo.body?.features?.length ?? 0}`
  );

  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'demo@inageoportal.go.id', password: 'Password123!' });
  console.log(`POST /auth/login → ${login.status}`);

  const token = login.body?.data?.token;
  const dl = await request(app)
    .get('/api/v1/datasets/ds-batas-kabkot/download-file?format=geojson')
    .set('Authorization', `Bearer ${token}`);
  console.log(
    `GET .../download-file → ${dl.status}`,
    `| disposition=${dl.headers['content-disposition'] || 'none'}`
  );

  const anon = await request(app).get('/api/v1/datasets/ds-batas-kabkot/download-file?format=geojson');
  console.log(`GET .../download-file (anonymous) → ${anon.status} (expected 401)`);

  const docs = await request(app).get('/api/v1/documents');
  const unavailable = (docs.body?.data || []).filter((d) => !d.isAvailableForDownload).length;
  console.log(`GET /documents → ${docs.status} | unavailable=${unavailable} (expected 8)`);

  await prisma.$disconnect();

  const ok =
    geo.status === 200 &&
    (geo.body?.features?.length ?? 0) > 0 &&
    login.status === 200 &&
    dl.status === 200 &&
    anon.status === 401 &&
    unavailable === 8;

  console.log(ok ? 'RESULT: PASS' : 'RESULT: FAIL');
  process.exit(ok ? 0 : 1);
})().catch((error) => {
  console.error('Verification failed:', error && error.message ? error.message : error);
  process.exit(1);
});
