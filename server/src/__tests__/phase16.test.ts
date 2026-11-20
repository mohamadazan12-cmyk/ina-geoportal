import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index';
import {
  fetchBatasKabkot,
  fetchJalanNasional,
  fetchKrbGempa,
  fetchTutupanLahan,
  fetchFasilitasKesehatan,
} from '../services/adapters';
import { realGeospatialService } from '../services/realGeospatialService';
import { getStorageDriver, geojsonKey } from '../services/storage';

describe('Phase 16 — National Geospatial Data Discovery, Validation & Integration Tests', () => {
  // --------------------------------------------------------------------------
  // 1. Batas Administrasi Kabupaten/Kota (ds-batas-kabkot)
  // --------------------------------------------------------------------------
  describe('1. Batas Administrasi Kabupaten/Kota Adapter & Quality Validation', () => {
    it('should query and parse valid GeoJSON with EPSG:4326 from Batas Wilayah adapter', async () => {
      const res = await fetchBatasKabkot({ page: 1, limit: 10, skipUpstream: true });
      expect(res.success).toBe(true);
      expect(res.isReal).toBe(true);
      expect(['REAL_VERIFIED', 'REAL']).toContain(res.status);
      expect(res.data.type).toBe('FeatureCollection');
      expect(res.data.features.length).toBe(10);
      expect(res.totalCount).toBeGreaterThanOrEqual(541);
    });

    it('should verify all 541 features cover 38 provinces with 514 unique Kemendagri codes', async () => {
      const res = await fetchBatasKabkot({ page: 1, limit: 600, skipUpstream: true });
      const features = res.data.features;
      expect(features.length).toBe(541);

      const provinces = new Set<string>();
      const kdpkabSet = new Set<string>();
      const duplicateCodes = new Map<string, number>();
      let unassignedCount = 0;

      for (const f of features) {
        expect(['Polygon', 'MultiPolygon']).toContain(f.geometry.type);
        expect(Array.isArray(f.geometry.coordinates)).toBe(true);
        expect(f.geometry.coordinates.length).toBeGreaterThan(0);

        const prov = f.properties.WADMPR || f.properties.PROVINSI;
        if (prov) provinces.add(prov);

        const code = (f.properties.KDPKAB || f.properties.kdpkab || '').trim();
        if (!code) {
          unassignedCount++;
        } else {
          kdpkabSet.add(code);
          duplicateCodes.set(code, (duplicateCodes.get(code) || 0) + 1);
        }
      }

      // Coverage: All 38 provinces represented
      expect(provinces.size).toBe(38);
      // Administrative codes: exactly 514 Kemendagri entities
      expect(kdpkabSet.size).toBe(514);
      // Unassigned outer island segments: 21
      expect(unassignedCount).toBe(21);
      // 6 disjoint archipelago split codes with 2 features each
      const dups = Array.from(duplicateCodes.entries()).filter(([_, count]) => count > 1);
      expect(dups.length).toBe(6);
    });

    it('should support pagination and bbox spatial filtering', async () => {
      const p1 = await fetchBatasKabkot({ page: 1, limit: 50, skipUpstream: true });
      const p2 = await fetchBatasKabkot({ page: 2, limit: 50, skipUpstream: true });
      expect(p1.data.features.length).toBe(50);
      expect(p2.data.features.length).toBe(50);
      expect(p1.data.features[0].properties.OBJECTID).not.toBe(
        p2.data.features[0].properties.OBJECTID
      );

      // Java BBOX query [105.0, -9.0, 115.0, -5.0]
      const javaBbox = await fetchBatasKabkot({
        bbox: [105.0, -9.0, 115.0, -5.0],
        limit: 150,
        skipUpstream: true,
      });
      expect(javaBbox.featureCount).toBeGreaterThan(0);
      expect(javaBbox.featureCount).toBeLessThan(541);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Jalan Nasional (ds-jalan-nasional)
  // --------------------------------------------------------------------------
  describe('2. Jalan Nasional Polyline Discovery & Adapter Validation', () => {
    it('should serve real polyline geometries with official BIG KSP / PUPR road attributes', async () => {
      const res = await fetchJalanNasional({ page: 1, limit: 60 });
      expect(res.success).toBe(true);
      expect(res.isReal).toBe(true);
      expect(res.data.type).toBe('FeatureCollection');
      expect(res.featureCount).toBe(60);
      expect(res.totalCount).toBeGreaterThanOrEqual(3197);

      for (const f of res.data.features) {
        expect(['LineString', 'MultiLineString']).toContain(f.geometry.type);
        expect(Array.isArray(f.geometry.coordinates)).toBe(true);
        expect(f.geometry.coordinates.length).toBeGreaterThan(0);

        // Required official road attributes
        expect(f.properties.nm_inf).toBeDefined();
        expect(f.properties.status).toBe('N'); // Status Nasional
      }
    }, 20000);

    it('should support pagination on national roads', async () => {
      const p1 = await fetchJalanNasional({ page: 1, limit: 20 });
      const p2 = await fetchJalanNasional({ page: 2, limit: 20 });
      expect(p1.featureCount).toBe(20);
      expect(p2.featureCount).toBe(20);
      expect(p1.pagination?.hasMore).toBe(true);
    }, 20000);

    it('should preserve PUPR live adapter authorization requirement without bypass', async () => {
      const puprRes = await realGeospatialService.fetchPuprLiveJalanNasional();
      expect(puprRes.success).toBe(false);
      expect(puprRes.status).toBe('PENDING_AUTHORIZATION');
      expect(puprRes.authRequired).toBe(true);
      expect(puprRes.message).toContain('PUSDATIN PUPR');
    });
  });

  // --------------------------------------------------------------------------
  // 3. Kawasan Rawan Bencana Gempa (ds-rawan-gempa)
  // --------------------------------------------------------------------------
  describe('3. Kawasan Rawan Bencana Gempa Hazard Zone Adapter & Quality Validation', () => {
    it('should serve true earthquake hazard zone polygons (not just fault lines or points)', async () => {
      const res = await fetchKrbGempa({ page: 1, limit: 50, skipUpstream: true });
      expect(res.success).toBe(true);
      expect(res.isReal).toBe(true);
      expect(res.data.type).toBe('FeatureCollection');
      expect(res.featureCount).toBe(47);
      expect(res.totalCount).toBeGreaterThanOrEqual(11439);

      const classes = new Set<string>();
      for (const f of res.data.features) {
        expect(['Polygon', 'MultiPolygon']).toContain(f.geometry.type);
        expect(f.properties.kelas).toBeDefined();
        classes.add(f.properties.kelas);
      }

      // Must cover multiple distinct hazard zones
      expect(classes.size).toBeGreaterThanOrEqual(2);
      expect(Array.from(classes).some((c) => c.includes('Tinggi'))).toBe(true);
      expect(Array.from(classes).some((c) => c.includes('Menengah'))).toBe(true);
    });

    it('should enforce civil engineering disclaimer (SNI Gempa 1726)', async () => {
      const res = await fetchKrbGempa({ skipUpstream: true });
      expect(res.disclaimer).toBeDefined();
      expect(res.disclaimer).toContain('SNI Gempa 1726');
      expect(res.disclaimer).toContain('Bukan untuk perancangan teknik sipil');
    });

    it('should maintain strict conceptual separation between hazard zones and fault lines', async () => {
      const faultDiscovery = await realGeospatialService.fetchBnpbFaultLayers();
      expect(faultDiscovery.layers.length).toBe(7);
      expect(faultDiscovery.layers[0].name).toBe('Megathrust');
      expect(faultDiscovery.layers[1].name).toBe('Java_Fault');
    });
  });

  // --------------------------------------------------------------------------
  // 4. Tutupan Lahan (ds-tutupan-lahan)
  // --------------------------------------------------------------------------
  describe('4. Tutupan Lahan Adapter & Master Upstream Scale Verification', () => {
    it('should serve verified land cover polygons with SNI classification', async () => {
      const res = await fetchTutupanLahan({ page: 1, limit: 50 });
      expect(res.success).toBe(true);
      expect(res.isReal).toBe(true);
      expect(res.featureCount).toBe(50);
      expect(res.totalCount).toBe(1284804); // Master BIG KSP upstream scale
      expect(res.data.features[0].properties.KLASIFIKASI).toBeDefined();
    });

    it('should support pagination across representative sample', async () => {
      const p1 = await fetchTutupanLahan({ page: 1, limit: 25 });
      const p2 = await fetchTutupanLahan({ page: 2, limit: 25 });
      expect(p1.featureCount).toBe(25);
      expect(p2.featureCount).toBe(25);
      expect(p1.pagination?.page).toBe(1);
      expect(p2.pagination?.page).toBe(2);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Fasilitas Kesehatan (ds-faskes)
  // --------------------------------------------------------------------------
  describe('5. Fasilitas Kesehatan Adapter & National Registry Validation', () => {
    it('should serve 102 verified health facility points across surveyed RBI sheets', async () => {
      const res = await fetchFasilitasKesehatan();
      expect(res.success).toBe(true);
      expect(res.isReal).toBe(true);
      expect(res.featureCount).toBe(102);

      let rsCount = 0;
      let puskesmasCount = 0;
      for (const f of res.data.features) {
        expect(f.geometry.type).toBe('Point');
        expect(f.geometry.coordinates.length).toBeGreaterThanOrEqual(2);
        const tipe = String(f.properties.TIPE_FASKES || '').toLowerCase();
        if (tipe.includes('rumah sakit')) rsCount++;
        else puskesmasCount++;
      }

      expect(rsCount).toBe(35);
      expect(puskesmasCount).toBe(67);
      expect(rsCount + puskesmasCount).toBe(102);
    });

    it('should verify live status telemetry contains SATUSEHAT endpoint reference', async () => {
      const res = await request(app).get('/api/v1/datasets/ds-faskes/live-status');
      expect(res.status).toBe(200);
      expect(res.body.data.details.satusehatEndpoint).toContain('mastersaranaindex');
      expect(res.body.data.details.satusehatAuth).toBe('OAUTH2_BEARER_TOKEN');
    }, 20000);
  });

  // --------------------------------------------------------------------------
  // 6. Rupa Bumi Indonesia (ds-rbi)
  // --------------------------------------------------------------------------
  describe('6. Rupa Bumi Indonesia (RBI) Cartographic Breakdown', () => {
    it('should report 890 layers and maintain separation between basemap and Sentinel-2 WMS', async () => {
      const res = await request(app).get('/api/v1/datasets/ds-rbi/live-status');
      expect(res.status).toBe(200);
      expect(res.body.data.details.totalCartographicLayers).toBe(890);
      expect(res.body.data.details.satelliteWmsUrl).toBe('https://ows.piksel.big.go.id/wms');
    }, 20000);
  });

  // --------------------------------------------------------------------------
  // 7. Storage Driver & Fixture Integrity
  // --------------------------------------------------------------------------
  describe('7. Storage Driver & Fixture Integrity Tests', () => {
    const fixtures = [
      'real_batas_kabupaten.json',
      'real_jalan_nasional.json',
      'real_rawan_bencana_gempa.json',
      'real_tutupan_lahan.json',
      'real_fasilitas_kesehatan.json',
    ];

    for (const fixtureName of fixtures) {
      it(`should verify ${fixtureName} exists and contains valid non-empty FeatureCollection`, async () => {
        const driver = getStorageDriver('public');
        const key = geojsonKey(fixtureName);
        expect(await driver.exists(key)).toBe(true);

        const text = await driver.readText(key);
        const parsed = JSON.parse(text);
        expect(parsed.type).toBe('FeatureCollection');
        expect(Array.isArray(parsed.features)).toBe(true);
        expect(parsed.features.length).toBeGreaterThan(0);

        // Every feature must have valid geometry coordinates
        for (const f of parsed.features) {
          expect(f.geometry).toBeDefined();
          expect(f.geometry.coordinates).toBeDefined();
          expect(f.properties).toBeDefined();
        }
      });
    }
  });

  // --------------------------------------------------------------------------
  // 8. REST GeoJSON Endpoints Verification
  // --------------------------------------------------------------------------
  describe('8. REST GeoJSON Endpoints Verification', () => {
    it('GET /api/v1/datasets/ds-jalan-nasional/geojson should return real road polylines', async () => {
      const res = await request(app).get('/api/v1/datasets/ds-jalan-nasional/geojson');
      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('application/geo+json');
      expect(res.header['x-data-source']).toBe('REAL_PARTIAL_COVERAGE');
      expect(res.header['x-is-demo']).toBe('false');
      expect(res.body.features.length).toBe(60);
      expect(res.body.features[0].geometry.type).toBe('LineString');
    });

    it('GET /api/v1/datasets/ds-rawan-gempa/geojson should return real hazard polygons', async () => {
      const res = await request(app).get('/api/v1/datasets/ds-rawan-gempa/geojson');
      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('application/geo+json');
      expect(res.header['x-data-source']).toBe('REAL_PARTIAL_COVERAGE');
      expect(res.header['x-is-demo']).toBe('false');
      expect(res.body.features.length).toBe(47);
      expect(['Polygon', 'MultiPolygon']).toContain(res.body.features[0].geometry.type);
      expect(res.body.features[0].properties.kelas).toBeDefined();
    });

    it('GET /api/v1/datasets/ds-jalan-nasional/geojson?demo=true should return fallback', async () => {
      const res = await request(app).get('/api/v1/datasets/ds-jalan-nasional/geojson?demo=true');
      expect(res.status).toBe(200);
      expect(res.header['x-is-demo']).toBe('true');
      expect(res.body.features.length).toBe(4);
    });
  });
});
