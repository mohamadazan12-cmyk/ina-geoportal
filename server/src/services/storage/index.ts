import path from 'path';
import fs from 'fs';
import { config } from '../../config';
import { StorageDriver, StoreScope } from './types';
import { LocalStorageDriver } from './localDriver';
import { VercelBlobStorageDriver } from './blobDriver';

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
 *  1. `STORAGE_DRIVER=vercel-blob` → Vercel Blob (throws if the token is absent).
 *  2. `STORAGE_DRIVER=local`       → filesystem fixtures.
 *  3. Unset → blob when a token exists, otherwise local.
 */
export function getStorageDriver(scope: StoreScope = 'private'): StorageDriver {
  const cached = driverCache.get(scope);
  if (cached) return cached;

  const driverPreference = config.storageDriver;

  if (driverPreference === 'vercel-blob') {
    // A single private blob store serves both scopes. Display-only map layers
    // are published through the public GeoJSON API route (server-side read),
    // never through a public blob URL, so private original documents and
    // map layers can safely share one store while staying access-controlled
    // at the API layer.
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

export { LocalStorageDriver, VercelBlobStorageDriver };
export * from './types';
