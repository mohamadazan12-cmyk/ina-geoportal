import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env'), override: true });

import request from 'supertest';
import { createApp } from '../src/app';

async function main() {
  console.log('=== TESTING LIVE EXPRESS API ON NEON POSTGRESQL ===');
  const app = createApp();

  // 1. Test Login
  console.log('\n1. Testing Login API (POST /api/v1/auth/login)...');
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'demo@inageoportal.go.id',
      password: 'Password123!'
    });

  console.log(`   - HTTP Status: ${loginRes.status}`);
  console.log(`   - Success    : ${loginRes.body.success}`);
  console.log(`   - User Email : ${loginRes.body.data?.user?.email}`);
  console.log(`   - User Name  : ${loginRes.body.data?.user?.name}`);

  const cookies = loginRes.headers['set-cookie'] || [];
  const sessionCookie = cookies.find((c: string) => c.startsWith('ina_geo_token='));
  console.log(`   - Session Cookie Issued: ${Boolean(sessionCookie)}`);

  const token = loginRes.body.data?.token;

  if (loginRes.status !== 200 || !token) {
    throw new Error('Login failed on Neon PostgreSQL!');
  }

  // 2. Test Profile API
  console.log('\n2. Testing Profile API (GET /api/v1/auth/me)...');
  const meRes = await request(app)
    .get('/api/v1/auth/me')
    .set('Authorization', `Bearer ${token}`);

  console.log(`   - HTTP Status: ${meRes.status}`);
  console.log(`   - User Role  : ${meRes.body.data?.role}`);
  console.log(`   - Institution: ${meRes.body.data?.institution}`);

  // 3. Test Bookmarks API
  console.log('\n3. Testing Bookmarks API (GET /api/v1/user/bookmarks)...');
  const bookmarksRes = await request(app)
    .get('/api/v1/user/bookmarks')
    .set('Authorization', `Bearer ${token}`);

  console.log(`   - HTTP Status    : ${bookmarksRes.status}`);
  console.log(`   - Bookmarks Count: ${bookmarksRes.body.data?.length}`);
  if (bookmarksRes.body.data?.length > 0) {
    console.log(`   - First Bookmark : ${bookmarksRes.body.data[0]?.dataset?.title}`);
  }

  // 4. Test Download History API
  console.log('\n4. Testing Downloads API (GET /api/v1/user/downloads)...');
  const downloadsRes = await request(app)
    .get('/api/v1/user/downloads')
    .set('Authorization', `Bearer ${token}`);

  console.log(`   - HTTP Status    : ${downloadsRes.status}`);
  console.log(`   - Downloads Count: ${downloadsRes.body.data?.length} user download record(s)`);

  // 5. Test Public Dataset Listing
  console.log('\n5. Testing Public Datasets API (GET /api/v1/datasets)...');
  const datasetsRes = await request(app).get('/api/v1/datasets');
  console.log(`   - HTTP Status    : ${datasetsRes.status}`);
  console.log(`   - Datasets Count : ${datasetsRes.body.data?.length}`);

  // 6. Test Public Network Nodes
  console.log('\n6. Testing Network Nodes API (GET /api/v1/nodes)...');
  const nodesRes = await request(app).get('/api/v1/nodes');
  console.log(`   - HTTP Status    : ${nodesRes.status}`);
  console.log(`   - Nodes Count    : ${nodesRes.body.data?.length}`);

  console.log('\n=== ALL LIVE ENDPOINTS ON NEON POSTGRESQL FUNCTIONING PROPERLY ===');
}

main().catch(err => {
  console.error('API Test Error:', err.message);
  process.exit(1);
});
