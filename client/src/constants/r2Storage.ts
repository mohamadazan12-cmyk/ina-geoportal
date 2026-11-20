/**
 * PHASE 16.7 — CLIENT R2 STORAGE CONFIGURATION & CANONICAL KEY REGISTRY
 *
 * Centralized configuration for Cloudflare R2 public geospatial asset delivery.
 * Contains no credentials or secrets; reads only the public CDN endpoint.
 */

export const R2_PUBLIC_BASE_URL: string = (
  (import.meta as any).env?.VITE_R2_PUBLIC_URL ||
  'https://pub-9dc737b540c54b5597b47a06cbbda81e.r2.dev'
).replace(/\/+$/, '');

export interface DatasetStorageMapping {
  id: string;
  title: string;
  webKey: string;
  fullKey?: string;
  defaultFeatures: number;
  totalFeatures: number;
  geometryType: string;
  lazyStrategy: 'web-optimized' | 'chunk-indexed' | 'regional-partitions' | 'direct';
}

export const DATASET_STORAGE_MAP: Record<string, DatasetStorageMapping> = {
  'ds-batas-kabkot': {
    id: 'ds-batas-kabkot',
    title: 'Batas Administrasi Kabupaten/Kota',
    webKey: 'geojson/web/real_batas_kabupaten.json',
    fullKey: 'datasets/ds-batas-kabkot/full/real_batas_kabupaten_548.json',
    defaultFeatures: 541,
    totalFeatures: 548,
    geometryType: 'Polygon / MultiPolygon',
    lazyStrategy: 'web-optimized',
  },
  'ds-jalan-nasional': {
    id: 'ds-jalan-nasional',
    title: 'Jaringan Jalan Nasional Indonesia',
    webKey: 'geojson/web/real_jalan_nasional.json',
    fullKey: 'datasets/ds-jalan-nasional/full/real_jalan_nasional_full.json',
    defaultFeatures: 60,
    totalFeatures: 3377,
    geometryType: 'LineString / MultiLineString',
    lazyStrategy: 'web-optimized',
  },
  'ds-rawan-gempa': {
    id: 'ds-rawan-gempa',
    title: 'Kawasan Rawan Bencana Gempa Bumi',
    webKey: 'geojson/web/real_rawan_bencana_gempa.json',
    fullKey: 'manifests/gempa_manifest.json',
    defaultFeatures: 47,
    totalFeatures: 11439,
    geometryType: 'Polygon',
    lazyStrategy: 'chunk-indexed',
  },
  'ds-tutupan-lahan': {
    id: 'ds-tutupan-lahan',
    title: 'Tutupan Lahan Nasional Skala Besar',
    webKey: 'geojson/web/real_tutupan_lahan.json',
    fullKey: 'manifests/tutupan_lahan_manifest.json',
    defaultFeatures: 200,
    totalFeatures: 1284804,
    geometryType: 'Polygon / MultiPolygon',
    lazyStrategy: 'regional-partitions',
  },
  'ds-faskes': {
    id: 'ds-faskes',
    title: 'Sebaran Fasilitas Kesehatan Nasional',
    webKey: 'datasets/ds-faskes/real_fasilitas_kesehatan_national.json',
    fullKey: 'datasets/ds-faskes/real_fasilitas_kesehatan_national.json',
    defaultFeatures: 4021,
    totalFeatures: 4021,
    geometryType: 'Point',
    lazyStrategy: 'direct',
  },
  'ds-rbi': {
    id: 'ds-rbi',
    title: 'Rupabumi Indonesia Layer Registry',
    webKey: 'datasets/ds-rbi/rbi_layers_registry.json',
    fullKey: 'datasets/ds-rbi/rbi_layers_registry.json',
    defaultFeatures: 890,
    totalFeatures: 890,
    geometryType: 'Layer Catalog',
    lazyStrategy: 'direct',
  },
};

/** Get direct Cloudflare R2 Public URL for an asset key */
export function getR2PublicUrl(canonicalKey: string): string {
  const clean = canonicalKey.replace(/^\/+/, '');
  return `${R2_PUBLIC_BASE_URL}/${clean}`;
}

/** Get backend CORS-safe proxy URL for an asset key */
export function getR2ProxyUrl(canonicalKey: string): string {
  const clean = canonicalKey.replace(/^\/+/, '');
  return `/api/v1/storage/r2/${clean}`;
}

/** Get direct download URL for a dataset */
export function getDatasetPublicDownloadUrl(datasetId: string): string {
  const mapping = DATASET_STORAGE_MAP[datasetId];
  if (!mapping) return getR2PublicUrl(`datasets/${datasetId}`);
  const key = mapping.fullKey || mapping.webKey;
  return getR2PublicUrl(key);
}
