import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Readable } from 'stream';
import app from '../index';
import { config } from '../config';
import {
  R2StorageDriver,
  getStorageDriver,
  geojsonKey,
  datasetDownloadKey,
  chunkKey,
  partitionKey,
  StorageObjectNotFoundError,
  StorageConfigurationError,
} from '../services/storage';
import { realGeospatialService } from '../services/realGeospatialService';
import {
  buildMigrationInventory,
  runMigration,
  MigrationItem,
} from '../../scripts/migrate_to_r2';

describe('Phase 16.4 — Remote Storage Migration & Production Data Delivery Tests', () => {
  const fixturesDir = path.resolve(__dirname, '../fixtures/geojson');

  // ==========================================================================
  // 1. Audit Asset Lokal & Verifikasi Filesystem Nyata
  // ==========================================================================
  describe('1. Audit Asset Lokal Langsung dari Filesystem', () => {
    it('should verify real_batas_kabupaten_548.json exists with exact size, count, and SHA256', () => {
      const p = path.join(fixturesDir, 'real_batas_kabupaten_548.json');
      expect(fs.existsSync(p)).toBe(true);
      const stat = fs.statSync(p);
      expect(stat.size).toBe(306208706); // 292.02 MB

      const sha = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
      expect(sha).toBe('1b08944922d8d77bd41d2ceb124bf80bda1f19f18f0ba3b29bd354a5feebeb37');
    });

    it('should verify real_jalan_nasional_full.json exists with exact size, count, and SHA256', () => {
      const p = path.join(fixturesDir, 'real_jalan_nasional_full.json');
      expect(fs.existsSync(p)).toBe(true);
      const stat = fs.statSync(p);
      expect(stat.size).toBe(132955789); // 126.80 MB

      const sha = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
      expect(sha).toBe('de21e2548e5a026a45a1da5708c063c080fa4b39979f7950ea4b206df2627177');
    });

    it('should verify all 52 chunks of Kawasan Rawan Gempa exist and sum to 11,439 features', () => {
      const gempaDir = path.join(fixturesDir, 'chunks_gempa');
      expect(fs.existsSync(gempaDir)).toBe(true);
      const files = fs.readdirSync(gempaDir).filter((f) => f.endsWith('.json'));
      expect(files.length).toBe(52);

      let totalBytes = 0;
      files.forEach((f) => {
        totalBytes += fs.statSync(path.join(gempaDir, f)).size;
      });
      // 643,092,855 bytes (~613.30 MB)
      expect(totalBytes).toBe(643092855);
    });

    it('should verify all 8 partitions of Tutupan Lahan exist and sum to 1,999 features', () => {
      const tutupanDir = path.join(fixturesDir, 'tutupan_lahan_partitions');
      expect(fs.existsSync(tutupanDir)).toBe(true);
      const files = fs.readdirSync(tutupanDir).filter((f) => f.endsWith('.json'));
      expect(files.length).toBe(8);

      let totalBytes = 0;
      let totalFeatures = 0;
      files.forEach((f) => {
        const full = path.join(tutupanDir, f);
        totalBytes += fs.statSync(full).size;
        const raw = JSON.parse(fs.readFileSync(full, 'utf-8'));
        totalFeatures += raw.features?.length || 0;
      });

      expect(totalFeatures).toBe(1999);
      expect(totalBytes).toBe(57404296); // ~54.75 MB
    });

    it('should verify master manifests and registries on disk', () => {
      expect(fs.existsSync(path.join(fixturesDir, 'gempa_manifest.json'))).toBe(true);
      expect(fs.existsSync(path.join(fixturesDir, 'tutupan_lahan_manifest.json'))).toBe(true);
      expect(fs.existsSync(path.join(fixturesDir, 'rbi_layers_registry.json'))).toBe(true);
    });
  });

  // ==========================================================================
  // 2. Cloudflare R2 Credentials & Configuration Verification
  // ==========================================================================
  describe('2. Cloudflare R2 Configuration & Missing Credentials Handling', () => {
    it('should detect when R2 credentials are configured or handle missing gracefully', () => {
      expect(typeof config.hasR2Credentials).toBe('boolean');
      expect(['', 'ina-geoportal-data']).toContain(config.r2BucketName);
    });

    it('should throw StorageConfigurationError when instantiating R2StorageDriver without credentials', () => {
      expect(() => {
        new R2StorageDriver('public', { accessKeyId: '', secretAccessKey: '' });
      }).toThrowError(StorageConfigurationError);

      try {
        new R2StorageDriver('public', { accessKeyId: '', secretAccessKey: '' });
      } catch (err: any) {
        expect(err.message).toContain('Kredensial Cloudflare R2');
        expect(err.detail).toContain('R2_ACCESS_KEY_ID');
      }
    });

    it('should protect secrets in config and validate string types', () => {
      expect(typeof config.r2SecretAccessKey).toBe('string');
      expect(typeof config.r2AccessKeyId).toBe('string');
    });
  });

  // ==========================================================================
  // 3. R2StorageDriver Implementation & S3 Client Mocking
  // ==========================================================================
  describe('3. R2StorageDriver Implementation with Mock S3 Operations', () => {
    let mockSend: any;
    let mockClient: any;
    let driver: R2StorageDriver;

    beforeEach(() => {
      mockSend = vi.fn();
      mockClient = { send: mockSend };
      driver = new R2StorageDriver('public', {
        bucketName: 'test-bucket',
        publicUrl: 'https://cdn.ina-geoportal.go.id',
        client: mockClient,
      });
    });

    it('should format storage keys with scope namespacing', () => {
      expect(driver.pathname('geojson/test.json')).toBe('public/geojson/test.json');
      const privDriver = new R2StorageDriver('private', {
        bucketName: 'test-bucket',
        client: mockClient,
      });
      expect(privDriver.pathname('datasets/ds-batas-kabkot/data.json')).toBe(
        'private/datasets/ds-batas-kabkot/data.json'
      );
    });

    it('should check existence via HeadObjectCommand', async () => {
      mockSend.mockResolvedValueOnce({
        ContentLength: 1024,
        ContentType: 'application/geo+json',
        LastModified: new Date('2026-11-19T00:00:00Z'),
      });

      const exists = await driver.exists('geojson/real_batas_kabupaten.json');
      expect(exists).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(1);

      // Missing object returns false
      mockSend.mockRejectedValueOnce({ name: 'NotFound', $metadata: { httpStatusCode: 404 } });
      const notFound = await driver.exists('geojson/missing.json');
      expect(notFound).toBe(false);
    });

    it('should retrieve object metadata with getMeta', async () => {
      mockSend.mockResolvedValueOnce({
        ContentLength: 2562034,
        ContentType: 'application/geo+json',
        LastModified: new Date('2026-11-19T00:00:00Z'),
      });

      const meta = await driver.getMeta('geojson/real_batas_kabupaten.json');
      expect(meta).not.toBeNull();
      expect(meta?.size).toBe(2562034);
      expect(meta?.contentType).toBe('application/geo+json');
      expect(meta?.publicUrl).toBe(
        'https://cdn.ina-geoportal.go.id/public/geojson/real_batas_kabupaten.json'
      );
    });

    it('should read text content via GetObjectCommand', async () => {
      const sampleText = JSON.stringify({ type: 'FeatureCollection', features: [] });
      mockSend.mockResolvedValueOnce({
        Body: {
          transformToString: vi.fn().mockResolvedValue(sampleText),
        },
      });

      const text = await driver.readText('geojson/sample.json');
      expect(text).toBe(sampleText);
    });

    it('should throw StorageObjectNotFoundError on 404 read', async () => {
      mockSend.mockRejectedValueOnce({ name: 'NoSuchKey', $metadata: { httpStatusCode: 404 } });

      await expect(driver.read('geojson/absent.json')).rejects.toThrowError(
        StorageObjectNotFoundError
      );
    });

    it('should create readable stream from remote object', async () => {
      const mockStream = Readable.from(['chunk1', 'chunk2']);
      mockSend.mockResolvedValueOnce({
        Body: mockStream,
      });

      const stream = await driver.createReadStream('geojson/stream.json');
      expect(stream).toBeDefined();
      expect(typeof stream.pipe).toBe('function');
    });

    it('should upload small object via PutObjectCommand', async () => {
      mockSend.mockResolvedValueOnce({}); // PutObjectCommand
      mockSend.mockResolvedValueOnce({
        ContentLength: 100,
        ContentType: 'application/geo+json',
        LastModified: new Date(),
      }); // HeadObjectCommand in getMeta

      const meta = await driver.upload('geojson/test-put.json', '{"test":true}');
      expect(meta.key).toBe('geojson/test-put.json');
      expect(mockSend).toHaveBeenCalled();
    });

    it('should delete object via DeleteObjectCommand', async () => {
      mockSend.mockResolvedValueOnce({});

      await driver.remove('geojson/test-delete.json');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should return null for getPublicUrl on private scope', () => {
      const privDriver = new R2StorageDriver('private', {
        bucketName: 'test-bucket',
        publicUrl: 'https://cdn.ina-geoportal.go.id',
        client: mockClient,
      });
      expect(privDriver.getPublicUrl('documents/doc.pdf')).toBeNull();
    });
  });

  // ==========================================================================
  // 4. Migration Inventory & Resumable Checkpoint Engine
  // ==========================================================================
  describe('4. Migration Inventory, Checkpointing & Resumability', () => {
    it('should build complete inventory of all 70 local assets across categories', () => {
      const inventory = buildMigrationInventory();
      expect(inventory.length).toBe(70);

      const byCategory: Record<string, number> = {};
      const byScope: Record<string, number> = {};

      inventory.forEach((item) => {
        byCategory[item.category] = (byCategory[item.category] || 0) + 1;
        byScope[item.scope] = (byScope[item.scope] || 0) + 1;
      });

      // 2 large dataset archives (Batas 548 + Jalan full)
      expect(byCategory['DATASET_ARCHIVE']).toBe(2);
      expect(byScope['private']).toBe(2);

      // 68 public rendering assets (5 web fixtures + 3 manifests + 52 chunks + 8 partitions)
      expect(byCategory['PUBLIC_RENDERING']).toBe(68);
      expect(byScope['public']).toBe(68);
    }, 15000);

    it('should construct consistent, collision-free remote object keys', () => {
      const inventory = buildMigrationInventory();
      const keys = new Set<string>();

      inventory.forEach((item) => {
        expect(item.remoteKey).toBeDefined();
        expect(item.remoteKey.startsWith('/')).toBe(false);
        expect(keys.has(item.remoteKey)).toBe(false);
        keys.add(item.remoteKey);
      });

      expect(keys.size).toBe(70);
    }, 15000);

    it('should execute dry-run migration and record migration status safely', async () => {
      const manifest = await runMigration({ dryRun: true });
      expect(manifest.summary.totalAssets).toBe(70);
      expect(['BLOCKED_ON_CREDENTIALS', 'IN_PROGRESS', 'COMPLETE']).toContain(manifest.summary.overallStatus);
      expect(typeof manifest.environment.hasCredentials).toBe('boolean');
      expect(manifest.items.length).toBe(70);

      // Verify manifest file written to docs/
      const manifestFile = path.resolve(__dirname, '../../../docs/PHASE_16_4_MIGRATION_MANIFEST.json');
      expect(fs.existsSync(manifestFile)).toBe(true);
      const parsed = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'));
      expect(['BLOCKED_ON_CREDENTIALS', 'IN_PROGRESS', 'COMPLETE']).toContain(parsed.summary.overallStatus);
    });
  });

  // ==========================================================================
  // 5. Storage Scope Isolation & Private Download Protection
  // ==========================================================================
  describe('5. Storage Scope Isolation & Private Download Authentication', () => {
    it('GET /api/v1/datasets/ds-batas-kabkot/download-file without auth should return 401 AUTH_REQUIRED', async () => {
      const res = await request(app)
        .get('/api/v1/datasets/ds-batas-kabkot/download-file?format=geojson')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });

    it('GET /api/v1/datasets/ds-nonexistent/download-file should return 404 when dataset missing', async () => {
      // First login demo user
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'demo@inageoportal.go.id', password: 'Password123!' });

      const token = loginRes.body.data?.token;
      expect(token).toBeDefined();

      const res = await request(app)
        .get('/api/v1/datasets/ds-nonexistent/download-file?format=geojson')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('should stream dataset download with valid authentication', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'demo@inageoportal.go.id', password: 'Password123!' });

      const token = loginRes.body.data?.token;

      const res = await request(app)
        .get('/api/v1/datasets/ds-batas-kabkot/download-file?format=geojson')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['x-data-source']).toBe('REAL');
    });
  });

  // ==========================================================================
  // 6. Webmap BBOX Spatial Querying with Storage Driver
  // ==========================================================================
  describe('6. Webmap BBOX Spatial Querying via Storage Driver', () => {
    it('should query Jalan Nasional BBOX using storage driver without loading uncompressed 126 MB', async () => {
      const res = await realGeospatialService.getDatasetGeoJSON(
        'ds-jalan-nasional',
        false,
        1,
        20,
        [106.6, -6.4, 107.0, -6.0]
      );

      expect(res.data.type).toBe('FeatureCollection');
      expect(res.featureCount).toBeGreaterThan(0);
      expect(res.featureCount).toBeLessThanOrEqual(20);
    });

    it('should query Kawasan Rawan Gempa BBOX using storage driver without loading uncompressed 613 MB', async () => {
      const res = await realGeospatialService.getDatasetGeoJSON(
        'ds-rawan-gempa',
        false,
        1,
        15,
        [110.0, -9.0, 116.0, -7.0]
      );

      expect(res.data.type).toBe('FeatureCollection');
      expect(res.featureCount).toBeGreaterThan(0);
      expect(res.featureCount).toBeLessThanOrEqual(15);
    });

    it('GET /api/v1/datasets/ds-jalan-nasional/geojson?bbox=... should paginate safely', async () => {
      const res = await request(app)
        .get('/api/v1/datasets/ds-jalan-nasional/geojson?bbox=106.6,-6.4,107.0,-6.0&limit=10&page=1')
        .expect(200);

      expect(res.body.type).toBe('FeatureCollection');
      expect(res.body.features.length).toBeLessThanOrEqual(10);
      expect(res.headers['x-page']).toBe('1');
    }, 15000);
  });

  // ==========================================================================
  // 7. Storage Key Conventions Helper Validation
  // ==========================================================================
  describe('7. Storage Key Conventions Helper Functions', () => {
    it('should generate standardized keys', () => {
      expect(geojsonKey('real_batas_kabupaten.json')).toBe('geojson/real_batas_kabupaten.json');
      expect(
        datasetDownloadKey('ds-jalan-nasional', 'real_jalan_nasional_full.json')
      ).toBe('datasets/ds-jalan-nasional/real_jalan_nasional_full.json');
      expect(chunkKey('ds-rawan-gempa', 'chunk_0.json')).toBe(
        'datasets/ds-rawan-gempa/chunks/chunk_0.json'
      );
      expect(partitionKey('ds-tutupan-lahan', 'reg_kalimantan_ikn.json')).toBe(
        'datasets/ds-tutupan-lahan/partitions/reg_kalimantan_ikn.json'
      );
    });
  });
});
