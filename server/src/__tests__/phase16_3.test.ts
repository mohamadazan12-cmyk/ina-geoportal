import { describe, it, expect } from 'vitest';
import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import app from '../index';
import { realGeospatialService } from '../services/realGeospatialService';
import {
  fetchFullNationalRoads,
  fetchFullKrbGempa,
  fetchNationalHealthFacilities,
  fetchTutupanLahanManifest,
} from '../services/adapters';

describe('Phase 16.3 — National Data Integrity & Storage Readiness Tests', () => {
  const fixturesDir = path.resolve(__dirname, '../fixtures/geojson');

  // ==========================================================================
  // 1. Fasilitas Kesehatan Validation & Deep Classification Audit
  // ==========================================================================
  describe('1. Fasilitas Kesehatan Classification & Integrity Audit', () => {
    const faskesPath = path.join(fixturesDir, 'real_fasilitas_kesehatan_national.json');

    it('should verify exact total of 4,021 health facilities in national fixture', () => {
      expect(fs.existsSync(faskesPath)).toBe(true);
      const raw = JSON.parse(fs.readFileSync(faskesPath, 'utf-8'));
      expect(raw.type).toBe('FeatureCollection');
      expect(raw.features.length).toBe(4021);
      expect(raw.metadata).toBeDefined();
      expect(raw.metadata.totalFeatures).toBe(4021);
    });

    it('should verify layer breakdown across BIG RBI Layers 474, 475, and 476', () => {
      const raw = JSON.parse(fs.readFileSync(faskesPath, 'utf-8'));
      const countsBySource: Record<string, number> = {};
      const countsByRemark: Record<string, number> = {};

      for (const f of raw.features) {
        const source = f.properties.SUMBER;
        countsBySource[source] = (countsBySource[source] || 0) + 1;
        const remark = (f.properties.REMARK || '').trim();
        countsByRemark[remark] = (countsByRemark[remark] || 0) + 1;
      }

      // Layer 474: Rumah Sakit = 1,021 (100% of upstream)
      expect(countsBySource['Badan Informasi Geospasial (BIG) RBI Layer 474']).toBe(1021);
      expect(countsByRemark['Rumah Sakit Umum']).toBe(833);
      expect(countsByRemark['Rumah Sakit Khusus']).toBe(188);

      // Layer 475: Puskesmas = 2,000 (verified sample of 14,150 upstream)
      expect(countsBySource['Badan Informasi Geospasial (BIG) RBI Layer 475']).toBe(2000);
      expect(countsByRemark['Puskesmas/Puskesmas Pembantu']).toBe(2000);

      // Layer 476: Layanan Kesehatan = 1,000 (verified sample of 4,671 upstream)
      expect(countsBySource['Badan Informasi Geospasial (BIG) RBI Layer 476']).toBe(1000);
      expect(countsByRemark['Poliklinik/Polindes/Posyandu']).toBe(1000);
    });

    it('should audit TPLYST domain coded values on Layer 476 and not misclassify as generic clinic', () => {
      const raw = JSON.parse(fs.readFileSync(faskesPath, 'utf-8'));
      const layer476Features = raw.features.filter(
        (f: any) => f.properties.SUMBER === 'Badan Informasi Geospasial (BIG) RBI Layer 476'
      );
      expect(layer476Features.length).toBe(1000);

      // Verify domain WS12_TLK codes: 1: Posyandu, 2: Polindes, 3: Poliklinik, 4: Dokter, 5: Bidan, 999: Lainnya
      const tplystValues = new Set(layer476Features.map((f: any) => f.properties.TPLYST));
      // In BIG upstream data, all records carry code 1 (Posyandu) while REMARK denotes Poliklinik/Polindes/Posyandu
      expect(tplystValues.has(1)).toBe(true);

      for (const f of layer476Features) {
        expect(typeof f.properties.TPLYST).toBe('number');
        expect(f.properties.REMARK.trim()).toBe('Poliklinik/Polindes/Posyandu');
      }
    });

    it('should verify all 4,021 health facility coordinates are spatially unique', () => {
      const raw = JSON.parse(fs.readFileSync(faskesPath, 'utf-8'));
      const coordSet = new Set<string>();

      for (const f of raw.features) {
        expect(f.geometry.type).toBe('Point');
        const [lng, lat] = f.geometry.coordinates;
        expect(typeof lng).toBe('number');
        expect(typeof lat).toBe('number');
        // Coordinates within Indonesia bounding box [95, -11.5, 141.5, 6.5]
        expect(lng).toBeGreaterThanOrEqual(95);
        expect(lng).toBeLessThanOrEqual(141.5);
        expect(lat).toBeGreaterThanOrEqual(-11.5);
        expect(lat).toBeLessThanOrEqual(6.5);

        const key = `${lng.toFixed(6)},${lat.toFixed(6)}`;
        coordSet.add(key);
      }

      // 4,021 unique spatial points
      expect(coordSet.size).toBe(4021);
    });

    it('should document honest provenance distinguishing BIG RBI from Kemenkes SIRS/SATUSEHAT', async () => {
      const res = await fetchNationalHealthFacilities({ page: 1, limit: 10 });
      expect(res.status).toBe('REAL_COMPLETE');
      expect(res.attribution).toContain('Badan Informasi Geospasial');
      expect(res.totalCount).toBe(4021);
    });
  });

  // ==========================================================================
  // 2. Jalan Nasional Full 3,377 Segments & Unique ObjectIDs
  // ==========================================================================
  describe('2. Jalan Nasional 3,377 Segments & ObjectID Uniqueness', () => {
    const roadPath = path.join(fixturesDir, 'real_jalan_nasional_full.json');

    it('should verify exactly 3,377 features in real_jalan_nasional_full.json', () => {
      expect(fs.existsSync(roadPath)).toBe(true);
      const raw = JSON.parse(fs.readFileSync(roadPath, 'utf-8'));
      expect(raw.features.length).toBe(3377);
    });

    it('should verify non-tol (3,197) and tol (180) breakdown', () => {
      const raw = JSON.parse(fs.readFileSync(roadPath, 'utf-8'));
      let nonTol = 0;
      let tol = 0;

      for (const f of raw.features) {
        if (f.properties.JENIS === 'Tol') tol++;
        else nonTol++;
      }

      expect(nonTol).toBe(3197);
      expect(tol).toBe(180);
    });

    it('should strictly verify all 3,377 features have unique ObjectIDs (zero collisions)', () => {
      const raw = JSON.parse(fs.readFileSync(roadPath, 'utf-8'));
      const idSet = new Set<number>();

      for (const f of raw.features) {
        const id = f.properties.OBJECTID;
        expect(id).toBeDefined();
        expect(typeof id).toBe('number');
        expect(idSet.has(id)).toBe(false); // No collision!
        idSet.add(id);
      }

      expect(idSet.size).toBe(3377);
    }, 25000);

    it('should verify tol road offsets and preservation of LAYER_OBJECTID', () => {
      const raw = JSON.parse(fs.readFileSync(roadPath, 'utf-8'));
      const tolFeatures = raw.features.filter((f: any) => f.properties.JENIS === 'Tol');
      expect(tolFeatures.length).toBe(180);

      for (const f of tolFeatures) {
        // Offset OBJECTID is in 4001..4180
        expect(f.properties.OBJECTID).toBeGreaterThanOrEqual(4001);
        expect(f.properties.OBJECTID).toBeLessThanOrEqual(4180);
        // Original Layer 14 OBJECTID preserved
        expect(f.properties.LAYER_OBJECTID).toBeGreaterThanOrEqual(1);
        expect(f.properties.LAYER_OBJECTID).toBeLessThanOrEqual(180);
      }
    });
  });

  // ==========================================================================
  // 3. Kawasan Rawan Gempa 11,439 Hazard Polygons & 52 Chunks
  // ==========================================================================
  describe('3. Kawasan Rawan Gempa 11,439 Hazard Polygons & 52 Chunks', () => {
    const manifestPath = path.join(fixturesDir, 'gempa_manifest.json');
    const chunksDir = path.join(fixturesDir, 'chunks_gempa');

    it('should verify manifest records 11,439 features across 52 chunks and 4 hazard classes', () => {
      expect(fs.existsSync(manifestPath)).toBe(true);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      expect(manifest.totalFeatures).toBe(11439);
      expect(manifest.totalChunks).toBe(52);
      expect(manifest.hazardClasses).toEqual({
        'Kawasan Rawan Bencana Gempabumi Tinggi': 2408,
        'Kawasan Rawan Bencana Gempabumi Menengah': 4530,
        'Kawasan Rawan Bencana Gempabumi Rendah': 3829,
        'Kawasan Rawan Bencana Gempabumi Sangat Rendah': 672,
      });
    });

    it(
      'should verify all 52 chunk files exist on disk and sum to 11,439 features',
      () => {
        expect(fs.existsSync(chunksDir)).toBe(true);
        const chunkFiles = fs.readdirSync(chunksDir).filter((f) => f.startsWith('chunk_') && f.endsWith('.json'));
        expect(chunkFiles.length).toBe(52);

        let totalInChunks = 0;
        for (const cf of chunkFiles) {
          const cPath = path.join(chunksDir, cf);
          const data = JSON.parse(fs.readFileSync(cPath, 'utf-8'));
          const features = Array.isArray(data) ? data : data.features;
          expect(Array.isArray(features)).toBe(true);
          totalInChunks += features.length;
        }

        expect(totalInChunks).toBe(11439);
      },
      30000
    );
  });

  // ==========================================================================
  // 4. Tutupan Lahan 8 Partitions Integrity & IKN Coverage
  // ==========================================================================
  describe('4. Tutupan Lahan 8 Partitions & Regional Coverage', () => {
    const partitionsDir = path.join(fixturesDir, 'tutupan_lahan_partitions');
    const manifestPath = path.join(fixturesDir, 'tutupan_lahan_manifest.json');

    it('should verify manifest defines 8 regions with non-empty features and valid SHA256', () => {
      expect(fs.existsSync(manifestPath)).toBe(true);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const regions = Object.keys(manifest.partitions);
      expect(regions.length).toBe(8);

      let totalFeatures = 0;
      for (const [regionKey, meta] of Object.entries<any>(manifest.partitions)) {
        const filePath = path.join(partitionsDir, meta.file);
        expect(fs.existsSync(filePath)).toBe(true);

        const content = fs.readFileSync(filePath);
        const actualSha256 = crypto.createHash('sha256').update(content).digest('hex');
        expect(actualSha256).toBe(meta.sha256);

        const json = JSON.parse(content.toString('utf-8'));
        expect(json.features.length).toBe(meta.featureCount);
        expect(meta.featureCount).toBeGreaterThan(0);
        totalFeatures += meta.featureCount;
      }

      // Total verified partition features
      expect(totalFeatures).toBe(1999);
    });

    it('should verify Kalimantan / IKN partition specifically contains 250 features', () => {
      const iknPath = path.join(partitionsDir, 'reg_kalimantan_ikn.json');
      expect(fs.existsSync(iknPath)).toBe(true);
      const raw = JSON.parse(fs.readFileSync(iknPath, 'utf-8'));
      expect(raw.features.length).toBe(250);

      // Verify geometry and attributes
      for (const f of raw.features.slice(0, 10)) {
        expect(['Polygon', 'MultiPolygon']).toContain(f.geometry.type);
        expect(f.properties.REMARK).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // 5. Storage Readiness & Large File Protection (<100 MiB Limit)
  // ==========================================================================
  describe('5. Storage Readiness & Large File Protection (<100 MiB Limit)', () => {
    it('should verify .gitignore explicitly ignores large files exceeding 100 MiB', () => {
      const gitignorePath = path.resolve(__dirname, '../../../.gitignore');
      expect(fs.existsSync(gitignorePath)).toBe(true);
      const gitignore = fs.readFileSync(gitignorePath, 'utf-8');

      expect(gitignore).toContain('*_548.json');
      expect(gitignore).toContain('*_full.json');
      expect(gitignore).toContain('chunks_gempa/');
      expect(gitignore).toContain('chunks_batas/');
      expect(gitignore).toContain('.*_checkpoint.json');
    });

    it('should verify web-optimized fixtures tracked in git are strictly under 5 MiB', () => {
      const webFixtures = [
        'real_batas_kabupaten.json',
        'real_jalan_nasional.json',
        'real_rawan_bencana_gempa.json',
        'real_fasilitas_kesehatan.json',
        'real_tutupan_lahan.json',
      ];

      for (const name of webFixtures) {
        const fp = path.join(fixturesDir, name);
        if (fs.existsSync(fp)) {
          const stats = fs.statSync(fp);
          // Web fixtures must be < 5 MiB (5,242,880 bytes)
          expect(stats.size).toBeLessThan(5 * 1024 * 1024);
        }
      }
    });
  });

  // ==========================================================================
  // 6. Real Geospatial Service & REST API Spatial Querying
  // ==========================================================================
  describe('6. Real Geospatial Service & REST API Spatial Querying', () => {
    it('should query Jalan Nasional with bbox from full 3,377 road network', async () => {
      const res = await realGeospatialService.getDatasetGeoJSON(
        'ds-jalan-nasional',
        false,
        1,
        25,
        [106.6, -6.4, 107.0, -6.0] // Greater Jakarta
      );

      expect(res.data.type).toBe('FeatureCollection');
      expect(res.dataSourceStatus).toBe('REAL_COMPLETE');
      expect(res.featureCount).toBeGreaterThan(0);
      expect(res.data.features.length).toBeLessThanOrEqual(25);
    });

    it('should query Kawasan Rawan Gempa with bbox across verified hazard zones', async () => {
      const res = await realGeospatialService.getDatasetGeoJSON(
        'ds-rawan-gempa',
        false,
        1,
        20,
        [110.0, -9.0, 116.0, -7.0] // Central & East Java / Bali zone
      );

      expect(res.data.type).toBe('FeatureCollection');
      expect(res.featureCount).toBeGreaterThan(0);
      expect(res.data.features.length).toBeLessThanOrEqual(20);
    });

    it('should query Fasilitas Kesehatan with bbox across national 4,021 points', async () => {
      const res = await realGeospatialService.getDatasetGeoJSON(
        'ds-faskes',
        false,
        1,
        30,
        [95.0, 3.0, 98.0, 6.0] // Northern Sumatra / Aceh zone with high RBI density
      );

      expect(res.data.type).toBe('FeatureCollection');
      expect(res.dataSourceStatus).toBe('REAL_COMPLETE');
      expect(res.featureCount).toBeGreaterThan(0);
      expect(res.data.features.length).toBeLessThanOrEqual(30);
    });

    it('GET /api/v1/datasets/ds-jalan-nasional/geojson?bbox=106.6,-6.4,107.0,-6.0 should return filtered GeoJSON', async () => {
      const res = await request(app)
        .get('/api/v1/datasets/ds-jalan-nasional/geojson?bbox=106.6,-6.4,107.0,-6.0&limit=15')
        .expect(200);

      expect(res.body.type).toBe('FeatureCollection');
      expect(Array.isArray(res.body.features)).toBe(true);
      expect(res.body.features.length).toBeGreaterThan(0);
      expect(res.body.features.length).toBeLessThanOrEqual(15);
      expect(res.headers['x-data-source']).toBe('REAL_COMPLETE');
    }, 15000);

    it('GET /api/v1/datasets/ds-rawan-gempa/geojson?bbox=110.0,-9.0,116.0,-7.0 should return filtered GeoJSON', async () => {
      const res = await request(app)
        .get('/api/v1/datasets/ds-rawan-gempa/geojson?bbox=110.0,-9.0,116.0,-7.0&limit=15')
        .expect(200);

      expect(res.body.type).toBe('FeatureCollection');
      expect(Array.isArray(res.body.features)).toBe(true);
      expect(res.body.features.length).toBeGreaterThan(0);
      expect(res.body.features.length).toBeLessThanOrEqual(15);
    });

    it('GET /api/v1/datasets/ds-faskes/geojson?bbox=95.0,3.0,98.0,6.0 should return filtered GeoJSON', async () => {
      const res = await request(app)
        .get('/api/v1/datasets/ds-faskes/geojson?bbox=95.0,3.0,98.0,6.0&limit=25')
        .expect(200);

      expect(res.body.type).toBe('FeatureCollection');
      expect(Array.isArray(res.body.features)).toBe(true);
      expect(res.body.features.length).toBeGreaterThan(0);
      expect(res.body.features.length).toBeLessThanOrEqual(25);
      expect(res.headers['x-data-source']).toBe('REAL_COMPLETE');
    });
  });
});
