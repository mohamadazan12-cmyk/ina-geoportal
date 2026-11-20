import path from 'path';
import fs from 'fs';
import { config } from '../../config';
import { StorageDriver, StoreScope } from './types';
import { LocalStorageDriver } from './localDriver';
import { VercelBlobStorageDriver } from './blobDriver';
import { R2StorageDriver } from './r2Driver';
import { ResilientR2StorageDriver } from './resilientDriver';
import { toCanonicalKey, canonicalToLocalFixture, CANONICAL_KEYS_70 } from './canonicalKeys';

/**
 * Absolute path to the committed fixture tree.
 *
 * After `tsc`, this file lives at `server/dist/services/storage/index.js`, so
 * `../../fixtures` resolves to `server/dist/fixtures`. During development it
 * resolves to `server/src/fixtures`. The build step copies fixtures into dist,
 * so both paths are valid.
 */
function defaultFixtureRoot(): string {
  return path.resolve(__dirname, '../../fixtures');
}

/** Extra candidate roots searched in order when the primary is missing. */
function localCandidateRoots(): string[] {
  const candidates = [
    defaultFixtureRoot(),
    // Source tree fallback — used when running from dist before a copy happened
    path.resolve(__dirname, '../../../src/fixtures'),
  ];
  return candidates.filter((dir, index) => candidates.indexOf(dir) === index && fs.existsSync(dir));
}

const driverCache = new Map<StoreScope, StorageDriver>();

/**
 * Resolve the storage driver for a scope.
 *
 * Selection order:
 *  1. `STORAGE_DRIVER=r2`          → Cloudflare R2 / S3-compatible store.
 *  2. `STORAGE_DRIVER=vercel-blob` → Vercel Blob (throws if the token is absent).
 *  3. `STORAGE_DRIVER=local`       → filesystem fixtures.
 *  4. Unset                        → auto-detect: R2 if configured, else Blob, else local.
 */
export function getStorageDriver(scope: StoreScope = 'private'): StorageDriver {
  const cached = driverCache.get(scope);
  if (cached) return cached;

  const driverPreference = config.storageDriver;

  if (driverPreference === 'r2') {
    const roots = localCandidateRoots();
    const rootDir = roots[0] || defaultFixtureRoot();
    const localFallback = new LocalStorageDriver(scope, rootDir);
    const r2Primary = new R2StorageDriver(scope, { useScopePrefix: false });
    const driver = new ResilientR2StorageDriver(scope, r2Primary, localFallback);
    driverCache.set(scope, driver);
    return driver;
  }

  if (driverPreference === 'vercel-blob') {
    const token = config.blobPublicReadWriteToken || config.blobReadWriteToken;
    const driver = new VercelBlobStorageDriver(scope, token);
    driverCache.set(scope, driver);
    return driver;
  }

  // Local driver: pick the first existing fixture root so that dist and src
  // layouts both work without configuration.
  const roots = localCandidateRoots();
  const rootDir = roots[0] || defaultFixtureRoot();
  const driver = new LocalStorageDriver(scope, rootDir);
  driverCache.set(scope, driver);
  return driver;
}

/**
 * Effects: reset cached drivers. Used by tests that swap environment variables.
 */
export function resetStorageDrivers(): void {
  driverCache.clear();
}

// ---------------------------------------------------------------------------
// Object key conventions
// ---------------------------------------------------------------------------

/** Key of a GeoJSON fixture / map layer. */
export function geojsonKey(fileName: string): string {
  return `geojson/${path.basename(fileName)}`;
}

/** Key of a downloadable document (private original). */
export function documentKey(fileName: string): string {
  return `documents/${path.basename(fileName)}`;
}

/** Key of a packaged dataset download. */
export function datasetDownloadKey(datasetId: string, fileName: string): string {
  const safeId = datasetId.replace(/[^a-zA-Z0-9_-]/g, '');
  return `datasets/${safeId}/${path.basename(fileName)}`;
}

/** Key of a spatial chunk archive within a dataset. */
export function chunkKey(datasetId: string, chunkName: string): string {
  const safeId = datasetId.replace(/[^a-zA-Z0-9_-]/g, '');
  return `datasets/${safeId}/chunks/${path.basename(chunkName)}`;
}

/** Key of a regional partition archive within a dataset. */
export function partitionKey(datasetId: string, partitionName: string): string {
  const safeId = datasetId.replace(/[^a-zA-Z0-9_-]/g, '');
  return `datasets/${safeId}/partitions/${path.basename(partitionName)}`;
}

// ---------------------------------------------------------------------------
// Phase 16.4.1 Canonical Public Key Helpers (Single Bucket: ina-geoportal-data)
// ---------------------------------------------------------------------------

/** Key for web-optimized GeoJSON fixtures in public storage (e.g. geojson/web/real_batas_kabupaten.json). */
export function geojsonWebKey(fileName: string): string {
  return `geojson/web/${path.basename(fileName)}`;
}

/** Key for full master dataset archives in public storage (e.g. datasets/ds-batas-kabkot/full/...). */
export function datasetFullKey(datasetId: string, fileName: string): string {
  const safeId = datasetId.replace(/[^a-zA-Z0-9_-]/g, '');
  return `datasets/${safeId}/full/${path.basename(fileName)}`;
}

/** Key for healthcare facilities dataset in public storage. */
export function datasetFaskesKey(fileName: string): string {
  return `datasets/ds-faskes/${path.basename(fileName)}`;
}

/** Key for Rupabumi Indonesia layers registry in public storage. */
export function datasetRbiKey(fileName: string): string {
  return `datasets/ds-rbi/${path.basename(fileName)}`;
}

/** Key for dataset manifests in public storage (e.g. manifests/gempa_manifest.json). */
export function manifestKey(manifestName: string): string {
  return `manifests/${path.basename(manifestName)}`;
}

export {
  LocalStorageDriver,
  VercelBlobStorageDriver,
  R2StorageDriver,
  ResilientR2StorageDriver,
  toCanonicalKey,
  canonicalToLocalFixture,
  CANONICAL_KEYS_70,
};
export * from './types';
