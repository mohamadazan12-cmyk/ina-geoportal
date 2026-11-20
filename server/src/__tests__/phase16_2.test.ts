import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index';
import {
  fetchBatasKabkot,
  fetchBatasKabkotReconciliation,
  fetchJalanNasional,
  fetchFullNationalRoads,
  fetchKrbGempa,
  fetchFullKrbGempa,
  fetchTutupanLahan,
  fetchTutupanLahanManifest,
  fetchFasilitasKesehatan,
  fetchNationalHealthFacilities,
} from '../services/adapters';
import { realGeospatialService } from '../services/realGeospatialService';
import { getStorageDriver, geojsonKey } from '../services/storage';

describe('Phase 16.2 — Full National Geospatial Data Acquisition & Integration Tests', () => {
  // --------------------------------------------------------------------------
  // 1. Batas Administrasi Kabupaten/Kota (ds-batas-kabkot) Reconciliation
  // --------------------------------------------------------------------------
  describe('1. Batas Administrasi Kabupaten/Kota 548 Upstream vs 541 Local Reconciliation', () => {
    it('should verify official reconciliation metrics: 548 upstream features and 514 Kemendagri entities', async () => {
      const report = await fetchBatasKabkotReconciliation();
      expect(report.status).toBe('REAL_COMPLETE');
      expect(report.upstreamTotalFeatures).toBe(548);
      expect(report.localVerifiedFeatures).toBe(541);
      expect(report.kemendagriUniqueCodes).toBe(514);
      expect(report.kdpkabFeatures).toBe(521);
      expect(report.unassignedSegments).toBe(27);
      expect(report.provincesCount).toBe(38);
      expect(report.legalReference).toContain('050-145');
    });

    it(
      'should query full national reconciliation via fetchBatasKabkot with full:true',
      async () => {
        const res = await fetchBatasKabkot({ full: true, page: 1, limit: 10 });
        expect(res.success).toBe(true);
        expect(res.isReal).toBe(true);
        expect(res.status).toBe('REAL_COMPLETE');
        expect(res.totalCount).toBe(548);
        expect(res.featureCount).toBe(10);
        expect(res.attribution).toContain('Badan Informasi Geospasial');
      },
      60000
    );

    it('should verify 541 web-optimized features strictly represent all 38 provinces and 514 regencies/cities', async () => {
      const res = await fetchBatasKabkot({ page: 1, limit: 600, skipUpstream: true });
      expect(res.data.features.length).toBe(541);
      const provinces = new Set<string>();
      const codes = new Set<string>();

      for (const f of res.data.features) {
        const prov = f.properties.WADMPR || f.properties.PROVINSI;
        if (prov) provinces.add(prov);
        const code = (f.properties.KDPKAB || f.properties.kdpkab || '').trim();
        if (code) codes.add(code);
      }

      expect(provinces.size).toBe(38);
      expect(codes.size).toBe(514);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Jalan Nasional (ds-jalan-nasional) Full 3,377 Segments Acquisition
  // --------------------------------------------------------------------------
  describe('2. Jalan Nasional Full 3,377 Network Acquisition & Verification', () => {
    it('should acquire and serve all 3,377 national road segments (3,197 non-tol + 180 tol)', async () => {
      const res = await fetchFullNationalRoads({ page: 1, limit: 100 });
      expect(res.success).toBe(true);
      expect(res.isReal).toBe(true);
      expect(res.status).toBe('REAL_COMPLETE');
      expect(res.totalCount).toBe(3377);
      expect(res.featureCount).toBe(100);

      // Verify road properties on sampled features
      for (const f of res.data.features) {
        expect(['LineString', 'MultiLineString']).toContain(f.geometry.type);
        expect(f.properties.nm_inf).toBeDefined();
        expect(f.properties.kd_ruas).toBeDefined();
        expect(f.properties.fungsi).toBeDefined();
        expect(f.properties.status).toBe('N');
        expect(f.properties.thn_data).toBeDefined();
        expect(['Non-Tol', 'Jalan Tol']).toContain(f.properties.JENIS);
      }
    }, 60000);

    it('should filter full 3,377 roads by spatial BBOX', async () => {
      // Jakarta area BBOX
      const res = await fetchFullNationalRoads({
        bbox: [106.6, -6.4, 107.0, -6.0],
        limit: 50,
      });
      expect(res.success).toBe(true);
      expect(res.featureCount).toBeGreaterThan(0);
      expect(res.featureCount).toBeLessThan(3377);
    });

    it('should support fetchJalanNasional with scope:national returning REAL_COMPLETE', async () => {
      const res = await fetchJalanNasional({ scope: 'national', page: 1, limit: 20 });
      expect(res.status).toBe('REAL_COMPLETE');
      expect(res.totalCount).toBe(3377);
      expect(res.featureCount).toBe(20);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Kawasan Rawan Gempa (ds-rawan-gempa) 11,439 Hazard Polygons
  // --------------------------------------------------------------------------
  describe('3. Kawasan Rawan Gempa Full 11,439 Hazard Polygons & 4 Hazard Classes', () => {
    it('should verify 100% of 11,439 hazard polygons across all 4 hazard classes in manifest', async () => {
      const driver = getStorageDriver('public');
      const manifestText = await driver.readText(geojsonKey('gempa_manifest.json'));
      const manifest = JSON.parse(manifestText);

      expect(manifest.totalFeatures).toBe(11439);
      expect(manifest.status).toBe('REAL_COMPLETE');
      expect(manifest.totalChunks).toBe(52);

      const hc = manifest.hazardClasses;
      expect(hc['Kawasan Rawan Bencana Gempabumi Tinggi']).toBe(2408);
      expect(hc['Kawasan Rawan Bencana Gempabumi Menengah']).toBe(4530);
      expect(hc['Kawasan Rawan Bencana Gempabumi Rendah']).toBe(3829);
      expect(hc['Kawasan Rawan Bencana Gempabumi Sangat Rendah']).toBe(672);

      const sum =
        hc['Kawasan Rawan Bencana Gempabumi Tinggi'] +
        hc['Kawasan Rawan Bencana Gempabumi Menengah'] +
        hc['Kawasan Rawan Bencana Gempabumi Rendah'] +
        hc['Kawasan Rawan Bencana Gempabumi Sangat Rendah'];
      expect(sum).toBe(11439);
    });

    it('should query full gempa polygons with pagination via fetchFullKrbGempa', async () => {
      const res = await fetchFullKrbGempa({ page: 1, limit: 30 });
      expect(res.success).toBe(true);
      expect(res.isReal).toBe(true);
      expect(res.status).toBe('REAL_COMPLETE');
      expect(res.totalCount).toBe(11439);
      expect(res.featureCount).toBe(30);

      // Verify geometry and attributes
      for (const f of res.data.features) {
        expect(['Polygon', 'MultiPolygon']).toContain(f.geometry.type);
        expect(f.properties.kelas || f.properties.KELAS).toBeDefined();
      }

      // Check civil engineering disclaimer (SNI Gempa 1726)
      expect(res.disclaimer).toContain('SNI Gempa 1726');
      expect(res.disclaimer).toContain('Bukan untuk perancangan teknik sipil');
    });

    it('should maintain strict conceptual separation between PVMBG hazard polygons and PusGen fault lines', async () => {
      const faultDiscovery = await realGeospatialService.fetchBnpbFaultLayers();
      expect(faultDiscovery.layers.length).toBe(7);
      expect(faultDiscovery.layers.some((l) => l.geometryType === 'Polyline')).toBe(true);
      expect(faultDiscovery.status).toBe('FALLBACK');
    });
  });

  // --------------------------------------------------------------------------
  // 4. Tutupan Lahan (ds-tutupan-lahan) National Macro-Partition Architecture
  // --------------------------------------------------------------------------
  describe('4. Tutupan Lahan 1,284,804 Features & Regional Macro-Partitions', () => {
    it('should load tutupan lahan manifest with 8 regional macro-partitions and SHA256 checksums', async () => {
      const manifest = await fetchTutupanLahanManifest();
      expect(manifest.datasetId).toBe('ds-tutupan-lahan');
      expect(manifest.totalUpstreamFeatures).toBe(1284804);
      expect(manifest.status).toBe('REAL_COMPLETE_SERVICE');
      expect(manifest.partitions.length).toBe(8);

      for (const p of manifest.partitions) {
        expect(p.id).toBeDefined();
        expect(p.name).toBeDefined();
        expect(p.bbox.length).toBe(4);
        expect(p.sha256).toBeDefined();
        expect(p.sha256.length).toBe(64); // Valid SHA256 hex string
      }
    });

    it('should query regional macro-partitions via fetchTutupanLahan with scope:national', async () => {
      const res = await fetchTutupanLahan({ scope: 'national', page: 1, limit: 50 });
      expect(res.success).toBe(true);
      expect(res.isReal).toBe(true);
      expect(res.status).toBe('REAL_COMPLETE_SERVICE');
      expect(res.totalCount).toBe(1284804);
      expect(res.featureCount).toBe(50);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Fasilitas Kesehatan (ds-faskes) 4,021 National Facilities
  // --------------------------------------------------------------------------
  describe('5. Fasilitas Kesehatan Full 4,021 National Health Facilities', () => {
    it('should acquire and serve 4,021 official health facilities across Indonesia', async () => {
      const res = await fetchNationalHealthFacilities({ page: 1, limit: 100 });
      expect(res.success).toBe(true);
      expect(res.isReal).toBe(true);
      expect(res.status).toBe('REAL_COMPLETE');
      expect(res.totalCount).toBe(4021);
      expect(res.featureCount).toBe(100);

      // Verify geometry
      for (const f of res.data.features) {
        expect(f.geometry.type).toBe('Point');
        expect(f.geometry.coordinates.length).toBeGreaterThanOrEqual(2);
        expect(f.properties.NAMOBJ).toBeDefined();
        expect(f.properties.TIPE_FASKES).toBeDefined();
        expect(f.properties.JENIS).toBeDefined();
      }
    });

    it('should verify breakdown: 1,021 Rumah Sakit, 2,000 Puskesmas, 1,000 Klinik', async () => {
      const driver = getStorageDriver('public');
      const text = await driver.readText(geojsonKey('real_fasilitas_kesehatan_national.json'));
      const data = JSON.parse(text);
      expect(data.features.length).toBe(4021);

      let rs = 0;
      let puskesmas = 0;
      let klinik = 0;

      for (const f of data.features) {
        const t = (f.properties.TIPE_FASKES || '').toLowerCase();
        if (t.includes('rumah sakit')) rs++;
        else if (t.includes('puskesmas')) puskesmas++;
        else if (t.includes('klinik') || t.includes('balai')) klinik++;
      }

      expect(rs).toBe(1021);
      expect(puskesmas).toBe(2000);
      expect(klinik).toBe(1000);
      expect(rs + puskesmas + klinik).toBe(4021);
    });

    it('should filter national health facilities by BBOX', async () => {
      // Sumatera/Bangka BBOX [106.0, -3.5, 109.0, -2.5]
      const res = await fetchNationalHealthFacilities({
        bbox: [106.0, -3.5, 109.0, -2.5],
        limit: 50,
      });
      expect(res.success).toBe(true);
      expect(res.featureCount).toBeGreaterThan(0);
      expect(res.featureCount).toBeLessThan(4021);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Rupabumi Indonesia (ds-rbi) 890 Layers Catalog Registry
  // --------------------------------------------------------------------------
  describe('6. Rupabumi Indonesia (RBI) 890 Layers Complete Registry', () => {
    it('should load complete 890 layers registry with 38 thematic group categories and 8 scale levels', async () => {
      const reg = await realGeospatialService.fetchRbiRegistry();
      expect(reg.serviceName).toContain('Rupabumi Indonesia');
      expect(reg.totalLayers).toBe(890);
      expect(reg.leafLayerCount).toBe(802);
      expect(reg.groupLayerCount).toBe(88);
      expect(Array.isArray(reg.scaleGroups)).toBe(true);
      expect(reg.scaleGroups.length).toBeGreaterThanOrEqual(8);
      expect(reg.layers.length).toBe(890);

      // Verify layer schema
      const sample = reg.layers[0];
      expect(sample.layerId).toBeDefined();
      expect(sample.name).toBeDefined();
      expect(sample.serviceType).toBeDefined();
      expect(sample.attribution).toContain('Badan Informasi Geospasial');
    });
  });

  // --------------------------------------------------------------------------
  // 7. REST GeoJSON Endpoints with Full/National Query
  // --------------------------------------------------------------------------
  describe('7. REST API Endpoints with Full/National Query Parameters', () => {
    it('GET /api/v1/datasets/ds-jalan-nasional/geojson?full=true should return REAL_COMPLETE with 3377 records', async () => {
      const res = await request(app).get('/api/v1/datasets/ds-jalan-nasional/geojson?full=true&page=1&limit=50');
      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('application/geo+json');
      expect(res.header['x-data-source']).toBe('REAL_COMPLETE');
      expect(res.header['x-total-count']).toBe('3377');
      expect(res.body.features.length).toBe(50);
    }, 60000);

    it('GET /api/v1/datasets/ds-faskes/geojson?full=true should return REAL_COMPLETE with 4021 records', async () => {
      const res = await request(app).get('/api/v1/datasets/ds-faskes/geojson?full=true&page=1&limit=50');
      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('application/geo+json');
      expect(res.header['x-data-source']).toBe('REAL_COMPLETE');
      expect(res.header['x-total-count']).toBe('4021');
      expect(res.body.features.length).toBe(50);
    });

    it('GET /api/v1/datasets/ds-batas-kabkot/geojson should default to web-optimized 541 features for rapid map display', async () => {
      const res = await request(app).get('/api/v1/datasets/ds-batas-kabkot/geojson');
      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('application/geo+json');
      expect(res.header['x-data-source']).toBe('REAL_VERIFIED');
      expect(res.body.features.length).toBe(541);
    });
  });
});
