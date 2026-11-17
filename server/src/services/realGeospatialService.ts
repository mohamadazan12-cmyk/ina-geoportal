import https from 'https';
import http from 'http';
import { getStorageDriver, geojsonKey, resetStorageDrivers } from './storage';

export type DataSourceStatus =
  | 'REAL_VERIFIED'
  | 'REAL_PARTIAL_COVERAGE'
  | 'REAL'
  | 'DEMO'
  | 'FALLBACK'
  | 'PENDING_AUTHORIZATION'
  | 'UNAVAILABLE';

export interface GeospatialDataResult {
  data: any;
  dataSourceStatus: DataSourceStatus;
  isDemo: boolean;
  featureCount: number;
  totalCount?: number;
  sourceAgency: string;
  sourceFile: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface LiveStatusResult {
  id: string;
  serviceUrl: string;
  statusCode: number | null;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'PENDING_AUTHORIZATION';
  responseTimeMs: number;
  recordsOnline?: number | null;
  lastUpdateOnline?: string | null;
  details?: Record<string, any>;
}

// Map dataset ID to primary real file and fallback demo file
const REAL_GEOJSON_MAP: Record<
  string,
  {
    real?: string;
    demo: string;
    agency: string;
    realStatus: DataSourceStatus;
    fallbackStatus: DataSourceStatus;
    totalSourceRecords?: number;
  }
> = {
  'ds-batas-kabkot': {
    real: 'real_batas_kabupaten.json',
    demo: 'batas_kabupaten.json',
    agency: 'Badan Informasi Geospasial (BIG)',
    realStatus: 'REAL_VERIFIED',
    fallbackStatus: 'FALLBACK',
    totalSourceRecords: 541,
  },
  'ds-jalan-nasional': {
    demo: 'jalan_nasional.json',
    agency: 'Kementerian Pekerjaan Umum dan Perumahan Rakyat (PUPR)',
    realStatus: 'PENDING_AUTHORIZATION',
    fallbackStatus: 'PENDING_AUTHORIZATION',
    totalSourceRecords: 3306,
  },
  'ds-rawan-gempa': {
    demo: 'rawan_bencana_gempa.json',
    agency: 'Badan Nasional Penanggulangan Bencana (BNPB)',
    realStatus: 'FALLBACK',
    fallbackStatus: 'FALLBACK',
  },
  'ds-tutupan-lahan': {
    real: 'real_tutupan_lahan.json',
    demo: 'tutupan_lahan.json',
    agency: 'Badan Informasi Geospasial (BIG)',
    realStatus: 'REAL_PARTIAL_COVERAGE',
    fallbackStatus: 'FALLBACK',
    totalSourceRecords: 97002,
  },
  'ds-faskes': {
    real: 'real_fasilitas_kesehatan.json',
    demo: 'fasilitas_kesehatan.json',
    agency: 'Badan Informasi Geospasial (BIG)',
    realStatus: 'REAL_PARTIAL_COVERAGE',
    fallbackStatus: 'FALLBACK',
    totalSourceRecords: 102,
  },
  'ds-rbi': {
    demo: 'rupa_bumi_indonesia.json',
    agency: 'Badan Informasi Geospasial (BIG)',
    realStatus: 'REAL_PARTIAL_COVERAGE',
    fallbackStatus: 'FALLBACK',
    totalSourceRecords: 890,
  },
};

const LIVE_ENDPOINTS: Record<string, { url: string; authRequired?: boolean }> = {
  'ds-batas-kabkot': {
    url: 'https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_KABKOTA_AR/MapServer/0?f=json',
  },
  'ds-jalan-nasional': {
    url: 'https://sigi.pu.go.id/geoapi/api/v1/dataset-meta/jalan_nasional',
    authRequired: true,
  },
  'ds-rawan-gempa': {
    url: 'https://gis.bnpb.go.id/server/rest/services/inarisk/Faults/MapServer?f=json',
  },
  'ds-tutupan-lahan': {
    url: 'https://geoservices.big.go.id/rbi/rest/services/BASEMAP/Rupabumi_Indonesia/MapServer/226?f=json',
  },
  'ds-faskes': {
    url: 'https://geoservices.big.go.id/rbi/rest/services/BASEMAP/Rupabumi_Indonesia/MapServer/102?f=json',
  },
  'ds-rbi': {
    url: 'https://geoservices.big.go.id/rbi/rest/services/BASEMAP/Rupabumi_Indonesia/MapServer?f=json',
  },
};

function featureIntersectsBbox(feature: any, bbox: [number, number, number, number]): boolean {
  if (!feature?.geometry?.coordinates) return true;
  const [minX, minY, maxX, maxY] = bbox;
  const coords = feature.geometry.coordinates;

  const checkPoint = (pt: [number, number]) => {
    return pt[0] >= minX && pt[0] <= maxX && pt[1] >= minY && pt[1] <= maxY;
  };

  if (feature.geometry.type === 'Point') {
    return checkPoint(coords);
  }

  if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiPoint') {
    return coords.some(checkPoint);
  }

  if (feature.geometry.type === 'Polygon') {
    return coords[0].some(checkPoint);
  }

  if (feature.geometry.type === 'MultiPolygon' || feature.geometry.type === 'MultiLineString') {
    return coords.some((ring: any[]) => ring.some(checkPoint));
  }

  return true;
}

/**
 * Helper to read a GeoJSON fixture via the storage abstraction.
 */
async function readGeojsonFixture(fileName: string): Promise<any> {
  const driver = getStorageDriver('public');
  const key = geojsonKey(fileName);

  if (!(await driver.exists(key))) {
    throw new Error(`Berkas data fisik '${fileName}' tidak ditemukan.`);
  }
  return driver.readText(key);
}

/**
 * Load GeoJSON data prioritizing verified real data with graceful fallback,
 * bbox filtering and pagination support.
 */
export async function getDatasetGeoJSON(
  datasetId: string,
  preferDemo: boolean = false,
  page?: number,
  limit?: number,
  bbox?: [number, number, number, number]
): Promise<GeospatialDataResult> {
  const config = REAL_GEOJSON_MAP[datasetId];
  if (!config) {
    throw new Error(`Dataset '${datasetId}' tidak memiliki konfigurasi data geospasial.`);
  }

  let loadedData: any = null;
  let isDemo = false;
  let sourceFile = '';
  let status: DataSourceStatus = config.realStatus;

  // 1. If not preferDemo and real file exists, serve real data
  if (!preferDemo && config.real) {
    try {
      const text = await readGeojsonFixture(config.real);
      loadedData = JSON.parse(text);
      isDemo = false;
      sourceFile = config.real;
      status = config.realStatus;
    } catch {
      // If parse fails or file missing, fall through to fallback demo
    }
  }

  // 2. Serve demo / fallback fixture
  if (!loadedData) {
    const text = await readGeojsonFixture(config.demo);
    loadedData = JSON.parse(text);
    isDemo = true;
    sourceFile = config.demo;
    status = config.fallbackStatus;
  }

  let allFeatures = Array.isArray(loadedData.features) ? loadedData.features : [];

  // Apply bounding box filter if provided
  if (bbox && bbox.length === 4) {
    allFeatures = allFeatures.filter((f: any) => featureIntersectsBbox(f, bbox));
  }

  const totalCount = allFeatures.length;

  // 3. Handle GeoJSON pagination when requested
  if (page !== undefined && limit !== undefined && limit > 0) {
    const p = Math.max(1, page);
    const l = Math.max(1, limit);
    const start = (p - 1) * l;
    const paginatedFeatures = allFeatures.slice(start, start + l);
    const totalPages = Math.ceil(totalCount / l);

    const paginatedData = {
      ...loadedData,
      pagination: {
        page: p,
        limit: l,
        total: totalCount,
        totalPages,
        hasMore: start + l < totalCount,
      },
      features: paginatedFeatures,
    };

    return {
      data: paginatedData,
      dataSourceStatus: status,
      isDemo,
      featureCount: paginatedFeatures.length,
      totalCount,
      sourceAgency: config.agency,
      sourceFile,
      pagination: paginatedData.pagination,
    };
  }

  const filteredData = {
    ...loadedData,
    features: allFeatures,
  };

  return {
    data: filteredData,
    dataSourceStatus: status,
    isDemo,
    featureCount: totalCount,
    totalCount,
    sourceAgency: config.agency,
    sourceFile,
  };
}

/**
 * Get download stream info for a dataset (private store).
 */
export async function getDownloadFilePath(
  datasetId: string,
  preferReal: boolean = true
): Promise<{ key: string; fileName: string; isReal: boolean }> {
  const config = REAL_GEOJSON_MAP[datasetId];
  if (!config) {
    throw new Error(`File untuk dataset '${datasetId}' belum terdaftar.`);
  }

  const driver = getStorageDriver('private');

  if (preferReal && config.real) {
    const realKey = geojsonKey(config.real);
    if (await driver.exists(realKey)) {
      return { key: realKey, fileName: config.real, isReal: true };
    }
  }

  const demoKey = geojsonKey(config.demo);
  if (!(await driver.exists(demoKey))) {
    throw new Error(`Berkas data fisik '${config.demo}' tidak ditemukan.`);
  }

  return { key: demoKey, fileName: config.demo, isReal: false };
}

/**
 * Live probe to upstream government service (unchanged).
 */
export async function probeLiveStatus(datasetId: string): Promise<LiveStatusResult> {
  const target = LIVE_ENDPOINTS[datasetId];
  if (!target) {
    return {
      id: datasetId,
      serviceUrl: '',
      statusCode: null,
      status: 'OFFLINE',
      responseTimeMs: 0,
    };
  }

  const startTime = Date.now();
  return new Promise((resolve) => {
    try {
      const u = new URL(target.url);
      const mod = u.protocol === 'https:' ? https : http;
      const req = mod.get(
        target.url,
        {
          timeout: 5000,
          rejectUnauthorized: false,
          headers: {
            'User-Agent': 'InaGeoportal-v2-HealthProbe/2.0',
            Accept: 'application/json,text/html,*/*',
          },
        },
        (res) => {
          let body = '';
          res.on('data', (c) => {
            if (body.length < 2000) body += c;
          });
          res.on('end', () => {
            const duration = Date.now() - startTime;
            const isOk = res.statusCode && res.statusCode >= 200 && res.statusCode < 400;

            let parsedDetails: Record<string, any> = {};
            let recordsOnline: number | null = null;
            let lastUpdateOnline: string | null = null;

            try {
              const json = JSON.parse(body);
              if (json.records !== undefined) recordsOnline = json.records;
              if (json.last_update) lastUpdateOnline = json.last_update;
              if (json.name) parsedDetails.layerName = json.name;
              if (json.mapName) parsedDetails.mapName = json.mapName;
              if (Array.isArray(json.layers)) {
                parsedDetails.layersCount = json.layers.length;
                if (!recordsOnline && json.layers.length > 0) recordsOnline = json.layers.length;
              }
              if (json.unor) parsedDetails.unor = json.unor;
            } catch {
              // non-JSON response (e.g. WMS XML or HTML)
            }

            resolve({
              id: datasetId,
              serviceUrl: target.url,
              statusCode: res.statusCode ?? null,
              status: isOk ? 'ONLINE' : res.statusCode && res.statusCode >= 500 ? 'DEGRADED' : 'OFFLINE',
              responseTimeMs: duration,
              recordsOnline,
              lastUpdateOnline,
              details: enrichDatasetTelemetry(datasetId, parsedDetails),
            });
          });
        }
      );

      req.on('error', () => {
        resolve({
          id: datasetId,
          serviceUrl: target.url,
          statusCode: null,
          status: target.authRequired ? 'PENDING_AUTHORIZATION' : 'OFFLINE',
          responseTimeMs: Date.now() - startTime,
          details: enrichDatasetTelemetry(datasetId, {}),
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          id: datasetId,
          serviceUrl: target.url,
          statusCode: 408,
          status: target.authRequired ? 'PENDING_AUTHORIZATION' : 'OFFLINE',
          responseTimeMs: 5000,
          details: enrichDatasetTelemetry(datasetId, {}),
        });
      });
    } catch (err: any) {
      resolve({
        id: datasetId,
        serviceUrl: target.url,
        statusCode: null,
        status: target.authRequired ? 'PENDING_AUTHORIZATION' : 'OFFLINE',
        responseTimeMs: Date.now() - startTime,
        details: enrichDatasetTelemetry(datasetId, { error: err?.message }),
      });
    }
  });
}

/**
 * Enrich live-status details with dataset-specific upstream telemetry and
 * provenance metadata (Phase 10.10 behaviour, preserved).
 */
function enrichDatasetTelemetry(datasetId: string, details: Record<string, any>): Record<string, any> {
  const enriched: Record<string, any> = { ...details };

  if (datasetId === 'ds-jalan-nasional') {
    enriched.authStatus = 'TOKEN_REQUIRED';
    enriched.accessRequestDoc = 'docs/PUPR_ACCESS_REQUEST.md';
    enriched.requestPortal = 'https://sigi.pu.go.id/geoapi/';
    enriched.vectorEndpoint = 'https://sigi.pu.go.id/geoapi/api/v1/jalan_nasional';
  } else if (datasetId === 'ds-rawan-gempa') {
    enriched.mapServerExportUrl =
      'https://gis.bnpb.go.id/server/rest/services/inarisk/Faults/MapServer/export';
    enriched.faultLayers = [
      { id: 0, name: 'Megathrust', geometryType: 'Polygon', featuresCount: 15 },
      { id: 1, name: 'Java_Fault', geometryType: 'Polyline', featuresCount: 35 },
      { id: 2, name: 'Kalimantan_Fault', geometryType: 'Polyline' },
      { id: 3, name: 'N_Maluku_Fault', geometryType: 'Polyline' },
      { id: 4, name: 'NT_Banda_Fault', geometryType: 'Polyline' },
      { id: 5, name: 'Sulawesi_Fault', geometryType: 'Polyline' },
      { id: 6, name: 'Sumatera_Fault', geometryType: 'Polyline' },
    ];
    enriched.legalDisclaimer =
      'Bukan untuk perancangan teknik sipil atau kekuatan struktur bangunan (SNI Gempa 1726).';
  } else if (datasetId === 'ds-tutupan-lahan') {
    enriched.totalSourceRecords = 97002;
    enriched.maxRecordCount = 1000;
  } else if (datasetId === 'ds-rbi') {
    enriched.totalCartographicLayers = 890;
    enriched.satelliteWmsUrl = 'https://ows.piksel.big.go.id/wms';
  }

  return enriched;
}

/**
 * Adapter for the PUPR national-roads live stream.
 * Never bypasses authorization: without credentials it reports
 * PENDING_AUTHORIZATION so the UI can show the access-request path.
 */
export async function fetchPuprLiveJalanNasional(
  email?: string,
  token?: string
): Promise<{
  success: boolean;
  data?: any;
  status: string;
  message: string;
  authRequired: boolean;
}> {
  const activeEmail = email || process.env.PUPR_GEOAPI_EMAIL;
  const activeToken = token || process.env.PUPR_GEOAPI_TOKEN;

  if (!activeEmail || !activeToken) {
    return {
      success: false,
      status: 'PENDING_AUTHORIZATION',
      message:
        'Kredensial email dan token PUSDATIN PUPR belum dikonfigurasi. Menggunakan fallback koridor primer.',
      authRequired: true,
    };
  }

  return new Promise((resolve) => {
    const url =
      'https://sigi.pu.go.id/geoapi/api/v1/jalan_nasional' +
      `?email=${encodeURIComponent(activeEmail)}&token=${encodeURIComponent(activeToken)}&format=geojson`;

    https
      .get(url, { timeout: 6000, rejectUnauthorized: false }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const geojson = JSON.parse(body);
              resolve({
                success: true,
                data: geojson,
                status: 'REAL',
                message: 'Data vektor jalan nasional live berhasil diunduh dari SIGI PUPR.',
                authRequired: false,
              });
              return;
            } catch {
              // fall through to authorization notice
            }
          }
          resolve({
            success: false,
            status: 'PENDING_AUTHORIZATION',
            message: `Autentikasi PUPR gagal (HTTP ${res.statusCode}). Menggunakan fallback koridor primer.`,
            authRequired: true,
          });
        });
      })
      .on('error', (err) => {
        resolve({
          success: false,
          status: 'PENDING_AUTHORIZATION',
          message: `Koneksi SIGI PUPR terganggu: ${err.message}. Menggunakan fallback koridor primer.`,
          authRequired: true,
        });
      });
  });
}

/** Discover the 7 BNPB InaRISK fault sublayers (static, verified list). */
export async function fetchBnpbFaultLayers(): Promise<{
  mapServerUrl: string;
  layers: Array<{ id: number; name: string; geometryType: string; isFault: boolean }>;
  disclaimer: string;
  status: string;
}> {
  return {
    mapServerUrl: 'https://gis.bnpb.go.id/server/rest/services/inarisk/Faults/MapServer',
    layers: [
      { id: 0, name: 'Megathrust', geometryType: 'Polygon', isFault: true },
      { id: 1, name: 'Java_Fault', geometryType: 'Polyline', isFault: true },
      { id: 2, name: 'Kalimantan_Fault', geometryType: 'Polyline', isFault: true },
      { id: 3, name: 'N_Maluku_Fault', geometryType: 'Polyline', isFault: true },
      { id: 4, name: 'NT_Banda_Fault', geometryType: 'Polyline', isFault: true },
      { id: 5, name: 'Sulawesi_Fault', geometryType: 'Polyline', isFault: true },
      { id: 6, name: 'Sumatera_Fault', geometryType: 'Polyline', isFault: true },
    ],
    disclaimer:
      'Bukan untuk perancangan teknik sipil atau perhitungan kekuatan struktur bangunan (SNI Gempa 1726).',
    status: 'FALLBACK',
  };
}

/** Proxy query to BIG Rupabumi Layer 226 with local bbox fallback. */
export async function fetchUpstreamLandCoverBbox(
  bbox: [number, number, number, number],
  limit: number = 50
): Promise<{ success: boolean; data: any; count: number; source: string }> {
  const [minX, minY, maxX, maxY] = bbox;
  const url =
    'https://geoservices.big.go.id/rbi/rest/services/BASEMAP/Rupabumi_Indonesia/MapServer/226/query' +
    `?where=OBJECTID>0&geometry=${minX},${minY},${maxX},${maxY}` +
    '&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects' +
    `&outFields=*&returnGeometry=true&outSR=4326&resultRecordCount=${limit}&f=geojson`;

  const localFallback = async () => {
    const local = await getDatasetGeoJSON('ds-tutupan-lahan', false, 1, limit, bbox);
    return {
      success: false,
      data: local.data,
      count: local.featureCount,
      source: 'LOCAL_SAMPLE_FALLBACK',
    };
  };

  return new Promise((resolve) => {
    https
      .get(url, { timeout: 6000, rejectUnauthorized: false }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', async () => {
          if (res.statusCode === 200) {
            try {
              const geojson = JSON.parse(body);
              if (geojson && Array.isArray(geojson.features)) {
                resolve({
                  success: true,
                  data: geojson,
                  count: geojson.features.length,
                  source: 'BIG_RBI_LAYER_226_LIVE',
                });
                return;
              }
            } catch {
              // fall through
            }
          }
          resolve(await localFallback());
        });
      })
      .on('error', async () => {
        resolve(await localFallback());
      });
  });
}

/**
 * Backwards-compatible object API.
 *
 * Existing controllers call `realGeospatialService.getDatasetGeoJSON(...)`;
 * these are now async (storage may be remote), so call sites must await.
 */
export const realGeospatialService = {
  getDatasetGeoJSON,
  getDownloadFilePath,
  probeLiveStatus,
  fetchPuprLiveJalanNasional,
  fetchBnpbFaultLayers,
  fetchUpstreamLandCoverBbox,
};

/** Reset cached storage drivers — used by tests. */
export { resetStorageDrivers };