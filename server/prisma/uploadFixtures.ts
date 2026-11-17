/**
 * Fixture Upload Script — Local → Vercel Blob
 * ===========================================
 * Phase 14 / P0.3 — file storage abstraction migration helper.
 *
 * Uploads the committed GeoJSON fixtures to object storage so production
 * deployments do not depend on the container filesystem.
 *
 * SAFETY:
 *  - Never fabricates files: only files that already exist locally are uploaded.
 *  - Never deletes anything.
 *  - Skips documents that do not exist (the 8 SDG PDFs are genuinely missing).
 *
 * Usage:
 *   # Dry run (default) — lists what would be uploaded, uploads nothing
 *   npm run storage:upload --workspace=server
 *
 *   # Real upload (requires BLOB_READ_WRITE_TOKEN for private, and
 *   # BLOB_PUBLIC_READ_WRITE_TOKEN or BLOB_READ_WRITE_TOKEN for public)
 *   npm run storage:upload --workspace=server -- --apply
 */

import fs from 'fs';
import path from 'path';

const APPLY = process.argv.includes('--apply');
const FIXTURE_ROOT = path.resolve(__dirname, '../src/fixtures');
const GEOJSON_DIR = path.join(FIXTURE_ROOT, 'geojson');
const DOCUMENTS_DIR = path.join(FIXTURE_ROOT, 'documents');

interface UploadPlan {
  scope: 'public' | 'private';
  localPath: string;
  key: string;
  size: number;
  contentType: string;
}

function inferContentType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.geojson') || lower.endsWith('.json')) return 'application/geo+json';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  return 'application/octet-stream';
}

function collect(dir: string, scope: 'public' | 'private', prefix: string): UploadPlan[] {
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const localPath = path.join(dir, entry.name);
      return {
        scope,
        localPath,
        key: `${prefix}/${entry.name}`,
        size: fs.statSync(localPath).size,
        contentType: inferContentType(entry.name),
      };
    });
}

async function main(): Promise<void> {
  console.log('--- Ina-Geoportal Fixture Uploader ---');
  console.log('Mode:', APPLY ? 'APPLY (will upload)' : 'DRY RUN (no changes)');

  // GeoJSON map layers → public store (Leaflet must fetch these anonymously).
  // The same bytes are also needed in the private store for authenticated
  // dataset downloads, so both are planned.
  const publicLayers = collect(GEOJSON_DIR, 'public', 'geojson');
  const privateDatasets = collect(GEOJSON_DIR, 'private', 'geojson');
  const privateDocs = collect(DOCUMENTS_DIR, 'private', 'documents');

  const plan: UploadPlan[] = [...publicLayers, ...privateDatasets, ...privateDocs];

  const totalBytes = plan.reduce((sum, item) => sum + item.size, 0);

  console.log('');
  console.log('Plan summary:');
  console.log(`  public GeoJSON layers : ${publicLayers.length} file(s)`);
  console.log(`  private dataset files : ${privateDatasets.length} file(s)`);
  console.log(`  private documents     : ${privateDocs.length} file(s)`);
  console.log(`  total payload         : ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);

  if (privateDocs.length === 0) {
    console.log('');
    console.log('NOTE: server/src/fixtures/documents is empty.');
    console.log('      The 8 SDG standard documents are genuinely NOT available.');
    console.log('      They are intentionally skipped — no dummy PDFs are generated.');
  }

  console.log('');
  console.log('Files:');
  for (const item of plan) {
    const rel = path.relative(FIXTURE_ROOT, item.localPath).replace(/\\/g, '/');
    console.log(`  [${item.scope}] ${rel}  (${(item.size / 1024).toFixed(1)} KB)`);
  }

  if (!APPLY) {
    console.log('');
    console.log('Dry run complete. Re-run with --apply to upload.');
    return;
  }

  // Lazy import so dry runs work without the SDK or credentials.
  const { getStorageDriver } = await import('../src/services/storage');

  let uploaded = 0;
  let failed = 0;

  for (const item of plan) {
    try {
      const driver = getStorageDriver(item.scope);
      const data = fs.readFileSync(item.localPath);
      await driver.upload(item.key, data, item.contentType);
      uploaded += 1;
      console.log(`  ✓ [${item.scope}] ${item.key}`);
    } catch (error) {
      failed += 1;
      console.error(
        `  ✗ [${item.scope}] ${item.key}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  console.log('');
  console.log(`Upload finished. uploaded=${uploaded} failed=${failed}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error('Uploader failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
