import path from 'path';

/**
 * PHASE 16.7 — CANONICAL STORAGE KEYS REGISTRY
 *
 * Maps all 70 national geospatial assets between Cloudflare R2 object keys
 * and local filesystem fixture locations.
 */

export const CANONICAL_KEYS_70 = [
  // 1. Master Full Archives (2)
  'datasets/ds-batas-kabkot/full/real_batas_kabupaten_548.json',
  'datasets/ds-jalan-nasional/full/real_jalan_nasional_full.json',

  // 2. Web-Optimized GeoJSON (4)
  'geojson/web/real_batas_kabupaten.json',
  'geojson/web/real_jalan_nasional.json',
  'geojson/web/real_rawan_bencana_gempa.json',
  'geojson/web/real_tutupan_lahan.json',

  // 3. Healthcare Facilities & RBI Registry (2)
  'datasets/ds-faskes/real_fasilitas_kesehatan_national.json',
  'datasets/ds-rbi/rbi_layers_registry.json',

  // 4. Manifests (2)
  'manifests/gempa_manifest.json',
  'manifests/tutupan_lahan_manifest.json',

  // 5. Earthquake Chunks (52)
  'datasets/ds-rawan-gempa/chunks/chunk_0.json',
  'datasets/ds-rawan-gempa/chunks/chunk_250.json',
  'datasets/ds-rawan-gempa/chunks/chunk_500.json',
  'datasets/ds-rawan-gempa/chunks/chunk_750.json',
  'datasets/ds-rawan-gempa/chunks/chunk_1000.json',
  'datasets/ds-rawan-gempa/chunks/chunk_1250.json',
  'datasets/ds-rawan-gempa/chunks/chunk_1500.json',
  'datasets/ds-rawan-gempa/chunks/chunk_1750.json',
  'datasets/ds-rawan-gempa/chunks/chunk_2000.json',
  'datasets/ds-rawan-gempa/chunks/chunk_2250.json',
  'datasets/ds-rawan-gempa/chunks/chunk_2500.json',
  'datasets/ds-rawan-gempa/chunks/chunk_2750.json',
  'datasets/ds-rawan-gempa/chunks/chunk_3000.json',
  'datasets/ds-rawan-gempa/chunks/chunk_3250.json',
  'datasets/ds-rawan-gempa/chunks/chunk_3500.json',
  'datasets/ds-rawan-gempa/chunks/chunk_3750.json',
  'datasets/ds-rawan-gempa/chunks/chunk_4000.json',
  'datasets/ds-rawan-gempa/chunks/chunk_4250.json',
  'datasets/ds-rawan-gempa/chunks/chunk_4500.json',
  'datasets/ds-rawan-gempa/chunks/chunk_4750.json',
  'datasets/ds-rawan-gempa/chunks/chunk_5000.json',
  'datasets/ds-rawan-gempa/chunks/chunk_5250.json',
  'datasets/ds-rawan-gempa/chunks/chunk_5500.json',
  'datasets/ds-rawan-gempa/chunks/chunk_5750.json',
  'datasets/ds-rawan-gempa/chunks/chunk_6000.json',
  'datasets/ds-rawan-gempa/chunks/chunk_6250.json',
  'datasets/ds-rawan-gempa/chunks/chunk_6500.json',
  'datasets/ds-rawan-gempa/chunks/chunk_6750.json',
  'datasets/ds-rawan-gempa/chunks/chunk_7000.json',
  'datasets/ds-rawan-gempa/chunks/chunk_7250.json',
  'datasets/ds-rawan-gempa/chunks/chunk_7500.json',
  'datasets/ds-rawan-gempa/chunks/chunk_7750.json',
  'datasets/ds-rawan-gempa/chunks/chunk_8000.json',
  'datasets/ds-rawan-gempa/chunks/chunk_8250.json',
  'datasets/ds-rawan-gempa/chunks/chunk_8500.json',
  'datasets/ds-rawan-gempa/chunks/chunk_8750.json',
  'datasets/ds-rawan-gempa/chunks/chunk_9000.json',
  'datasets/ds-rawan-gempa/chunks/chunk_9250.json',
  'datasets/ds-rawan-gempa/chunks/chunk_9500.json',
  'datasets/ds-rawan-gempa/chunks/chunk_9750.json',
  'datasets/ds-rawan-gempa/chunks/chunk_10000.json',
  'datasets/ds-rawan-gempa/chunks/chunk_10250.json',
  'datasets/ds-rawan-gempa/chunks/chunk_10500.json',
  'datasets/ds-rawan-gempa/chunks/chunk_10750.json',
  'datasets/ds-rawan-gempa/chunks/chunk_11000.json',
  'datasets/ds-rawan-gempa/chunks/chunk_11250.json',
  'datasets/ds-rawan-gempa/chunks/chunk_11280.json',
  'datasets/ds-rawan-gempa/chunks/chunk_11310.json',
  'datasets/ds-rawan-gempa/chunks/chunk_11340.json',
  'datasets/ds-rawan-gempa/chunks/chunk_11370.json',
  'datasets/ds-rawan-gempa/chunks/chunk_11400.json',
  'datasets/ds-rawan-gempa/chunks/chunk_11430.json',

  // 6. Tutupan Lahan Partitions (8)
  'datasets/ds-tutupan-lahan/partitions/reg_bali_nusatenggara.json',
  'datasets/ds-tutupan-lahan/partitions/reg_dki_jawa_barat.json',
  'datasets/ds-tutupan-lahan/partitions/reg_jawa_tengah_timur.json',
  'datasets/ds-tutupan-lahan/partitions/reg_kalimantan_ikn.json',
  'datasets/ds-tutupan-lahan/partitions/reg_papua_jayapura.json',
  'datasets/ds-tutupan-lahan/partitions/reg_sulawesi_selatan.json',
  'datasets/ds-tutupan-lahan/partitions/reg_sumatera_medan.json',
  'datasets/ds-tutupan-lahan/partitions/reg_sumatera_selatan.json',
] as const;

export type CanonicalKey = (typeof CANONICAL_KEYS_70)[number];

/** Legacy / short fixture file name to canonical R2 key */
const LEGACY_TO_CANONICAL: Record<string, string> = {
  // Direct file names
  'real_batas_kabupaten.json': 'geojson/web/real_batas_kabupaten.json',
  'real_jalan_nasional.json': 'geojson/web/real_jalan_nasional.json',
  'real_rawan_bencana_gempa.json': 'geojson/web/real_rawan_bencana_gempa.json',
  'real_tutupan_lahan.json': 'geojson/web/real_tutupan_lahan.json',
  'real_batas_kabupaten_548.json': 'datasets/ds-batas-kabkot/full/real_batas_kabupaten_548.json',
  'real_jalan_nasional_full.json': 'datasets/ds-jalan-nasional/full/real_jalan_nasional_full.json',
  'real_fasilitas_kesehatan_national.json': 'datasets/ds-faskes/real_fasilitas_kesehatan_national.json',
  'rbi_layers_registry.json': 'datasets/ds-rbi/rbi_layers_registry.json',
  'gempa_manifest.json': 'manifests/gempa_manifest.json',
  'tutupan_lahan_manifest.json': 'manifests/tutupan_lahan_manifest.json',

  // geojson/ prefixed
  'geojson/real_batas_kabupaten.json': 'geojson/web/real_batas_kabupaten.json',
  'geojson/real_jalan_nasional.json': 'geojson/web/real_jalan_nasional.json',
  'geojson/real_rawan_bencana_gempa.json': 'geojson/web/real_rawan_bencana_gempa.json',
  'geojson/real_tutupan_lahan.json': 'geojson/web/real_tutupan_lahan.json',
  'geojson/real_batas_kabupaten_548.json': 'datasets/ds-batas-kabkot/full/real_batas_kabupaten_548.json',
  'geojson/real_jalan_nasional_full.json': 'datasets/ds-jalan-nasional/full/real_jalan_nasional_full.json',
  'geojson/real_fasilitas_kesehatan_national.json': 'datasets/ds-faskes/real_fasilitas_kesehatan_national.json',
  'geojson/rbi_layers_registry.json': 'datasets/ds-rbi/rbi_layers_registry.json',
  'geojson/gempa_manifest.json': 'manifests/gempa_manifest.json',
  'geojson/tutupan_lahan_manifest.json': 'manifests/tutupan_lahan_manifest.json',

  // Dataset IDs and dataset filenames
  'ds-batas-kabkot': 'datasets/ds-batas-kabkot/full/real_batas_kabupaten_548.json',
  'ds-batas-kabkot.json': 'datasets/ds-batas-kabkot/full/real_batas_kabupaten_548.json',
  'ds-jalan-nasional': 'datasets/ds-jalan-nasional/full/real_jalan_nasional_full.json',
  'ds-jalan-nasional.json': 'datasets/ds-jalan-nasional/full/real_jalan_nasional_full.json',
  'ds-rawan-gempa': 'geojson/web/real_rawan_bencana_gempa.json',
  'ds-rawan-gempa.json': 'geojson/web/real_rawan_bencana_gempa.json',
  'ds-tutupan-lahan': 'geojson/web/real_tutupan_lahan.json',
  'ds-tutupan-lahan.json': 'geojson/web/real_tutupan_lahan.json',
  'ds-faskes': 'datasets/ds-faskes/real_fasilitas_kesehatan_national.json',
  'ds-faskes.json': 'datasets/ds-faskes/real_fasilitas_kesehatan_national.json',
  'ds-rbi': 'datasets/ds-rbi/rbi_layers_registry.json',
  'ds-rbi.json': 'datasets/ds-rbi/rbi_layers_registry.json',
};

/**
 * Translate any key, legacy key, or filename to its canonical R2 object key.
 */
export function toCanonicalKey(input: string): string {
  const clean = input.replace(/\\/g, '/').replace(/^\/+/, '');
  if (LEGACY_TO_CANONICAL[clean]) {
    return LEGACY_TO_CANONICAL[clean];
  }

  // Handle chunks
  if (clean.includes('chunks_gempa/')) {
    const base = path.basename(clean);
    return `datasets/ds-rawan-gempa/chunks/${base}`;
  }

  // Handle partitions
  if (clean.includes('tutupan_lahan_partitions/')) {
    const base = path.basename(clean);
    return `datasets/ds-tutupan-lahan/partitions/${base}`;
  }

  return clean;
}

/**
 * Map a canonical R2 key to its local relative fixture file inside `server/src/fixtures`.
 */
export function canonicalToLocalFixture(canonicalKey: string): string {
  const clean = toCanonicalKey(canonicalKey);

  // Web optimized
  if (clean.startsWith('geojson/web/')) {
    return `geojson/${path.basename(clean)}`;
  }

  // Full datasets
  if (clean === 'datasets/ds-batas-kabkot/full/real_batas_kabupaten_548.json') {
    return 'geojson/real_batas_kabupaten_548.json';
  }
  if (clean === 'datasets/ds-jalan-nasional/full/real_jalan_nasional_full.json') {
    return 'geojson/real_jalan_nasional_full.json';
  }

  // Facilities & RBI
  if (clean.startsWith('datasets/ds-faskes/')) {
    return `geojson/${path.basename(clean)}`;
  }
  if (clean.startsWith('datasets/ds-rbi/')) {
    return `geojson/${path.basename(clean)}`;
  }

  // Manifests
  if (clean.startsWith('manifests/')) {
    return `geojson/${path.basename(clean)}`;
  }

  // Chunks
  if (clean.startsWith('datasets/ds-rawan-gempa/chunks/')) {
    return `geojson/chunks_gempa/${path.basename(clean)}`;
  }

  // Partitions
  if (clean.startsWith('datasets/ds-tutupan-lahan/partitions/')) {
    return `geojson/tutupan_lahan_partitions/${path.basename(clean)}`;
  }

  // If naked file name (e.g. batas_kabupaten.json), default to geojson/
  if (!clean.startsWith('geojson/') && !clean.startsWith('datasets/') && !clean.startsWith('manifests/')) {
    return `geojson/${clean}`;
  }

  return clean;
}
