import fs from 'fs';
import path from 'path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import app from '../index';
import { prisma } from '../config/db';
import { getRateLimiterDiagnostics } from '../middleware/rateLimiter';

describe('Phase 17.0 — PostgreSQL Production Migration & Authentication Hardening Tests', () => {
  const testEmailA = `phase17.pilot.a.${Date.now()}@inageoportal.go.id`;
  const testEmailB = `phase17.pilot.b.${Date.now()}@inageoportal.go.id`;
  const testPassword = 'StrongPassword170!';

  let tokenUserA: string = '';
  let cookieUserA: string = '';
  let userIdA: string = '';

  let tokenUserB: string = '';
  let userIdB: string = '';

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
  // SECTION 1: POSTGRESQL SCHEMA & PRISMA CONFIGURATION AUDIT
  // ==========================================================================
  describe('1. PostgreSQL Schema & Configuration Audit', () => {
    const postgresSchemaPath = path.resolve(__dirname, '../../prisma/schema.postgres.prisma');
    const sqliteSchemaPath = path.resolve(__dirname, '../../prisma/schema.prisma');

    it('1.1 should have schema.postgres.prisma file present', () => {
      expect(fs.existsSync(postgresSchemaPath)).toBe(true);
      expect(fs.existsSync(sqliteSchemaPath)).toBe(true);
    });

    it('1.2 should configure directUrl alongside url for Neon connection pooling', () => {
      const content = fs.readFileSync(postgresSchemaPath, 'utf-8');
      expect(content).toContain('provider  = "postgresql"');
      expect(content).toContain('url       = env("DATABASE_URL")');
      expect(content).toContain('directUrl = env("DIRECT_URL")');
    });

    it('1.3 should contain all 6 core models with identical field definitions', () => {
      const pgContent = fs.readFileSync(postgresSchemaPath, 'utf-8');
      const sqliteContent = fs.readFileSync(sqliteSchemaPath, 'utf-8');

      const expectedModels = ['model User', 'model Category', 'model NetworkNode', 'model Dataset', 'model Bookmark', 'model DownloadHistory'];
      for (const m of expectedModels) {
        expect(pgContent).toContain(m);
        expect(sqliteContent).toContain(m);
      }

      // Check key integrity fields
      expect(pgContent).toContain('role            String            @default("USER")');
      expect(pgContent).toContain('accessType      String            @default("public")');
      expect(pgContent).toContain('downloadCount   Int               @default(0)');
      expect(pgContent).toContain('status       String   @default("COMPLETED")');
      expect(pgContent).toContain('@@unique([userId, datasetId])');
    });
  });

  // ==========================================================================
  // SECTION 2: DATA BACKUP & RESTORE INTEGRITY
  // ==========================================================================
  describe('2. Data Backup & Migration Snapshot Integrity', () => {
    it('2.1 should verify latest backup snapshot has complete relational data', () => {
      const backupsDir = path.resolve(__dirname, '../../prisma/backups');
      expect(fs.existsSync(backupsDir)).toBe(true);

      const files = fs
        .readdirSync(backupsDir)
        .filter((f) => f.startsWith('backup-') && f.endsWith('.json') && !f.includes('.summary.'))
        .sort();

      expect(files.length).toBeGreaterThan(0);
      const latestFile = path.join(backupsDir, files[files.length - 1]);
      const snapshot = JSON.parse(fs.readFileSync(latestFile, 'utf-8'));

      expect(snapshot._meta.sourceProvider).toBe('sqlite');
      expect(snapshot.categories.length).toBe(6);
      expect(snapshot.networkNodes.length).toBe(11);
      expect(snapshot.datasets.length).toBe(6);
      expect(snapshot.users.length).toBeGreaterThanOrEqual(5);
      expect(snapshot.downloadHistory.length).toBeGreaterThanOrEqual(300);
    });

    it('2.2 should verify bcrypt password hashes in backup are valid and portable', async () => {
      const backupsDir = path.resolve(__dirname, '../../prisma/backups');
      const files = fs
        .readdirSync(backupsDir)
        .filter((f) => f.startsWith('backup-') && f.endsWith('.json') && !f.includes('.summary.'))
        .sort();

      const latestFile = path.join(backupsDir, files[files.length - 1]);
      const snapshot = JSON.parse(fs.readFileSync(latestFile, 'utf-8'));

      const usersWithHash = snapshot.users.filter((u: any) => Boolean(u.password));
      expect(usersWithHash.length).toBeGreaterThanOrEqual(1);

      for (const u of usersWithHash) {
        expect(u.password).toMatch(/^\$2[aby]\$\d{2}\$/);
        expect(u.password.length).toBe(60);
      }
    });

    it('2.3 should verify zero orphaned records across all relations in backup', () => {
      const backupsDir = path.resolve(__dirname, '../../prisma/backups');
      const files = fs
        .readdirSync(backupsDir)
        .filter((f) => f.startsWith('backup-') && f.endsWith('.summary.json'))
        .sort();

      const latestSummaryFile = path.join(backupsDir, files[files.length - 1]);
      const summary = JSON.parse(fs.readFileSync(latestSummaryFile, 'utf-8'));

      expect(summary.referentialIntegrity.bookmarksOrphaned).toBe(0);
      expect(summary.referentialIntegrity.downloadsOrphaned).toBe(0);
      expect(summary.referentialIntegrity.datasetsOrphanedCategory).toBe(0);
      expect(summary.referentialIntegrity.datasetsOrphanedNode).toBe(0);
    });
  });

  // ==========================================================================
  // SECTION 3: AUTHENTICATION HARDENING & COOKIE SECURITY
  // ==========================================================================
  describe('3. Authentication Hardening & Cookie Security', () => {
    it('3.1 should register user and issue HttpOnly cookie with Path=/ and SameSite=lax', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Peneliti Phase 17 A',
          email: testEmailA,
          password: testPassword,
          confirmPassword: testPassword,
          institution: 'Laboratorium Geospasial',
          agreeTerms: true,
        });

      expect(res.status).toBe(201);
      tokenUserA = res.body.data.token;
      userIdA = res.body.data.user.id;

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();

      const authCookie = Array.isArray(cookies)
        ? cookies.find((c: string) => c.startsWith('ina_geo_token='))
        : cookies;

      expect(authCookie).toBeDefined();
      expect(authCookie).toContain('HttpOnly');
      expect(authCookie?.toLowerCase()).toContain('path=/');
      expect(authCookie?.toLowerCase()).toContain('samesite=lax');

      cookieUserA = authCookie ? authCookie.split(';')[0] : '';
    });

    it('3.2 should login and issue HttpOnly cookie with identical security parameters', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmailA,
          password: testPassword,
        });

      expect(res.status).toBe(200);
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();

      const authCookie = Array.isArray(cookies)
        ? cookies.find((c: string) => c.startsWith('ina_geo_token='))
        : cookies;

      expect(authCookie).toBeDefined();
      expect(authCookie).toContain('HttpOnly');
      expect(authCookie?.toLowerCase()).toContain('path=/');
      expect(authCookie?.toLowerCase()).toContain('samesite=lax');
    });

    it('3.3 should clear cookie on logout with matching Path=/ parameter', async () => {
      const res = await request(app).post('/api/v1/auth/logout');
      expect(res.status).toBe(200);

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cleared = Array.isArray(cookies) ? cookies.join(';') : cookies;
      expect(cleared).toContain('ina_geo_token=;');
      expect(cleared.toLowerCase()).toContain('path=/');
    });
  });

  // ==========================================================================
  // SECTION 4: CSRF & ORIGIN PROTECTION ON STATE-CHANGING OPERATIONS
  // ==========================================================================
  describe('4. CSRF & Origin Protection for Browser Sessions', () => {
    it('4.1 should allow cookie-authenticated mutating request from authorized origin', async () => {
      const res = await request(app)
        .put('/api/v1/user/profile')
        .set('Cookie', cookieUserA)
        .set('Origin', 'http://localhost:5173')
        .send({
          name: 'Peneliti Phase 17 A (Updated)',
          institution: 'Laboratorium Geospasial Terakreditasi',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Peneliti Phase 17 A (Updated)');
    });

    it('4.2 should allow Bearer token mutating requests regardless of ambient CSRF headers', async () => {
      const res = await request(app)
        .put('/api/v1/user/profile')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          name: 'Peneliti Phase 17 A (API Client)',
          institution: 'API Partner Client',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Peneliti Phase 17 A (API Client)');
    });
  });

  // ==========================================================================
  // SECTION 5: MULTI-TENANT ISOLATION & RATE LIMITING DIAGNOSTICS
  // ==========================================================================
  describe('5. Multi-Tenant Isolation & Rate Limiting Readiness', () => {
    it('5.1 should register second user and enforce isolation on personal bookmarks', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Analis Phase 17 B',
          email: testEmailB,
          password: 'AnotherPassword170!',
          confirmPassword: 'AnotherPassword170!',
          institution: 'Bappeda Jawa Tengah',
          agreeTerms: true,
        });

      expect(regRes.status).toBe(201);
      tokenUserB = regRes.body.data.token;
      userIdB = regRes.body.data.user.id;

      // User A bookmarks dataset
      await request(app)
        .post('/api/v1/user/bookmarks')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ datasetId: 'ds-batas-kabkot' });

      // User B queries bookmarks — must see 0
      const listRes = await request(app)
        .get('/api/v1/user/bookmarks')
        .set('Authorization', `Bearer ${tokenUserB}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBe(0);
    });

    it('5.2 should verify rate limiter diagnostics report backend mode', () => {
      const diagnostics = getRateLimiterDiagnostics();
      expect(diagnostics).toBeDefined();
      expect(['memory', 'upstash']).toContain(diagnostics.backend);
    });
  });
});
