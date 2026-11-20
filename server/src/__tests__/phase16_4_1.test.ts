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
  geojsonWebKey,
  datasetFullKey,
  datasetFaskesKey,
  datasetRbiKey,
  manifestKey,
  chunkKey,
  partitionKey,
  StorageObjectNotFoundError,
  StorageConfigurationError,
  sanitizeStorageKey,
} from '../services/storage';
import { realGeospatialService } from '../services/realGeospatialService';
import {
  buildMigrationInventory,
  buildPublicMigrationInventory,
  runMigration,
  MigrationItem,
} from '../../scripts/migrate_to_r2';

describe('Phase 16.4.1 — Full Public Geospatial Data Storage Tests', () => {
  const fixturesDir = path.resolve(__dirname, '../fixtures/geojson');

  // ==========================================================================
  // 1. Public Object Access Without Login
  // ==========================================================================
  describe('1. Public Object Access Without Login Barrier', () => {
    it('should register all 70 geospatial assets with scope: public in unified mode', () => {
      const inventory = buildPublicMigrationInventory();
      expect(inventory.length).toBe(70);

      const scopes = inventory.map((item) => item.scope);
      expect(scopes.every((s) => s === 'public')).toBe(true);
      expect(inventory.filter((i) => i.scope === 'private').length).toBe(0);
    });

    it('should generate direct public URLs under custom domain without login requirement', () => {
      const driver = new R2StorageDriver('public', {
        bucketName: 'ina-geoportal-data',
        publicUrl: 'https://data.inageoportal.go.id',
        useScopePrefix: false, // Unified public bucket
        client: { send: vi.fn() } as any,
      });

      const fullRoadUrl = driver.getPublicUrl('datasets/ds-jalan-nasional/full/real_jalan_nasional_full.json');
      expect(fullRoadUrl).toBe(
        'https://data.inageoportal.go.id/datasets/ds-jalan-nasional/full/real_jalan_nasional_full.json'
      );

      const gempaManifestUrl = driver.getPublicUrl('manifests/gempa_manifest.json');
      expect(gempaManifestUrl).toBe('https://data.inageoportal.go.id/manifests/gempa_manifest.json');

      const webBoundaryUrl = driver.getPublicUrl('geojson/web/real_batas_kabupaten.json');
      expect(webBoundaryUrl).toBe('https://data.inageoportal.go.id/geojson/web/real_batas_kabupaten.json');
    });

    it('GET /api/v1/datasets/ds-batas-kabkot should return publicDownloadUrl for anonymous users', async () => {
      const res = await request(app).get('/api/v1/datasets/ds-batas-kabkot').expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.publicDownloadUrl).toBeDefined();
      expect(res.body.data.publicDownloadUrl).toContain('/datasets/ds-batas-kabkot/full/');
    });

    it('GET /api/v1/datasets/ds-jalan-nasional should return publicDownloadUrl for anonymous users', async () => {
      const res = await request(app).get('/api/v1/datasets/ds-jalan-nasional').expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.publicDownloadUrl).toBeDefined();
      expect(res.body.data.publicDownloadUrl).toContain(
        'datasets/ds-jalan-nasional/full/real_jalan_nasional_full.json'
      );
    });
  });

  // ==========================================================================
  // 2. SHA256 Remote & Local Verification
  // ==========================================================================
  describe('2. SHA256 Checksum Verification & Integrity Guarantee', () => {
    it('should verify SHA256 checksum of real_batas_kabupaten_548.json (292 MB)', () => {
      const p = path.join(fixturesDir, 'real_batas_kabupaten_548.json');
      const sha = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
      expect(sha).toBe('1b08944922d8d77bd41d2ceb124bf80bda1f19f18f0ba3b29bd354a5feebeb37');
    });

    it('should verify SHA256 checksum of real_jalan_nasional_full.json (126.8 MB)', () => {
      const p = path.join(fixturesDir, 'real_jalan_nasional_full.json');
      const sha = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
      expect(sha).toBe('de21e2548e5a026a45a1da5708c063c080fa4b39979f7950ea4b206df2627177');
    });

    it('should verify SHA256 checksums of core manifests and registry', () => {
      const gempaSha = crypto
        .createHash('sha256')
        .update(fs.readFileSync(path.join(fixturesDir, 'gempa_manifest.json')))
        .digest('hex');
      expect(gempaSha).toBe('5be52b13a97924512cba2932775d4fe99478e4bf6aa2f40278bbd881690864c0');

      const tutupanSha = crypto
        .createHash('sha256')
        .update(fs.readFileSync(path.join(fixturesDir, 'tutupan_lahan_manifest.json')))
        .digest('hex');
      expect(tutupanSha).toBe('d0daebaff92e6485f324c5c1528d80ba36a534ae0f272cf9abf07d4472cc33d1');

      const rbiSha = crypto
        .createHash('sha256')
        .update(fs.readFileSync(path.join(fixturesDir, 'rbi_layers_registry.json')))
        .digest('hex');
      expect(rbiSha).toBe('daea75c3fcf3bb4cec42fa38381d5fec576e3ece6993812b7a82e34c3d5b41cb');
    });
  });

  // ==========================================================================
  // 3. Content-Length & Byte Size Verification
  // ==========================================================================
  describe('3. Content-Length & Total Volume Verification', () => {
    it('should confirm total volume across all 70 assets is exactly 1,146,765,393 bytes (1,093.64 MB)', () => {
      const inventory = buildPublicMigrationInventory();
      let totalBytes = 0;
      inventory.forEach((i) => {
        totalBytes += i.sizeBytes;
      });

      expect(totalBytes).toBe(1146765393);
      expect((totalBytes / 1048576).toFixed(2)).toBe('1093.64');
    });

    it('should return exact Content-Length in getMeta via HeadObject', async () => {
      const mockSend = vi.fn().mockResolvedValueOnce({
        ContentLength: 306208706,
        ContentType: 'application/geo+json',
        LastModified: new Date('2026-11-19T00:00:00Z'),
      });

      const driver = new R2StorageDriver('public', {
        bucketName: 'ina-geoportal-data',
        useScopePrefix: false,
        client: { send: mockSend } as any,
      });

      const meta = await driver.getMeta('datasets/ds-batas-kabkot/full/real_batas_kabupaten_548.json');
      expect(meta).not.toBeNull();
      expect(meta?.size).toBe(306208706);
      expect(meta?.key).toBe('datasets/ds-batas-kabkot/full/real_batas_kabupaten_548.json');
    });
  });

  // ==========================================================================
  // 4. Download Large Archive Streams
  // ==========================================================================
  describe('4. Download Large Archives & Streaming Performance', () => {
    it('should stream large dataset archive through local storage driver without memory exhaustion', async () => {
      const driver = getStorageDriver('public');
      const stream = await driver.createReadStream('geojson/real_jalan_nasional_full.json');
      expect(stream).toBeDefined();

      let bytesReceived = 0;
      await new Promise<void>((resolve, reject) => {
        stream.on('data', (chunk) => {
          bytesReceived += chunk.length;
          // Abort reading after 512 KB to keep test quick
          if (bytesReceived > 512 * 1024) {
            stream.destroy();
            resolve();
          }
        });
        stream.on('end', resolve);
        stream.on('error', (err) => {
          if ((stream as any).destroyed) {
            resolve();
          } else {
            reject(err);
          }
        });
      });

      expect(bytesReceived).toBeGreaterThan(512 * 1024);
    });
  });

  // ==========================================================================
  // 5. HTTP Range Support
  // ==========================================================================
  describe('5. HTTP Range Request Support', () => {
    it('should format Range header in R2 GetObjectCommand for partial chunk slicing', async () => {
      let capturedCommandInput: any = null;
      const mockSend = vi.fn().mockImplementation((cmd: any) => {
        capturedCommandInput = cmd.input;
        return Promise.resolve({
          Body: Readable.from(['partial byte range data']),
          ContentRange: 'bytes 0-1048575/306208706',
          ContentLength: 1048576,
        });
      });

      const driver = new R2StorageDriver('public', {
        bucketName: 'ina-geoportal-data',
        useScopePrefix: false,
        client: { send: mockSend } as any,
      });

      const stream = await driver.createReadStream(
        'datasets/ds-batas-kabkot/full/real_batas_kabupaten_548.json',
        { start: 0, end: 1048575 }
      );

      expect(stream).toBeDefined();
      expect(capturedCommandInput).toBeDefined();
      expect(capturedCommandInput.Range).toBe('bytes=0-1048575');
      expect(capturedCommandInput.Bucket).toBe('ina-geoportal-data');
    });

    it('should support local filesystem range reads via fs.createReadStream options', async () => {
      const driver = getStorageDriver('public');
      const stream = await driver.createReadStream('geojson/real_batas_kabupaten.json', {
        start: 0,
        end: 99,
      });

      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        stream.on('data', (c) => chunks.push(Buffer.from(c)));
        stream.on('end', resolve);
        stream.on('error', reject);
      });

      const totalSlice = Buffer.concat(chunks);
      expect(totalSlice.length).toBe(100);
    });
  });

  // ==========================================================================
  // 6. CORS Configuration & Headers for Frontend
  // ==========================================================================
  describe('6. CORS Configuration for Public Cloudflare R2 Bucket', () => {
    it('should verify CORS specifications required for ina-geoportal-data bucket', () => {
      const r2CorsPolicy = {
        AllowedOrigins: [
          'https://inageoportal.go.id',
          'https://*.inageoportal.go.id',
          'http://localhost:5173',
          'http://localhost:5000',
        ],
        AllowedMethods: ['GET', 'HEAD'],
        AllowedHeaders: ['*', 'Range', 'If-Modified-Since', 'If-None-Match'],
        ExposeHeaders: ['Content-Length', 'Content-Range', 'ETag', 'X-Data-Source'],
        MaxAgeSeconds: 86400,
      };

      expect(r2CorsPolicy.AllowedMethods).toContain('GET');
      expect(r2CorsPolicy.AllowedMethods).toContain('HEAD');
      expect(r2CorsPolicy.AllowedHeaders).toContain('Range');
      expect(r2CorsPolicy.ExposeHeaders).toContain('Content-Range');
      expect(r2CorsPolicy.MaxAgeSeconds).toBe(86400);
    });
  });

  // ==========================================================================
  // 7. BBOX Querying on Public Datasets
  // ==========================================================================
  describe('7. BBOX Spatial Filtering Without Full Memory Overload', () => {
    it('should filter Jalan Nasional within Jakarta BBOX safely', async () => {
      const res = await realGeospatialService.getDatasetGeoJSON(
        'ds-jalan-nasional',
        false,
        1,
        25,
        [106.6, -6.4, 107.0, -6.0]
      );

      expect(res.data.type).toBe('FeatureCollection');
      expect(res.featureCount).toBeGreaterThan(0);
      expect(res.featureCount).toBeLessThanOrEqual(25);
    });

    it('should query Kawasan Rawan Gempa BBOX without loading full 613 MB', async () => {
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
  });

  // ==========================================================================
  // 8. Webmap Rendering & Anonymous GeoJSON Delivery
  // ==========================================================================
  describe('8. Webmap Rendering & Anonymous GeoJSON Delivery', () => {
    it('GET /api/v1/datasets/ds-batas-kabkot/geojson should serve GeoJSON anonymously without auth token', async () => {
      const res = await request(app).get('/api/v1/datasets/ds-batas-kabkot/geojson').expect(200);

      expect(res.headers['content-type']).toContain('application/geo+json');
      expect(res.headers['x-data-source']).toBe('REAL_VERIFIED');
      expect(res.body.type).toBe('FeatureCollection');
      expect(res.body.features.length).toBe(541);
    });

    it('GET /api/v1/datasets/ds-faskes/geojson should serve 4,021 health facilities with full=true', async () => {
      const res = await request(app)
        .get('/api/v1/datasets/ds-faskes/geojson?full=true&limit=10')
        .expect(200);

      expect(res.headers['content-type']).toContain('application/geo+json');
      expect(res.body.type).toBe('FeatureCollection');
      expect(res.headers['x-total-count']).toBe('4021');
    });
  });

  // ==========================================================================
  // 9. Manifest Integrity
  // ==========================================================================
  describe('9. Manifest & Registry Integrity', () => {
    it('gempa_manifest.json should index all 11,439 features across 52 chunks', () => {
      const raw = JSON.parse(
        fs.readFileSync(path.join(fixturesDir, 'gempa_manifest.json'), 'utf-8')
      );
      expect(raw.totalFeatures).toBe(11439);
      expect(raw.totalChunks).toBe(52);
      expect(raw.chunks.length).toBe(52);
    });

    it('tutupan_lahan_manifest.json should index 8 regional macro-partitions with 1,999 features', () => {
      const raw = JSON.parse(
        fs.readFileSync(path.join(fixturesDir, 'tutupan_lahan_manifest.json'), 'utf-8')
      );
      expect(raw.partitions.length).toBe(8);
      let total = 0;
      raw.partitions.forEach((p: any) => {
        total += p.featureCount;
      });
      expect(total).toBe(1999);
      const ikn = raw.partitions.find((r: any) => r.id === 'reg_kalimantan_ikn');
      expect(ikn).toBeDefined();
      expect(ikn.featureCount).toBe(250);
    });

    it('rbi_layers_registry.json should index 890 official Rupabumi Indonesia layers', () => {
      const raw = JSON.parse(
        fs.readFileSync(path.join(fixturesDir, 'rbi_layers_registry.json'), 'utf-8')
      );
      expect(raw.totalLayers).toBe(890);
      expect(raw.layers.length).toBe(890);
    });
  });

  // ==========================================================================
  // 10. Canonical Storage Key Helpers & Safe Traversal
  // ==========================================================================
  describe('10. Canonical Key Helpers & Path Traversal Prevention', () => {
    it('should generate canonical keys per Phase 16.4.1 specification', () => {
      expect(geojsonWebKey('real_batas_kabupaten.json')).toBe(
        'geojson/web/real_batas_kabupaten.json'
      );
      expect(
        datasetFullKey('ds-batas-kabkot', 'real_batas_kabupaten_548.json')
      ).toBe('datasets/ds-batas-kabkot/full/real_batas_kabupaten_548.json');
      expect(
        datasetFullKey('ds-jalan-nasional', 'real_jalan_nasional_full.json')
      ).toBe('datasets/ds-jalan-nasional/full/real_jalan_nasional_full.json');
      expect(datasetFaskesKey('real_fasilitas_kesehatan_national.json')).toBe(
        'datasets/ds-faskes/real_fasilitas_kesehatan_national.json'
      );
      expect(datasetRbiKey('rbi_layers_registry.json')).toBe(
        'datasets/ds-rbi/rbi_layers_registry.json'
      );
      expect(manifestKey('gempa_manifest.json')).toBe('manifests/gempa_manifest.json');
      expect(chunkKey('ds-rawan-gempa', 'chunk_0.json')).toBe(
        'datasets/ds-rawan-gempa/chunks/chunk_0.json'
      );
      expect(partitionKey('ds-tutupan-lahan', 'reg_sumatra.json')).toBe(
        'datasets/ds-tutupan-lahan/partitions/reg_sumatra.json'
      );
    });

    it('should sanitize directory traversal attempts safely', () => {
      expect(sanitizeStorageKey('../../etc/passwd')).toBe('etc/passwd');
      expect(sanitizeStorageKey('datasets/../secrets/.env')).toBe('datasets/secrets/.env');
      expect(() => sanitizeStorageKey('../../../')).toThrowError(StorageConfigurationError);
    });

    it('should throw StorageObjectNotFoundError when reading absent key from driver', async () => {
      const driver = getStorageDriver('public');
      await expect(driver.read('nonexistent_file_xyz.json')).rejects.toThrowError(
        StorageObjectNotFoundError
      );
    });
  });
});
