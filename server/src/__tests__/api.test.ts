import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app, { server } from '../index';
import { prisma } from '../config/db';
import { realGeospatialService } from '../services/realGeospatialService';

describe('Ina-Geoportal v2.0 REST API Integration Tests', () => {
  beforeAll(async () => {
    // ensure db connection
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    if (server && typeof server.close === 'function') {
      server.close();
    }
  });

  it('GET /health should return 200 OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });

  it('GET /api/v1/stats/overview should return system statistics', async () => {
    const res = await request(app).get('/api/v1/stats/overview');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalDatasets).toBeGreaterThanOrEqual(6);
    expect(res.body.data.topCategories.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/search/suggest?q=batas should return suggestions', async () => {
    const res = await request(app).get('/api/v1/search/suggest?q=batas');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/datasets should list datasets with pagination', async () => {
    const res = await request(app).get('/api/v1/datasets?page=1&limit=5');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(6);
  });

  it('GET /api/v1/datasets/ds-batas-kabkot should return dataset detail', async () => {
    const res = await request(app).get('/api/v1/datasets/ds-batas-kabkot');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('ds-batas-kabkot');
    expect(res.body.data.node).toBeDefined();
  });

  it('GET /api/v1/datasets/ds-batas-kabkot/geojson should serve valid GeoJSON', async () => {
    const res = await request(app).get('/api/v1/datasets/ds-batas-kabkot/geojson');
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('FeatureCollection');
    expect(Array.isArray(res.body.features)).toBe(true);
  });

  it('POST /api/v1/datasets/ds-rawan-gempa/download should reject unauthenticated request for restricted data', async () => {
    const res = await request(app)
      .post('/api/v1/datasets/ds-rawan-gempa/download')
      .send({ format: 'geojson', purpose: 'Riset Skripsi' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('POST /api/v1/auth/login should authenticate demo user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'demo@inageoportal.go.id', password: 'Password123!' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();

    const token = res.body.data.token;

    // Now test downloading restricted dataset with token
    const dlRes = await request(app)
      .post('/api/v1/datasets/ds-rawan-gempa/download')
      .set('Authorization', `Bearer ${token}`)
      .send({ format: 'geojson', purpose: 'Penelitian Mitigasi Sesar Lembang' });

    expect(dlRes.status).toBe(200);
    expect(dlRes.body.success).toBe(true);
    expect(dlRes.body.data.status).toBe('APPROVED');
  });

  // --- Phase 10: Real Geospatial Data Integration Tests ---

  it('Phase 10: ds-batas-kabkot should reflect REAL BIG verified provenance', async () => {
    const res = await request(app).get('/api/v1/datasets/ds-batas-kabkot');
    expect(res.status).toBe(200);
    expect(['REAL', 'REAL_VERIFIED']).toContain(res.body.data.dataSourceStatus);
    expect(res.body.data.verificationStatus).toBe('VERIFIED');
    expect(res.body.data.isDemo).toBe(false);
    expect(res.body.data.sourceAgency).toContain('Badan Informasi Geospasial');
    expect(res.body.data.realFeatureCount).toBe(541);
  });

  it('Phase 10: ds-batas-kabkot/geojson should serve real 541 kabupaten/kota features', async () => {
    const res = await request(app).get('/api/v1/datasets/ds-batas-kabkot/geojson');
    expect(res.status).toBe(200);
    expect(['REAL', 'REAL_VERIFIED']).toContain(res.header['x-data-source']);
    expect(res.header['x-is-demo']).toBe('false');
    expect(res.body.features.length).toBe(541);
    expect(res.body.features[0].properties.NAMOBJ).toBeDefined();
    expect(res.body.features[0].properties.WADMKK).toBeDefined();
    expect(res.body.features[0].properties.KDPKAB).toBeDefined();
  });

  it('Phase 10: ds-jalan-nasional should reflect PENDING_AUTHORIZATION PUPR metadata', async () => {
    const res = await request(app).get('/api/v1/datasets/ds-jalan-nasional');
    expect(res.status).toBe(200);
    expect(res.body.data.dataSourceStatus).toBe('PENDING_AUTHORIZATION');
    expect(['PARTIAL', 'PENDING_AUTHORIZATION']).toContain(res.body.data.verificationStatus);
    expect(res.body.data.isDemo).toBe(true);
    expect(res.body.data.realFeatureCount).toBe(3306);
    expect(res.body.data.disclaimer).toContain('PUSDATIN PUPR');
  });

  it('Phase 10: ds-rawan-gempa should maintain safe FALLBACK status for disaster hazard', async () => {
    const res = await request(app).get('/api/v1/datasets/ds-rawan-gempa');
    expect(res.status).toBe(200);
    expect(res.body.data.dataSourceStatus).toBe('FALLBACK');
    expect(['UNAVAILABLE', 'CONNECTED']).toContain(res.body.data.verificationStatus);
    expect(res.body.data.isDemo).toBe(true);
    expect(res.body.data.disclaimer).toContain('Bukan untuk perancangan teknik sipil');
  });

  it('Phase 10: ds-faskes should serve verified BIG RBI health facilities', async () => {
    const res = await request(app).get('/api/v1/datasets/ds-faskes');
    expect(res.status).toBe(200);
    expect(['REAL', 'REAL_PARTIAL_COVERAGE']).toContain(res.body.data.dataSourceStatus);
    expect(['VERIFIED', 'PARTIAL']).toContain(res.body.data.verificationStatus);
    expect(res.body.data.isDemo).toBe(false);

    const geoRes = await request(app).get('/api/v1/datasets/ds-faskes/geojson');
    expect(geoRes.status).toBe(200);
    expect(['REAL', 'REAL_PARTIAL_COVERAGE']).toContain(geoRes.header['x-data-source']);
    expect(geoRes.body.features.length).toBeGreaterThanOrEqual(100);
    expect(geoRes.body.features[0].properties.NAMA_FASKES).toBeDefined();
  });

  it('Phase 10: ds-tutupan-lahan should serve verified BIG RBI land cover classes', async () => {
    const res = await request(app).get('/api/v1/datasets/ds-tutupan-lahan');
    expect(res.status).toBe(200);
    expect(['REAL', 'REAL_PARTIAL_COVERAGE']).toContain(res.body.data.dataSourceStatus);
    expect(res.body.data.isDemo).toBe(false);

    const geoRes = await request(app).get('/api/v1/datasets/ds-tutupan-lahan/geojson');
    expect(geoRes.status).toBe(200);
    expect(['REAL', 'REAL_PARTIAL_COVERAGE']).toContain(geoRes.header['x-data-source']);
    expect(geoRes.body.features.length).toBeGreaterThan(0);
    expect(geoRes.body.features[0].properties.KLASIFIKASI).toBeDefined();
  });

  // --- Phase 10.9: Data Quality, Coverage, CRS & Boundary Validation Tests ---

  it('Phase 10.9: ds-batas-kabkot distinct administrative codes & Kemendagri reconciliation', async () => {
    const res = await request(app).get('/api/v1/datasets/ds-batas-kabkot/geojson');
    expect(res.status).toBe(200);
    const features = res.body.features;

    // Total features: exactly 541
    expect(features.length).toBe(541);

    const kdpkabSet = new Set<string>();
    const duplicateCodes = new Map<string, number>();
    let unassignedCodeFeatures = 0;

    features.forEach((f: any) => {
      const code = (f.properties?.KDPKAB || '').trim();
      if (!code) {
        unassignedCodeFeatures++;
      } else {
        kdpkabSet.add(code);
        duplicateCodes.set(code, (duplicateCodes.get(code) || 0) + 1);
      }
    });

    // Exactly 514 unique administrative entities matching Kemendagri reference
    expect(kdpkabSet.size).toBe(514);

    // Unassigned outer island segments
    expect(unassignedCodeFeatures).toBe(21);

    // Disjoint archipelago polygon codes (6 codes with 2 features each)
    const dups = Array.from(duplicateCodes.entries()).filter(([_, count]) => count > 1);
    expect(dups.length).toBe(6);
    const duplicateCount = dups.reduce((acc, [_, count]) => acc + (count - 1), 0);
    expect(duplicateCount).toBe(6);

    // Reconciliation formula: 514 unique + 6 disjoint splits + 21 unassigned = 541 total features
    expect(kdpkabSet.size + duplicateCount + unassignedCodeFeatures).toBe(541);
  });

  it('Phase 10.9: ds-batas-kabkot national coverage spans all 38 Indonesian provinces', async () => {
    const res = await request(app).get('/api/v1/datasets/ds-batas-kabkot/geojson');
    expect(res.status).toBe(200);
    const provinces = new Set<string>();

    res.body.features.forEach((f: any) => {
      const prov = (f.properties?.WADMPR || '').trim();
      if (prov) provinces.add(prov);
    });

    expect(provinces.size).toBe(38);
    expect(provinces.has('Daerah Khusus Ibukota Jakarta')).toBe(true);
    expect(provinces.has('Papua Barat Daya')).toBe(true);
    expect(provinces.has('Papua Selatan')).toBe(true);
    expect(provinces.has('Aceh')).toBe(true);
  });

  it('Phase 10.9: ds-faskes verified sample coverage distinguishes hospitals and puskesmas', async () => {
    const res = await request(app).get('/api/v1/datasets/ds-faskes/geojson');
    expect(res.status).toBe(200);
    const features = res.body.features;

    expect(features.length).toBe(102);
    let hospitalCount = 0;
    let puskesmasCount = 0;
    const provinces = new Set<string>();

    features.forEach((f: any) => {
      const tipe = f.properties?.TIPE_FASKES;
      if (tipe === 'Rumah Sakit') hospitalCount++;
      else puskesmasCount++;

      const prov = f.properties?.PROVINSI;
      if (prov) provinces.add(prov);
    });

    expect(hospitalCount).toBe(35);
    expect(puskesmasCount).toBe(67);
    // Verified 4 survey provinces (Bogor/Jabar, Sofifi/Malut, Entikong/Kalbar, Tanjung Kelayang/Babel)
    expect(provinces.size).toBe(4);
    expect(provinces.has('Jawa Barat')).toBe(true);
    expect(provinces.has('Maluku Utara')).toBe(true);
    expect(provinces.has('Kalimantan Barat')).toBe(true);
    expect(provinces.has('Kepulauan Bangka Belitung')).toBe(true);
  });

  it('Phase 10.9: ds-tutupan-lahan GeoJSON pagination handles MaxRecordCount safely', async () => {
    // Request page 1 with limit 50
    const page1Res = await request(app).get('/api/v1/datasets/ds-tutupan-lahan/geojson?page=1&limit=50');
    expect(page1Res.status).toBe(200);
    expect(page1Res.body.features.length).toBe(50);
    expect(page1Res.body.pagination).toBeDefined();
    expect(page1Res.body.pagination.page).toBe(1);
    expect(page1Res.body.pagination.limit).toBe(50);
    expect(page1Res.body.pagination.total).toBe(200);
    expect(page1Res.body.pagination.totalPages).toBe(4);
    expect(page1Res.body.pagination.hasMore).toBe(true);
    expect(page1Res.header['x-page']).toBe('1');
    expect(page1Res.header['x-total-pages']).toBe('4');

    // Request page 2 with limit 50
    const page2Res = await request(app).get('/api/v1/datasets/ds-tutupan-lahan/geojson?page=2&limit=50');
    expect(page2Res.status).toBe(200);
    expect(page2Res.body.features.length).toBe(50);
    expect(page2Res.body.pagination.page).toBe(2);
    // Features in page 2 differ from page 1
    expect(page2Res.body.features[0].id).not.toBe(page1Res.body.features[0].id);
  });

  it('Phase 10.9: CRS and geometry validity for all real vector fixtures', async () => {
    const endpoints = [
      '/api/v1/datasets/ds-batas-kabkot/geojson',
      '/api/v1/datasets/ds-faskes/geojson',
      '/api/v1/datasets/ds-tutupan-lahan/geojson',
    ];

    for (const ep of endpoints) {
      const res = await request(app).get(ep);
      expect(res.status).toBe(200);
      expect(res.body.type).toBe('FeatureCollection');
      expect(res.body.crs?.properties?.name).toContain('CRS84');

      // Geometry validity check
      res.body.features.forEach((f: any) => {
        expect(f.geometry).toBeDefined();
        expect(f.geometry.coordinates).toBeDefined();
        if (f.geometry.type === 'Point') {
          const [lng, lat] = f.geometry.coordinates;
          expect(typeof lng).toBe('number');
          expect(typeof lat).toBe('number');
          expect(lng).toBeGreaterThanOrEqual(95.0);
          expect(lng).toBeLessThanOrEqual(142.0);
          expect(lat).toBeGreaterThanOrEqual(-12.0);
          expect(lat).toBeLessThanOrEqual(7.0);
        } else if (f.geometry.type === 'Polygon') {
          const outerRing = f.geometry.coordinates[0];
          expect(outerRing.length).toBeGreaterThanOrEqual(4);
          const first = outerRing[0];
          const last = outerRing[outerRing.length - 1];
          // Polygon closed ring
          expect(first[0]).toBe(last[0]);
          expect(first[1]).toBe(last[1]);
        }
      });
    }
  });

  it('Phase 10.9: Conceptual separation of ds-rbi basemap and live status probe', async () => {
    const res = await request(app).get('/api/v1/datasets/ds-rbi');
    expect(res.status).toBe(200);
    expect(res.body.data.sourceDatasetTitle).toContain('Basemap Rupabumi Indonesia');
    expect(res.body.data.serviceUrl).toContain('geoservices.big.go.id/rbi/rest/services/BASEMAP/Rupabumi_Indonesia/MapServer');
    expect(res.body.data.wmsUrl).not.toContain('piksel.big.go.id');
    expect(res.body.data.disclaimer).toContain('Terpisah secara mandiri dari citra penginderaan jauh Sentinel-2 L2A');
  });

  it('Phase 10.9: Graceful fallback toggle via preferDemo query parameter', async () => {
    const realRes = await request(app).get('/api/v1/datasets/ds-batas-kabkot/geojson');
    expect(realRes.status).toBe(200);
    expect(realRes.header['x-is-demo']).toBe('false');

    const demoRes = await request(app).get('/api/v1/datasets/ds-batas-kabkot/geojson?demo=true');
    expect(demoRes.status).toBe(200);
    expect(demoRes.header['x-is-demo']).toBe('true');
  });

  // --- Phase 10.10: Coverage Expansion, Live Service Completion & Spatial Queries ---

  it('Phase 10.10: PUPR authorization adapter handling without security bypass', async () => {
    // 1. Adapter call without credentials safely mandates authorization
    const adapterRes = await realGeospatialService.fetchPuprLiveJalanNasional();
    expect(adapterRes.success).toBe(false);
    expect(adapterRes.status).toBe('PENDING_AUTHORIZATION');
    expect(adapterRes.authRequired).toBe(true);
    expect(adapterRes.message).toContain('PUSDATIN PUPR');

    // 2. Health check endpoint reports token required and documentation reference
    const statusRes = await request(app).get('/api/v1/datasets/ds-jalan-nasional/live-status');
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.details.authStatus).toBe('TOKEN_REQUIRED');
    expect(statusRes.body.data.details.accessRequestDoc).toBe('docs/PUPR_ACCESS_REQUEST.md');
    expect(statusRes.body.data.details.requestPortal).toContain('sigi.pu.go.id');
  }, 15000);

  it('Phase 10.10: BNPB InaRISK 7 fault layers discovery & civil engineering disclaimer', async () => {
    const bnpbDiscovery = await realGeospatialService.fetchBnpbFaultLayers();
    expect(bnpbDiscovery.layers.length).toBe(7);
    expect(bnpbDiscovery.status).toBe('FALLBACK');
    expect(bnpbDiscovery.disclaimer).toContain('SNI Gempa 1726');

    const layerNames = bnpbDiscovery.layers.map((l) => l.name);
    expect(layerNames).toContain('Megathrust');
    expect(layerNames).toContain('Java_Fault');
    expect(layerNames).toContain('Kalimantan_Fault');
    expect(layerNames).toContain('N_Maluku_Fault');
    expect(layerNames).toContain('NT_Banda_Fault');
    expect(layerNames).toContain('Sulawesi_Fault');
    expect(layerNames).toContain('Sumatera_Fault');

    // Live status probe includes fault layers metadata
    const liveProbe = await request(app).get('/api/v1/datasets/ds-rawan-gempa/live-status');
    expect(liveProbe.status).toBe(200);
    expect(liveProbe.body.data.details.faultLayers).toBeDefined();
    expect(liveProbe.body.data.details.faultLayers.length).toBe(7);
    expect(String(liveProbe.body.data.details.legalDisclaimer).toLowerCase()).toContain('perancangan teknik sipil');
  }, 15000);

  it('Phase 10.10: Spatial Bounding Box (BBOX) filtering query on GeoJSON', async () => {
    // Query tutupan lahan with specific bounding box covering Belitung area (107.8 to 108.0 E, -2.8 to -2.7 S)
    const bboxRes = await request(app).get(
      '/api/v1/datasets/ds-tutupan-lahan/geojson?bbox=107.8,-2.8,108.0,-2.7&page=1&limit=25'
    );
    expect(bboxRes.status).toBe(200);
    expect(bboxRes.header['x-filter-bbox']).toBe('107.8,-2.8,108,-2.7');
    expect(bboxRes.body.type).toBe('FeatureCollection');
    expect(bboxRes.body.features.length).toBeGreaterThan(0);
    expect(bboxRes.body.features.length).toBeLessThanOrEqual(25);

    // Verify all returned features are inside or intersect the requested bbox
    bboxRes.body.features.forEach((f: any) => {
      const ring = f.geometry.coordinates[0];
      const hasPointInBbox = ring.some(
        ([x, y]: [number, number]) => x >= 107.7 && x <= 108.1 && y >= -2.9 && y <= -2.6
      );
      expect(hasPointInBbox).toBe(true);
    });
  });

  it('Phase 10.10: Duplicate OBJECTID prevention & attribute preservation', async () => {
    const res = await request(app).get('/api/v1/datasets/ds-tutupan-lahan/geojson');
    expect(res.status).toBe(200);

    const objectIds = new Set<number>();
    let duplicateIdFound = false;

    res.body.features.forEach((f: any) => {
      const id = f.properties?.OBJECTID;
      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThan(0);
      if (objectIds.has(id)) {
        duplicateIdFound = true;
      }
      objectIds.add(id);

      // Verify FTYPE code is preserved
      expect(f.properties.FTYPE).toBeDefined();
      expect(f.properties.STATUS_DATA).toBe('REAL_PARTIAL_COVERAGE');
    });

    expect(duplicateIdFound).toBe(false);
    expect(objectIds.size).toBe(res.body.features.length);
  });

  it('Phase 10.10: Health facility coverage metadata & zero personal data verification', async () => {
    const res = await request(app).get('/api/v1/datasets/ds-faskes/geojson');
    expect(res.status).toBe(200);

    res.body.features.forEach((f: any) => {
      // Must NOT contain personal health data
      expect(f.properties.PASIEN).toBeUndefined();
      expect(f.properties.NIK).toBeUndefined();
      expect(f.properties.REKAM_MEDIS).toBeUndefined();

      // Must contain verified public facility identification
      expect(f.properties.NAMOBJ).toBeDefined();
      expect(f.properties.TIPE_FASKES).toBeDefined();
      expect(['Rumah Sakit', 'Puskesmas']).toContain(f.properties.TIPE_FASKES);
      expect(f.properties.PROVINSI).toBeDefined();
      expect(f.properties.KAB_KOTA).toBeDefined();
      expect(f.properties.CAKUPAN).toContain('PARSIAL');
    });
  });

  // --- Phase 12: Google Authentication & Public Document Download System ---

  describe('Phase 12: Google Authentication System', () => {
    let googleUserToken: string;
    let googleUserId: string;
    const testSub = `user-${Date.now()}`;

    beforeAll(async () => {
      // Clean up previous test users to ensure clean idempotency
      await prisma.user.deleteMany({
        where: { email: { contains: 'geoportal-test.id' } },
      });
    });

    it('POST /api/v1/auth/google should auto-register a new Google user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ credential: `mock-google-token-${testSub}` });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(`google.${testSub}@geoportal-test.id`);
      expect(res.body.data.user.provider).toBe('google');
      expect(res.body.data.user.emailVerified).toBe(true);
      expect(res.body.data.user.avatarUrl).toContain('mock-new-avatar');

      googleUserToken = res.body.data.token;
      googleUserId = res.body.data.user.id;
    });

    it('POST /api/v1/auth/google should handle existing Google user login and refresh profile', async () => {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ credential: `mock-google-token-${testSub}` });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.id).toBe(googleUserId);
    });

    it('POST /api/v1/auth/google should reject unverified email from Google', async () => {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ credential: 'mock-google-token-unverified' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('GOOGLE_AUTH_FAILED');
      expect(res.body.error.message).toContain('belum diverifikasi');
    });

    it('POST /api/v1/auth/google should reject expired Google token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ credential: 'mock-google-token-expired' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('GOOGLE_AUTH_FAILED');
      expect(res.body.error.message).toContain('kedaluwarsa');
    });

    it('POST /api/v1/auth/google should reject invalid Google token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ credential: 'mock-google-token-invalid' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('GOOGLE_AUTH_FAILED');
    });

    it('POST /api/v1/auth/google should reject empty request payload with 422', async () => {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({});

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('GET /api/v1/auth/me should return verified Google user profile with avatar and provider', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${googleUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.provider).toBe('google');
      expect(res.body.data.avatarUrl).toContain('mock-new-avatar');
      expect(res.body.data.emailVerified).toBe(true);
      expect(res.body.data.googleId).toBe(`google-sub-${testSub}`);
    });
  });

  describe('Phase 12: Public Document Access & Authenticated Download', () => {
    let authUserToken: string;
    let authUser2Token: string;

    beforeAll(async () => {
      // User 1
      const res1 = await request(app)
        .post('/api/v1/auth/google')
        .send({ credential: 'mock-google-token-downloader1' });
      authUserToken = res1.body.data.token;

      // User 2 (for isolation test)
      const res2 = await request(app)
        .post('/api/v1/auth/google')
        .send({ credential: 'mock-google-token-downloader2' });
      authUser2Token = res2.body.data.token;
    });

    it('GET /api/v1/documents should allow anonymous public access for viewing metadata', async () => {
      const res = await request(app).get('/api/v1/documents');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Verify structure and physical availability indicator
      const doc1 = res.body.data[0];
      expect(doc1.id).toBeDefined();
      expect(doc1.code).toBeDefined();
      expect(doc1.title).toBeDefined();
      expect(typeof doc1.isAvailableForDownload).toBe('boolean');
      expect(doc1.statusMessage).toBeDefined();
    });

    it('GET /api/v1/documents/:id should allow anonymous public access to document detail', async () => {
      const res = await request(app).get('/api/v1/documents/sdg-01');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('SDG-01/BIG/2024');
      expect(res.body.data.pages).toBe(48);
    });

    it('GET /api/v1/documents/:id/download should reject unauthenticated anonymous download with 401', async () => {
      const res = await request(app).get('/api/v1/documents/sdg-01/download');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });

    it('GET /api/v1/documents/:id/download should return 404 with proper status if physical file is not available', async () => {
      const res = await request(app)
        .get('/api/v1/documents/sdg-01/download')
        .set('Authorization', `Bearer ${authUserToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FILE_NOT_FOUND');
      expect(res.body.error.message).toContain('Dokumen belum tersedia untuk diunduh');
    });

    it('POST /api/v1/datasets/ds-batas-kabkot/download should reject anonymous request with 401', async () => {
      const res = await request(app)
        .post('/api/v1/datasets/ds-batas-kabkot/download')
        .send({ format: 'geojson', purpose: 'Penelitian Publik' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });

    it('GET /api/v1/datasets/ds-batas-kabkot/download-file should reject direct anonymous download with 401', async () => {
      const res = await request(app).get('/api/v1/datasets/ds-batas-kabkot/download-file?format=geojson');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });

    it('POST /api/v1/datasets/ds-batas-kabkot/download should allow authenticated user and provide download URL', async () => {
      const res = await request(app)
        .post('/api/v1/datasets/ds-batas-kabkot/download')
        .set('Authorization', `Bearer ${authUserToken}`)
        .send({ format: 'geojson', purpose: 'Riset Pemetaan Batas' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.downloadUrl).toBeDefined();
      expect(res.body.data.downloadUrl).toContain('token=');
    });

    it('GET /api/v1/datasets/ds-batas-kabkot/download-file should serve real file for authenticated request', async () => {
      const res = await request(app)
        .get('/api/v1/datasets/ds-batas-kabkot/download-file?format=geojson')
        .set('Authorization', `Bearer ${authUserToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-disposition']).toContain('attachment; filename="ds-batas-kabkot_real.geojson"');
      expect(res.header['x-data-source']).toBe('REAL');
      expect(res.body.type).toBe('FeatureCollection');
      expect(Array.isArray(res.body.features)).toBe(true);
    });

    it('GET /api/v1/datasets/ds-batas-kabkot/download-file should also authenticate via query token', async () => {
      const res = await request(app).get(
        `/api/v1/datasets/ds-batas-kabkot/download-file?format=geojson&token=${authUserToken}`
      );

      expect(res.status).toBe(200);
      expect(res.header['content-disposition']).toContain('attachment; filename="ds-batas-kabkot_real.geojson"');
      expect(res.body.type).toBe('FeatureCollection');
    });

    it('GET /api/v1/datasets/ds-nonexistent/download-file should return 404 for invalid dataset', async () => {
      const res = await request(app)
        .get('/api/v1/datasets/ds-nonexistent/download-file')
        .set('Authorization', `Bearer ${authUserToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('Download History Isolation: User 1 sees their download, User 2 does not see User 1 downloads', async () => {
      const user1Res = await request(app)
        .get('/api/v1/user/downloads')
        .set('Authorization', `Bearer ${authUserToken}`);

      expect(user1Res.status).toBe(200);
      expect(user1Res.body.success).toBe(true);
      expect(user1Res.body.data.length).toBeGreaterThan(0);

      // Verify User 2 has isolated download history
      const user2Res = await request(app)
        .get('/api/v1/user/downloads')
        .set('Authorization', `Bearer ${authUser2Token}`);

      expect(user2Res.status).toBe(200);
      expect(user2Res.body.success).toBe(true);
      expect(user2Res.body.data.length).toBe(0);
    });
  });
});
