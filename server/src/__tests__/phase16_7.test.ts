import path from 'path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { config } from '../config';
import {
  getStorageDriver,
  resetStorageDrivers,
  toCanonicalKey,
  canonicalToLocalFixture,
  CANONICAL_KEYS_70,
  R2StorageDriver,
  LocalStorageDriver,
  ResilientR2StorageDriver,
} from '../services/storage';
import { realGeospatialService } from '../services/realGeospatialService';

describe('Phase 16.7 — Cloudflare R2 Runtime Integration Tests', () => {
  const originalDriver = process.env.STORAGE_DRIVER;

  beforeAll(() => {
    process.env.STORAGE_DRIVER = 'r2';
    resetStorageDrivers();
  });

  afterAll(() => {
    process.env.STORAGE_DRIVER = originalDriver || 'local';
    resetStorageDrivers();
  });

  // ==========================================================================
  // 1. Canonical Keys Mapping & Registry (70 assets)
  // ==========================================================================
  describe('1. Canonical Keys Registry & Bidirectional Mapping', () => {
    it('should register exactly 70 canonical keys', () => {
      expect(CANONICAL_KEYS_70.length).toBe(70);
    });

    it('should map legacy filenames to canonical keys correctly', () => {
      expect(toCanonicalKey('real_batas_kabupaten.json')).toBe('geojson/web/real_batas_kabupaten.json');
      expect(toCanonicalKey('real_jalan_nasional.json')).toBe('geojson/web/real_jalan_nasional.json');
      expect(toCanonicalKey('real_rawan_bencana_gempa.json')).toBe('geojson/web/real_rawan_bencana_gempa.json');
      expect(toCanonicalKey('real_tutupan_lahan.json')).toBe('geojson/web/real_tutupan_lahan.json');
      expect(toCanonicalKey('real_batas_kabupaten_548.json')).toBe(
        'datasets/ds-batas-kabkot/full/real_batas_kabupaten_548.json'
      );
      expect(toCanonicalKey('real_jalan_nasional_full.json')).toBe(
        'datasets/ds-jalan-nasional/full/real_jalan_nasional_full.json'
      );
      expect(toCanonicalKey('real_fasilitas_kesehatan_national.json')).toBe(
        'datasets/ds-faskes/real_fasilitas_kesehatan_national.json'
      );
      expect(toCanonicalKey('rbi_layers_registry.json')).toBe('datasets/ds-rbi/rbi_layers_registry.json');
      expect(toCanonicalKey('gempa_manifest.json')).toBe('manifests/gempa_manifest.json');
      expect(toCanonicalKey('tutupan_lahan_manifest.json')).toBe('manifests/tutupan_lahan_manifest.json');
    });

    it('should map canonical keys to existing local fixture files for fallback', () => {
      expect(canonicalToLocalFixture('geojson/web/real_batas_kabupaten.json')).toBe(
        'geojson/real_batas_kabupaten.json'
      );
      expect(
        canonicalToLocalFixture('datasets/ds-batas-kabkot/full/real_batas_kabupaten_548.json')
      ).toBe('geojson/real_batas_kabupaten_548.json');
      expect(
        canonicalToLocalFixture('datasets/ds-jalan-nasional/full/real_jalan_nasional_full.json')
      ).toBe('geojson/real_jalan_nasional_full.json');
      expect(
        canonicalToLocalFixture('datasets/ds-rawan-gempa/chunks/chunk_0.json')
      ).toBe('geojson/chunks_gempa/chunk_0.json');
      expect(
        canonicalToLocalFixture('datasets/ds-tutupan-lahan/partitions/reg_kalimantan_ikn.json')
      ).toBe('geojson/tutupan_lahan_partitions/reg_kalimantan_ikn.json');
    });
  });

  // ==========================================================================
  // 2. Resilient Storage Driver & Transparent Local Fallback
  // ==========================================================================
  describe('2. Resilient Driver & Fallback Mechanism', () => {
    it('getStorageDriver should return ResilientR2StorageDriver when STORAGE_DRIVER=r2', () => {
      const driver = getStorageDriver('public');
      expect(driver.name).toBe('r2');
      expect(driver).toBeInstanceOf(ResilientR2StorageDriver);
    });

    it('should read from R2 when online and report activeSource as r2', async () => {
      const driver = getStorageDriver('public') as ResilientR2StorageDriver;
      const text = await driver.readText('manifests/gempa_manifest.json');
      const manifest = JSON.parse(text);
      expect(manifest.totalFeatures).toBe(11439);
      expect(driver.getActiveSource()).toBe('r2');
    });

    it('should fall back gracefully to local fixture if R2 throws error', async () => {
      // Create a mock faulty R2 driver that simulates network connection loss
      const faultyR2 = {
        name: 'r2',
        scope: 'public',
        exists: async () => { throw new Error('ECONNRESET Connection lost'); },
        getMeta: async () => { throw new Error('ECONNRESET Connection lost'); },
        read: async () => { throw new Error('ECONNRESET Connection lost'); },
        readText: async () => { throw new Error('ECONNRESET Connection lost'); },
        createReadStream: async () => { throw new Error('ECONNRESET Connection lost'); },
        upload: async () => { throw new Error('ECONNRESET Connection lost'); },
        remove: async () => { throw new Error('ECONNRESET Connection lost'); },
        getPublicUrl: () => 'https://pub-9dc737b540c54b5597b47a06cbbda81e.r2.dev/mock',
      } as unknown as R2StorageDriver;

      const rootDir = path.resolve(__dirname, '../fixtures');
      const localFallback = new LocalStorageDriver('public', rootDir);
      const resilient = new ResilientR2StorageDriver('public', faultyR2, localFallback);

      // Verify that readText does NOT throw, but returns local data and sets activeSource = 'local-fallback'
      const text = await resilient.readText('geojson/web/real_batas_kabupaten.json');
      const data = JSON.parse(text);
      expect(data.features.length).toBe(541);
      expect(resilient.getActiveSource()).toBe('local-fallback');
      expect(resilient.lastError).toContain('ECONNRESET');
    });
  });

  // ==========================================================================
  // 3. Runtime Layer Loading & Geospatial Endpoints
  // ==========================================================================
  describe('3. Runtime Layer Loading via R2 Storage Driver', () => {
    it('GET /api/v1/datasets/ds-batas-kabkot/geojson should serve 541 boundaries from R2', async () => {
      const res = await request(app).get('/api/v1/datasets/ds-batas-kabkot/geojson');
      expect(res.status).toBe(200);
      expect(res.body.type).toBe('FeatureCollection');
      expect(res.body.features.length).toBe(541);
      expect(res.headers['x-storage-driver']).toBe('r2');
      expect(res.headers['x-canonical-key']).toContain('real_batas_kabupaten.json');
      expect(res.headers['x-public-url']).toContain('https://pub-9dc737b540c54b5597b47a06cbbda81e.r2.dev');
    });

    it('GET /api/v1/datasets/ds-jalan-nasional/geojson should serve 60 primary corridors', async () => {
      const res = await request(app).get('/api/v1/datasets/ds-jalan-nasional/geojson');
      expect(res.status).toBe(200);
      expect(res.body.features.length).toBe(60);
      expect(res.headers['x-storage-driver']).toBe('r2');
      expect(res.headers['x-canonical-key']).toContain('real_jalan_nasional.json');
    });

    it('GET /api/v1/datasets/ds-jalan-nasional/geojson?full=true should serve full 3,377 network from R2', async () => {
      const res = await request(app).get('/api/v1/datasets/ds-jalan-nasional/geojson?full=true&limit=10');
      expect(res.status).toBe(200);
      expect(res.body.features.length).toBe(10);
      expect(res.body.pagination.total).toBe(3377);
      expect(res.headers['x-canonical-key']).toBe('datasets/ds-jalan-nasional/full/real_jalan_nasional_full.json');
    }, 25000);

    it('GET /api/v1/datasets/ds-rawan-gempa/geojson should serve 47 hazard zones', async () => {
      const res = await request(app).get('/api/v1/datasets/ds-rawan-gempa/geojson');
      expect(res.status).toBe(200);
      expect(res.body.features.length).toBe(47);
      expect(res.headers['x-storage-driver']).toBe('r2');
      expect(res.headers['x-canonical-key']).toContain('real_rawan_bencana_gempa.json');
    });

    it('GET /api/v1/datasets/ds-tutupan-lahan/geojson should serve 200 regional macro features', async () => {
      const res = await request(app).get('/api/v1/datasets/ds-tutupan-lahan/geojson');
      expect(res.status).toBe(200);
      expect(res.body.features.length).toBe(200);
      expect(res.headers['x-storage-driver']).toBe('r2');
      expect(res.headers['x-canonical-key']).toContain('real_tutupan_lahan.json');
    });

    it('GET /api/v1/datasets/ds-faskes/geojson should serve 4,021 health facilities', async () => {
      const res = await request(app).get('/api/v1/datasets/ds-faskes/geojson?full=true&limit=25');
      expect(res.status).toBe(200);
      expect(res.body.features.length).toBe(25);
      expect(res.body.pagination.total).toBe(4021);
      expect(res.headers['x-canonical-key']).toBe('datasets/ds-faskes/real_fasilitas_kesehatan_national.json');
    });
  });

  // ==========================================================================
  // 4. Dedicated Storage Proxy & CORS Endpoints
  // ==========================================================================
  describe('4. Dedicated Storage Proxy & CORS Headers', () => {
    it('GET /api/v1/storage/status should report R2 runtime configuration', async () => {
      const res = await request(app).get('/api/v1/storage/status');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.storageDriver).toBe('r2');
      expect(res.body.data.bucketName).toBe('ina-geoportal-data');
      expect(res.body.data.publicBaseUrl).toContain('https://pub-9dc737b540c54b5597b47a06cbbda81e.r2.dev');
      expect(res.body.data.totalCanonicalAssets).toBe(70);
    });

    it('GET /api/v1/storage/r2/manifests/gempa_manifest.json should stream with CORS headers', async () => {
      const res = await request(app).get('/api/v1/storage/r2/manifests/gempa_manifest.json');
      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('*');
      expect(res.headers['content-type']).toContain('json');
      expect(res.body.totalFeatures).toBe(11439);
      expect(res.body.chunks.length).toBe(52);
    });

    it('GET /api/v1/storage/r2/datasets/ds-batas-kabkot/full/real_batas_kabupaten_548.json with Range header should return 206', async () => {
      const res = await request(app)
        .get('/api/v1/storage/r2/datasets/ds-batas-kabkot/full/real_batas_kabupaten_548.json')
        .set('Range', 'bytes=0-511')
        .buffer(true)
        .parse((r, cb) => {
          let data = '';
          r.on('data', (chunk) => {
            data += chunk;
          });
          r.on('end', () => cb(null, data));
        });

      expect(res.status).toBe(206);
      expect(res.headers['content-range']).toContain('bytes 0-511/306208706');
      expect(res.headers['content-length']).toBe('512');
      expect(res.headers['access-control-allow-origin']).toBe('*');
      expect(res.body.length).toBe(512);
    });
  });

  // ==========================================================================
  // 5. Public Access vs Personal Features Security
  // ==========================================================================
  describe('5. Public Anonymous Access vs Personal Features Protection', () => {
    it('GET /api/v1/datasets/ds-batas-kabkot should include publicDownloadUrl and r2PublicUrl', async () => {
      const res = await request(app).get('/api/v1/datasets/ds-batas-kabkot');
      expect(res.status).toBe(200);
      expect(res.body.data.publicDownloadUrl).toContain('datasets/ds-batas-kabkot/full/real_batas_kabupaten_548.json');
      expect(res.body.data.r2PublicUrl).toContain('https://pub-9dc737b540c54b5597b47a06cbbda81e.r2.dev');
    });

    it('Personal bookmarks feature should strictly require authentication', async () => {
      const res = await request(app).post('/api/v1/user/bookmarks/ds-batas-kabkot');
      expect(res.status).toBe(401);
      expect(['UNAUTHORIZED', 'AUTH_REQUIRED']).toContain(res.body.error.code);
    });

    it('Personal download history feature should strictly require authentication', async () => {
      const res = await request(app).get('/api/v1/user/downloads');
      expect(res.status).toBe(401);
      expect(['UNAUTHORIZED', 'AUTH_REQUIRED']).toContain(res.body.error.code);
    });
  });
});
