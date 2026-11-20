import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import app from '../index';
import { prisma } from '../config/db';

describe('Phase 16.9 — Complete Authentication, Database & Download Tracking Implementation Tests', () => {
  const testUserEmailA = `test.pilot.a.${Date.now()}@inageoportal.go.id`;
  const testUserEmailB = `test.pilot.b.${Date.now()}@inageoportal.go.id`;
  const testPasswordA = 'SuperSecret123!';
  const testPasswordB = 'AnotherSecret456!';

  let tokenUserA: string = '';
  let cookieUserA: string = '';
  let userIdA: string = '';

  let tokenUserB: string = '';
  let userIdB: string = '';

  let createdHistoryId: string = '';

  beforeAll(async () => {
    // Ensure test database is accessible
    const userCount = await prisma.user.count();
    expect(userCount).toBeGreaterThanOrEqual(0);
  });

  afterAll(async () => {
    // Clean up test users and their cascade data
    try {
      if (userIdA) {
        await prisma.downloadHistory.deleteMany({ where: { userId: userIdA } });
        await prisma.bookmark.deleteMany({ where: { userId: userIdA } });
        await prisma.user.deleteMany({ where: { id: userIdA } });
      }
      if (userIdB) {
        await prisma.downloadHistory.deleteMany({ where: { userId: userIdB } });
        await prisma.bookmark.deleteMany({ where: { userId: userIdB } });
        await prisma.user.deleteMany({ where: { id: userIdB } });
      }
    } catch {
      // Ignore cleanup error
    }
  });

  // ==========================================================================
  // SECTION 1: USER REGISTRATION & VALIDATION
  // ==========================================================================
  describe('1. User Registration & Validation', () => {
    it('1.1 should register a new user successfully and return JWT & user profile', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Peneliti Spasial A',
          email: testUserEmailA,
          password: testPasswordA,
          confirmPassword: testPasswordA,
          institution: 'Pusat Riset Geospasial BRIN',
          agreeTerms: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');

      tokenUserA = res.body.data.token;
      userIdA = res.body.data.user.id;

      expect(res.body.data.user.email).toBe(testUserEmailA);
      expect(res.body.data.user.name).toBe('Peneliti Spasial A');
      expect(res.body.data.user.institution).toBe('Pusat Riset Geospasial BRIN');
      expect(res.body.data.user.role.toUpperCase()).toBe('USER');

      // Check HttpOnly cookie was set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const authCookie = Array.isArray(cookies)
        ? cookies.find((c: string) => c.startsWith('ina_geo_token='))
        : cookies;
      expect(authCookie).toBeDefined();
      cookieUserA = authCookie ? authCookie.split(';')[0] : '';
    });

    it('1.2 should verify user record in database with bcrypt hashed password (never plain text)', async () => {
      const userInDb = await prisma.user.findUnique({
        where: { email: testUserEmailA },
      });

      expect(userInDb).not.toBeNull();
      expect(userInDb?.email).toBe(testUserEmailA);
      expect(userInDb?.name).toBe('Peneliti Spasial A');
      expect(userInDb?.password).not.toBe(testPasswordA);
      // Bcrypt hash verification
      expect(userInDb?.password).toMatch(/^\$2[aby]\$\d{2}\$/);
      const isMatch = await bcrypt.compare(testPasswordA, userInDb!.password);
      expect(isMatch).toBe(true);
    });

    it('1.3 should reject registration with duplicate email (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Peneliti Duplikat',
          email: testUserEmailA,
          password: 'Password123!',
          confirmPassword: 'Password123!',
          institution: 'Instansi Lain',
          agreeTerms: true,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('1.4 should reject registration with password < 8 characters (422 Unprocessable Entity)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'User Pendek',
          email: `short.${Date.now()}@inageoportal.go.id`,
          password: 'short',
          confirmPassword: 'short',
          institution: 'Instansi Test',
          agreeTerms: true,
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('1.5 should reject registration with confirmPassword mismatch (422 Unprocessable Entity)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'User Mismatch',
          email: `mismatch.${Date.now()}@inageoportal.go.id`,
          password: 'ValidPassword123!',
          confirmPassword: 'DifferentPassword123!',
          institution: 'Instansi Test',
          agreeTerms: true,
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('1.6 should reject registration without terms agreement (422 Unprocessable Entity)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'User No Terms',
          email: `noterms.${Date.now()}@inageoportal.go.id`,
          password: 'ValidPassword123!',
          confirmPassword: 'ValidPassword123!',
          institution: 'Instansi Test',
          agreeTerms: false,
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('1.7 should register a second distinct user for multi-tenant isolation tests', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Analis Geospasial B',
          email: testUserEmailB,
          password: testPasswordB,
          confirmPassword: testPasswordB,
          institution: 'Bappeda Provinsi Jawa Barat',
          agreeTerms: true,
        });

      expect(res.status).toBe(201);
      tokenUserB = res.body.data.token;
      userIdB = res.body.data.user.id;
    });
  });

  // ==========================================================================
  // SECTION 2: AUTHENTICATION & LOGIN FLOW
  // ==========================================================================
  describe('2. Authentication & Login Flow', () => {
    it('2.1 should login successfully with valid registered credentials and return JWT & cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUserEmailA,
          password: testPasswordA,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe(testUserEmailA);

      // Verify cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
    });

    it('2.2 should reject login with non-existent email (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent.user.999@inageoportal.go.id',
          password: 'Password123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('2.3 should reject login with wrong password (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUserEmailA,
          password: 'WrongPassword999!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('2.4 should reject access to protected routes without token (401 Unauthorized)', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('2.5 should reject access to protected routes with invalid/forged JWT (401 Unauthorized)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.jwt.token.string');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('2.6 should authenticate via Bearer token on GET /api/v1/auth/me', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testUserEmailA);
      expect(res.body.data.name).toBe('Peneliti Spasial A');
    });

    it('2.7 should authenticate via HttpOnly cookie on GET /api/v1/auth/me (dual auth support)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', cookieUserA);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testUserEmailA);
    });

    it('2.8 should clear cookie on logout POST /api/v1/auth/logout', async () => {
      const res = await request(app).post('/api/v1/auth/logout');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const clearedCookie = Array.isArray(cookies) ? cookies.join(';') : cookies;
      expect(clearedCookie).toMatch(/ina_geo_token=;/);
    });
  });

  // ==========================================================================
  // SECTION 3: USER PROFILE & UPDATE PERSISTENCE
  // ==========================================================================
  describe('3. User Profile & Persistence', () => {
    it('3.1 should return user profile with real bookmark & download counts', async () => {
      const res = await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testUserEmailA);
      expect(res.body.data._count).toBeDefined();
      expect(res.body.data._count).toHaveProperty('bookmarks');
      expect(res.body.data._count).toHaveProperty('downloadHistory');
      expect(res.body.data).toHaveProperty('bookmarkCount');
      expect(res.body.data).toHaveProperty('downloadCount');
    });

    it('3.2 should update user profile name and institution in real database via PUT /api/v1/user/profile', async () => {
      const updatedName = 'Dr. Peneliti Spasial Senior';
      const updatedInstitution = 'Badan Riset dan Inovasi Nasional (BRIN)';

      const res = await request(app)
        .put('/api/v1/user/profile')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          name: updatedName,
          institution: updatedInstitution,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(updatedName);
      expect(res.body.data.institution).toBe(updatedInstitution);

      // Verify directly in DB
      const userInDb = await prisma.user.findUnique({
        where: { id: userIdA },
      });
      expect(userInDb?.name).toBe(updatedName);
      expect(userInDb?.institution).toBe(updatedInstitution);
    });
  });

  // ==========================================================================
  // SECTION 4: BOOKMARKS & MULTI-TENANT ISOLATION
  // ==========================================================================
  describe('4. Bookmarks Persistence & Multi-Tenant Isolation', () => {
    it('4.1 should allow User A to bookmark a dataset', async () => {
      const res = await request(app)
        .post('/api/v1/user/bookmarks')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ datasetId: 'ds-batas-kabkot' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify in DB
      const bm = await prisma.bookmark.findFirst({
        where: { userId: userIdA, datasetId: 'ds-batas-kabkot' },
      });
      expect(bm).not.toBeNull();
    });

    it('4.2 should toggle bookmark (remove when clicked again and re-add)', async () => {
      // Toggle off
      const removeRes = await request(app)
        .post('/api/v1/user/bookmarks')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ datasetId: 'ds-batas-kabkot' });

      expect(removeRes.status).toBe(200);
      expect(removeRes.body.data.bookmarked).toBe(false);

      // Toggle back on so bookmark exists for multi-tenant and persistence tests
      const reAddRes = await request(app)
        .post('/api/v1/user/bookmarks')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ datasetId: 'ds-batas-kabkot' });

      expect(reAddRes.status).toBe(200);
      expect(reAddRes.body.data.bookmarked).toBe(true);
    });

    it('4.3 should enforce multi-tenant isolation: User B does NOT see User A bookmarks', async () => {
      const res = await request(app)
        .get('/api/v1/user/bookmarks')
        .set('Authorization', `Bearer ${tokenUserB}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // User B should have 0 bookmarks
      const bookmarksB = res.body.data;
      expect(bookmarksB.length).toBe(0);
    });
  });

  // ==========================================================================
  // SECTION 5: DUAL-TRACK DOWNLOAD & DATABASE AUDIT TRAIL
  // ==========================================================================
  describe('5. Dual-Track Download & Database Audit Trail', () => {
    it('5.1 [Jalur 1] Public Download: accessible via Cloudflare R2 edge without login', async () => {
      const res = await request(app).get('/api/v1/datasets/ds-batas-kabkot');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.r2PublicUrl).toBeDefined();
      expect(res.body.data.r2PublicUrl).toContain('r2.dev');
      expect(res.body.data.remoteKey).toBe('datasets/ds-batas-kabkot/full/real_batas_kabupaten_548.json');
    });

    it('5.2 [Jalur 2] Authenticated Download: creates DownloadHistory row in database and increments count', async () => {
      const beforeDataset = await prisma.dataset.findUnique({
        where: { id: 'ds-batas-kabkot' },
      });
      const initialCount = beforeDataset?.downloadCount || 0;

      const res = await request(app)
        .post('/api/v1/datasets/ds-batas-kabkot/download')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          format: 'geojson',
          purpose: 'Analisis Spasial Tata Ruang Nasional',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('historyId');
      expect(res.body.data.status).toBe('REDIRECTED');
      expect(res.body.data.storageSource).toBe('Cloudflare R2');
      expect(res.body.data.r2PublicUrl).toBeDefined();

      createdHistoryId = res.body.data.historyId;

      // Verify row created in Prisma DB
      const historyRecord = await prisma.downloadHistory.findUnique({
        where: { id: createdHistoryId },
      });
      expect(historyRecord).not.toBeNull();
      expect(historyRecord?.userId).toBe(userIdA);
      expect(historyRecord?.datasetId).toBe('ds-batas-kabkot');
      expect(historyRecord?.status).toBe('REDIRECTED');
      expect(historyRecord?.purpose).toBe('Analisis Spasial Tata Ruang Nasional');

      // Verify dataset downloadCount incremented
      const afterDataset = await prisma.dataset.findUnique({
        where: { id: 'ds-batas-kabkot' },
      });
      expect(afterDataset?.downloadCount).toBe(initialCount + 1);
    });

    it('5.3 [Jalur 2] Restricted dataset download requires purpose >= 5 characters', async () => {
      // Create or find restricted dataset
      let restricted = await prisma.dataset.findFirst({
        where: { accessType: 'restricted' },
      });

      if (!restricted) {
        restricted = await prisma.dataset.create({
          data: {
            id: 'ds-test-restricted',
            title: 'Peta Khusus Kawasan Strategis',
            abstract: 'Dataset terbatas untuk keperluan riset',
            description: 'Dataset terbatas untuk keperluan riset',
            categoryId: 'cat-tematik',
            nodeId: 'node-big',
            year: 2026,
            publishedDate: '2026-01-01',
            updatedDate: '2026-01-01',
            crs: 'EPSG:4326',
            epsg: '4326',
            scale: '1:50000',
            bbox: '[95.0, -11.0, 141.0, 6.0]',
            accessType: 'restricted',
            formatList: 'geojson,shp',
          },
        });
      }

      // Test validation: missing/short purpose rejected
      const failRes = await request(app)
        .post(`/api/v1/datasets/${restricted.id}/download`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          format: 'geojson',
          purpose: 'abc', // < 5 chars
        });

      expect(failRes.status).toBe(422);

      // Test success with valid purpose: status should be APPROVED
      const successRes = await request(app)
        .post(`/api/v1/datasets/${restricted.id}/download`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          format: 'geojson',
          purpose: 'Riset Akademik Kebencanaan Nasional',
        });

      expect(successRes.status).toBe(200);
      expect(successRes.body.data.status).toBe('APPROVED');
    });

    it('5.4 should retrieve download history via GET /api/v1/downloads/history with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/downloads/history?page=1&limit=10')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const record = res.body.data.find((r: any) => r.id === createdHistoryId);
      expect(record).toBeDefined();
      expect(record.storageSource).toBe('Cloudflare R2');
      expect(record.status).toBe('REDIRECTED');
      expect(record.dataset).toBeDefined();
    });

    it('5.5 should enforce strict tenant isolation on download history: User B cannot see User A downloads', async () => {
      const res = await request(app)
        .get('/api/v1/downloads/history')
        .set('Authorization', `Bearer ${tokenUserB}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // User B must have 0 download records
      const recordsB = res.body.data;
      expect(recordsB.length).toBe(0);

      const foundUserARecord = recordsB.some((r: any) => r.id === createdHistoryId);
      expect(foundUserARecord).toBe(false);
    });

    it('5.6 should retrieve downloads via GET /api/v1/user/downloads with search and category filters', async () => {
      const res = await request(app)
        .get('/api/v1/user/downloads?search=Batas')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // SECTION 6: DATABASE PERSISTENCE ACROSS FRESH PRISMA INSTANCE
  // ==========================================================================
  describe('6. Database Persistence Across Independent Prisma Instance', () => {
    it('6.1 should persist user, bookmark, and download history in SQLite file across new PrismaClient()', async () => {
      const freshPrisma = new PrismaClient();

      try {
        // Query user from fresh connection
        const user = await freshPrisma.user.findUnique({
          where: { id: userIdA },
        });
        expect(user).not.toBeNull();
        expect(user?.email).toBe(testUserEmailA);
        expect(user?.name).toBe('Dr. Peneliti Spasial Senior');

        // Query bookmark from fresh connection
        const bookmark = await freshPrisma.bookmark.findFirst({
          where: { userId: userIdA, datasetId: 'ds-batas-kabkot' },
        });
        expect(bookmark).not.toBeNull();

        // Query download history from fresh connection
        const history = await freshPrisma.downloadHistory.findUnique({
          where: { id: createdHistoryId },
        });
        expect(history).not.toBeNull();
        expect(history?.userId).toBe(userIdA);
        expect(history?.status).toBe('REDIRECTED');
      } finally {
        await freshPrisma.$disconnect();
      }
    });
  });
});
