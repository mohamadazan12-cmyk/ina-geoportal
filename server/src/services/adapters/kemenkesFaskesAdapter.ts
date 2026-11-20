import https from 'https';
import { AdapterQueryResult, QueryOptions } from './types';
import { getStorageDriver, geojsonKey } from '../storage';

let nationalFaskesCache: any = null;

export async function fetchNationalHealthFacilities(
  options: QueryOptions = {}
): Promise<AdapterQueryResult> {
  const { page = 1, limit = 100, bbox } = options;
  const driver = getStorageDriver('public');

  if (!nationalFaskesCache) {
    const text = await driver.readText(geojsonKey('real_fasilitas_kesehatan_national.json'));
    nationalFaskesCache = JSON.parse(text);
  }

  let features = nationalFaskesCache.features || [];
  if (bbox) {
    const [minX, minY, maxX, maxY] = bbox;
    features = features.filter((f: any) => {
      if (!f.geometry || !f.geometry.coordinates) return true;
      const [x, y] = f.geometry.coordinates;
      return x >= minX && x <= maxX && y >= minY && y <= maxY;
    });
  }

  const total = features.length;
  const p = Math.max(1, page);
  const l = Math.max(1, limit);
  const paged = features.slice((p - 1) * l, p * l);

  return {
    success: true,
    data: { ...nationalFaskesCache, features: paged },
    featureCount: paged.length,
    totalCount: total,
    source: 'BIG_RBI_FASKES_LAYERS_474_475_476_NATIONAL',
    sourceAgency: 'Badan Informasi Geospasial (BIG) & Ditjen Yankes Kemenkes RI',
    isReal: true,
    status: 'REAL_COMPLETE',
    pagination: {
      page: p,
      limit: l,
      total,
      totalPages: Math.ceil(total / l),
      hasMore: p * l < total,
    },
    attribution: 'Badan Informasi Geospasial (BIG) RBI & Ditjen Yankes Kemenkes RI',
    disclaimer:
      'Menyajikan 4.021 fasilitas kesehatan nasional resmi (1.021 Rumah Sakit Layer 474, 2.000 Puskesmas Layer 475, 1.000 Klinik Layer 476) EPSG:4326. Akses live SATUSEHAT Master Sarana Index memerlukan registrasi token kementerian.',
  };
}

export async function fetchFasilitasKesehatan(
  options: QueryOptions = {}
): Promise<AdapterQueryResult> {
  const { page = 1, limit = 102, bbox, preferDemo = false, scope, full = false } = options;

  if (full || scope === 'national' || limit > 102 || bbox) {
    return fetchNationalHealthFacilities(options);
  }

  const readLocalFixture = async (demo: boolean = false): Promise<any> => {
    const driver = getStorageDriver('public');
    const fileName = demo ? 'fasilitas_kesehatan.json' : 'real_fasilitas_kesehatan.json';
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
      sourceAgency: 'Badan Informasi Geospasial (BIG) & Kemenkes RI',
      isReal: false,
      status: 'FALLBACK',
      attribution: 'Badan Informasi Geospasial (BIG) & Kemenkes RI',
    };
  }

  // 1. Check if SATUSEHAT Bearer token is provided via environment
  const satusehatToken = process.env.SATUSEHAT_BEARER_TOKEN;
  if (satusehatToken) {
    try {
      const url =
        'https://api-satusehat.dto.kemkes.go.id/masterdata/v1/mastersaranaindex/mastersarana?limit=' +
        limit;
      const sResult = await new Promise<any>((resolve, reject) => {
        const req = https.get(
          url,
          {
            headers: {
              Authorization: `Bearer ${satusehatToken}`,
              Accept: 'application/json',
            },
            timeout: 6000,
          },
          (res) => {
            let b = '';
            res.on('data', (c) => (b += c));
            res.on('end', () => {
              if (res.statusCode === 200) {
                try {
                  resolve(JSON.parse(b));
                } catch (e) {
                  reject(e);
                }
              } else {
                reject(new Error(`SATUSEHAT HTTP ${res.statusCode}`));
              }
            });
          }
        );
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });

      if (sResult && Array.isArray(sResult.data)) {
        // Convert SATUSEHAT MSI records to GeoJSON FeatureCollection
        const features = sResult.data
          .filter((item: any) => item.longitude && item.latitude)
          .map((item: any) => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [parseFloat(item.longitude), parseFloat(item.latitude)],
            },
            properties: {
              NAMA_FASKES: item.nama_sarana,
              TIPE_FASKES: item.jenis_sarana_nama,
              KODE_FASKES: item.kode_sarana,
              ALAMAT: item.alamat,
              PROVINSI: item.provinsi_nama,
              KAB_KOTA: item.kab_kota_nama,
              STATUS_AKTIF: item.status_aktif,
              SUMBER: 'Kemenkes RI - SATUSEHAT Master Sarana Index',
            },
          }));

        return {
          success: true,
          data: { type: 'FeatureCollection', features },
          featureCount: features.length,
          totalCount: sResult.total || features.length,
          source: 'KEMENKES_SATUSEHAT_MSI_LIVE',
          sourceAgency: 'Kementerian Kesehatan RI (SATUSEHAT DTO)',
          isReal: true,
          status: 'REAL_VERIFIED',
          attribution: 'Kementerian Kesehatan RI - SATUSEHAT Platform',
        };
      }
    } catch {
      // Graceful fallback to verified BIG RBI fixture
    }
  }

  // 2. Fallback to verified BIG RBI health facilities fixture (102 points)
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
    totalCount: 102,
    source: 'LOCAL_VERIFIED_FIXTURE_BIG_RBI',
    sourceAgency: 'Badan Informasi Geospasial (BIG) & Kemenkes RI',
    isReal: true,
    status: 'REAL_PARTIAL_COVERAGE',
    pagination: {
      page: p,
      limit: l,
      total,
      totalPages: Math.ceil(total / l),
      hasMore: p * l < total,
    },
    attribution: 'Badan Informasi Geospasial (BIG) & Ditjen Yankes Kemenkes RI',
    disclaimer:
      'Menyajikan 102 titik fasilitas kesehatan terverifikasi dari lembar survei Rupabumi Indonesia (35 RS, 67 Puskesmas). Bukan cakupan nasional lengkap. Integrasi nasional penuh via SATUSEHAT Master Sarana Index memerlukan registrasi token.',
  };
}
