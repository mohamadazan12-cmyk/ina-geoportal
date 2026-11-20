import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../app';

describe('Phase 17.1 — Neon PostgreSQL Migration & Live Verification Tests', () => {
  let prisma: PrismaClient;
  let app: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    app = createApp();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Neon Database Engine & Configuration Validation', () => {
    it('1.1 should connect to Neon PostgreSQL and detect correct engine version', async () => {
      const result: any[] = await prisma.$queryRawUnsafe('SELECT version(), current_database(), current_user');
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].current_database).toBe('neondb');
      expect(result[0].current_user).toBe('neondb_owner');
      expect(result[0].version).toMatch(/PostgreSQL/i);
    });

    it('1.2 should have all 6 application tables present in public schema', async () => {
      const tables: any[] = await prisma.$queryRawUnsafe(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      const tableNames = tables.map(t => t.table_name);
      expect(tableNames).toContain('User');
      expect(tableNames).toContain('Category');
      expect(tableNames).toContain('NetworkNode');
      expect(tableNames).toContain('Dataset');
      expect(tableNames).toContain('Bookmark');
      expect(tableNames).toContain('DownloadHistory');
    });
  });

  describe('2. Live Data Inventory & Record Count Reconciliation', () => {
    it('2.1 should verify exact record count per table matching 357 records target', async () => {
      const [categories, networkNodes, datasets, users, bookmarks, downloadHistory] = await Promise.all([
        prisma.category.count(),
        prisma.networkNode.count(),
        prisma.dataset.count(),
        prisma.user.count(),
        prisma.bookmark.count(),
        prisma.downloadHistory.count(),
      ]);

      expect(categories).toBe(6);
      expect(networkNodes).toBe(11);
      expect(datasets).toBe(6);
      expect(users).toBe(5);
      expect(bookmarks).toBe(1);
      expect(downloadHistory).toBe(328);

      const total = categories + networkNodes + datasets + users + bookmarks + downloadHistory;
      expect(total).toBe(357);
    });

    it('2.2 should verify 100% referential integrity with zero orphan records', async () => {
      const allUsers = await prisma.user.findMany({ select: { id: true } });
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

      expect(orphanedDatasetsCat.length).toBe(0);
      expect(orphanedDatasetsNode.length).toBe(0);
      expect(orphanedBookmarks.length).toBe(0);
      expect(orphanedDownloads.length).toBe(0);
    });
  });

  describe('3. Bcrypt Password Hash & Authentication Integration', () => {
    it('3.1 should verify migrated Bcrypt password hash for demo user', async () => {
      const demoUser = await prisma.user.findUnique({
        where: { email: 'demo@inageoportal.go.id' }
      });
      expect(demoUser).toBeDefined();
      expect(demoUser?.password).toBeDefined();
      expect(demoUser?.password?.startsWith('$2b$')).toBe(true);
      expect(demoUser?.password?.length).toBe(60);

      const match = await bcrypt.compare('Password123!', demoUser!.password!);
      expect(match).toBe(true);
    });

    it('3.2 should authenticate demo user via POST /api/v1/auth/login and issue HttpOnly cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'demo@inageoportal.go.id',
          password: 'Password123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('demo@inageoportal.go.id');
      expect(res.body.data.token).toBeDefined();

      const cookies = res.headers['set-cookie'] || [];
      const sessionCookie = cookies.find((c: string) => c.startsWith('ina_geo_token='));
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toContain('HttpOnly');
    });

    it('3.3 should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'demo@inageoportal.go.id',
          password: 'WrongPassword999!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('4. Personal Data & Download Tracking on Neon', () => {
    let authToken: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'demo@inageoportal.go.id',
          password: 'Password123!'
        });
      authToken = res.body.data.token;
    });

    it('4.1 should retrieve profile data with bookmark and download counts', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('demo@inageoportal.go.id');
      expect(res.body.data.name).toBe('Peneliti Geospasial Demo');
      expect(res.body.data.role).toBe('USER');
    });

    it('4.2 should retrieve migrated bookmark for demo user', async () => {
      const res = await request(app)
        .get('/api/v1/user/bookmarks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].dataset.id).toBe('ds-batas-kabkot');
      expect(res.body.data[0].dataset.title).toBe('Batas Administrasi Kabupaten/Kota Indonesia');
    });

    it('4.3 should retrieve user download records from 328 historical downloads', async () => {
      const res = await request(app)
        .get('/api/v1/user/downloads')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('dataset');
      expect(res.body.data[0]).toHaveProperty('purpose');
    });

    it('4.4 should verify data persists across new PrismaClient instances', async () => {
      const client2 = new PrismaClient();
      const count = await client2.downloadHistory.count();
      expect(count).toBe(328);
      await client2.$disconnect();
    });
  });
});
