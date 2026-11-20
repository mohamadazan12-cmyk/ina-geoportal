import https from 'https';
import { AdapterQueryResult, QueryOptions } from './types';
import { getStorageDriver, geojsonKey } from '../storage';

import path from 'path';
import fs from 'fs';

const UPSTREAM_KRB_GEMPA =
  'https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/SUMBER_DAYA_ALAM_DAN_LINGKUNGAN/MapServer/12';

let cacheGempa: { data: any; timestamp: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000;

export async function fetchFullKrbGempa(options: QueryOptions = {}): Promise<AdapterQueryResult> {
  const { page = 1, limit = 50, bbox } = options;
  const driver = getStorageDriver('public');
  
  // Read manifest
  const manifestText = await driver.readText(geojsonKey('gempa_manifest.json'));
  const manifest = JSON.parse(manifestText);
  const total = manifest.totalFeatures; // 11439
  const p = Math.max(1, page);
  const l = Math.max(1, limit);
  const startIndex = (p - 1) * l;
  const endIndex = startIndex + l;

  // Determine which chunks to read
  const chunksDir = path.join(__dirname, '..', '..', 'fixtures', 'geojson', 'chunks_gempa');
  const matchedChunks = manifest.chunks.filter((c: any) => {
    const chunkStart = c.offset;
    const chunkEnd = c.offset + c.count;
    return chunkStart < endIndex && chunkEnd > startIndex;
  });

  let loadedFeatures: any[] = [];
  for (const c of matchedChunks) {
    const chunkFile = path.join(chunksDir, c.file);
    if (fs.existsSync(chunkFile)) {
      const raw = fs.readFileSync(chunkFile, 'utf8');
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : (parsed.features || []);
      loadedFeatures.push(...list);
    }
  }

  // Slice exactly for pagination
  const offsetWithinMatched = startIndex - (matchedChunks[0]?.offset || 0);
  let paged = loadedFeatures.slice(Math.max(0, offsetWithinMatched), Math.max(0, offsetWithinMatched) + l);

  if (bbox) {
    const [minX, minY, maxX, maxY] = bbox;
    paged = paged.filter((f: any) => {
      if (!f.geometry || !f.geometry.coordinates) return true;
      const ring = f.geometry.coordinates[0];
      if (Array.isArray(ring)) {
        return ring.some(
          (pt: any) =>
            Array.isArray(pt) &&
            pt[0] >= minX &&
            pt[0] <= maxX &&
            pt[1] >= minY &&
            pt[1] <= maxY
        );
      }
      return true;
    });
  }

  return {
    success: true,
    data: {
      type: 'FeatureCollection',
      features: paged,
      manifest: {
        totalFeatures: total,
        hazardClasses: manifest.hazardClasses,
      },
    },
    featureCount: paged.length,
    totalCount: total,
    source: 'PVMBG_KRB_GEMPA_LAYER_12_FULL',
    sourceAgency: 'Pusat Vulkanologi dan Mitigasi Bencana Geologi (PVMBG) & BIG',
    isReal: true,
    status: 'REAL_COMPLETE',
    pagination: {
      page: p,
      limit: l,
      total,
      totalPages: Math.ceil(total / l),
      hasMore: p * l < total,
    },
    attribution: 'PVMBG (Badan Geologi) & Badan Informasi Geospasial (BIG)',
    disclaimer:
      'Zona bahaya gempa bumi tektonik PVMBG & BIG (11.439 poligon di 4 kelas bahaya: Tinggi, Menengah, Rendah, Sangat Rendah). Bukan untuk perancangan teknik sipil atau perhitungan kekuatan struktur bangunan (SNI Gempa 1726). Berbeda konseptual dengan sesar aktif PusGen (garis) dan indeks bahaya bencana BNPB (raster).',
  };
}

export async function fetchKrbGempa(options: QueryOptions = {}): Promise<AdapterQueryResult> {
  const { page = 1, limit = 47, bbox, preferDemo = false, skipUpstream = false, scope, full = false } = options;

  if (full || scope === 'national' || bbox) {
    return fetchFullKrbGempa(options);
  }

  const readLocalFixture = async (demo: boolean = false): Promise<any> => {
    const driver = getStorageDriver('public');
    const fileName = demo ? 'rawan_bencana_gempa.json' : 'real_rawan_bencana_gempa.json';
    const text = await driver.readText(geojsonKey(fileName));
    return JSON.parse(text);
  };

  if (preferDemo) {
    const local = await readLocalFixture(true);
    return {
      success: true,
      data: local,
      featureCount: local.features?.length || 0,
      totalCount: local.features?.length || 0,
      source: 'LOCAL_DEMO',
      sourceAgency: 'Badan Nasional Penanggulangan Bencana (BNPB)',
      isReal: false,
      status: 'FALLBACK',
      attribution: 'BNPB & PVMBG Badan Geologi',
      disclaimer:
        'Data kebencanaan fallback. Bukan untuk perancangan teknik sipil atau perhitungan kekuatan struktur bangunan (SNI Gempa 1726).',
    };
  }

  // 1. Check cache first
  const now = Date.now();
  if (cacheGempa && now - cacheGempa.timestamp < CACHE_TTL_MS && !bbox) {
    const features = cacheGempa.data.features || [];
    const total = features.length;
    const p = Math.max(1, page);
    const l = Math.max(1, limit);
    const paged = features.slice((p - 1) * l, p * l);

    return {
      success: true,
      data: { ...cacheGempa.data, features: paged },
      featureCount: paged.length,
      totalCount: total,
      source: 'UPSTREAM_KSP_GEMPA_CACHE',
      sourceAgency: 'Pusat Vulkanologi dan Mitigasi Bencana Geologi (PVMBG) & BIG',
      isReal: true,
      status: 'REAL_PARTIAL_COVERAGE',
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages: Math.ceil(total / l),
        hasMore: p * l < total,
      },
      attribution: 'PVMBG (Badan Geologi) & Badan Informasi Geospasial (BIG)',
      disclaimer:
        'Zona bahaya gempa bumi tektonik PVMBG & BIG. Bukan untuk perancangan teknik sipil atau kekuatan struktur bangunan (SNI Gempa 1726).',
    };
  }

  // 2. Query upstream if not skipUpstream
  if (!skipUpstream) {
    try {
      let url = `${UPSTREAM_KRB_GEMPA}/query?where=1%3D1&resultRecordCount=${limit}&outFields=objectid,namobj,krbid,kelas,lcode&f=geojson`;
      if (bbox) {
        url += `&geometry=${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects`;
      }

      const upstream = await new Promise<any>((resolve, reject) => {
        const req = https.get(url, { rejectUnauthorized: false, timeout: 5000 }, (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                resolve(JSON.parse(body));
              } catch (e) {
                reject(e);
              }
            } else {
              reject(new Error(`Upstream HTTP ${res.statusCode}`));
            }
          });
        });
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });

      if (upstream && Array.isArray(upstream.features) && upstream.features.length > 0) {
        if (!bbox) {
          cacheGempa = { data: upstream, timestamp: now };
        }
        return {
          success: true,
          data: upstream,
          featureCount: upstream.features.length,
          totalCount: 11439, // Total upstream hazard polygons
          source: 'BIG_KSP_KRB_GEMPA_LAYER_12',
          sourceAgency: 'Pusat Vulkanologi dan Mitigasi Bencana Geologi (PVMBG) & BIG',
          isReal: true,
          status: 'REAL_PARTIAL_COVERAGE',
          attribution: 'PVMBG (Badan Geologi) & Badan Informasi Geospasial (BIG)',
          disclaimer:
            'Zona bahaya gempa bumi tektonik PVMBG & BIG. Bukan untuk perancangan teknik sipil atau kekuatan struktur bangunan (SNI Gempa 1726).',
        };
      }
    } catch {
      // Graceful fallback to local verified fixture
    }
  }

  // 3. Fallback to local verified fixture (47 real hazard polygons)
  const local = await readLocalFixture(false);
  const features = local.features || [];
  const total = features.length;
  const p = Math.max(1, page);
  const l = Math.max(1, limit);
  const paged = features.slice((p - 1) * l, p * l);

  return {
    success: true,
    data: { ...local, features: paged },
    featureCount: paged.length,
    totalCount: 11439,
    source: 'LOCAL_VERIFIED_FIXTURE_PVMBG_BIG',
    sourceAgency: 'Pusat Vulkanologi dan Mitigasi Bencana Geologi (PVMBG) & BIG',
    isReal: true,
    status: 'REAL_PARTIAL_COVERAGE',
    pagination: {
      page: p,
      limit: l,
      total,
      totalPages: Math.ceil(total / l),
      hasMore: p * l < total,
    },
    attribution: 'PVMBG (Badan Geologi) & Badan Informasi Geospasial (BIG)',
    disclaimer:
      'Peta Kawasan Rawan Bencana Gempa Bumi tektonik (Tinggi, Menengah, Rendah). Bukan untuk perancangan teknik sipil atau perhitungan kekuatan struktur bangunan (SNI Gempa 1726).',
  };
}
