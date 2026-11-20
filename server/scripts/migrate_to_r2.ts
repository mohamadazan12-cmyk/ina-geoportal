import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Readable } from 'stream';
import { config } from '../src/config';
import { R2StorageDriver } from '../src/services/storage/r2Driver';
import { StoreScope, sanitizeStorageKey, inferContentType } from '../src/services/storage/types';

export type MigrationStatus = 'UPLOADED_VERIFIED' | 'UPLOAD_PENDING' | 'UPLOAD_FAILED';

export interface MigrationItem {
  id: string;
  name: string;
  localPath: string;
  remoteKey: string;
  scope: StoreScope;
  category: 'PUBLIC_RENDERING' | 'DATASET_ARCHIVE' | 'PRIVATE_DOCUMENT';
  sizeBytes: number;
  sizeMB: string;
  localSha256: string;
  featureCount: number;
  status: MigrationStatus;
  remoteSize?: number;
  remoteSha256?: string;
  lastAttempt?: string;
  attempts: number;
  error?: string;
}

export interface MigrationManifest {
  version: string;
  generatedAt: string;
  environment: {
    hasCredentials: boolean;
    storageDriver: string;
    bucketName: string;
    endpointConfigured: boolean;
    credentialsMasked: {
      accountId: string;
      accessKeyId: string;
      hasSecret: boolean;
    };
  };
  summary: {
    totalAssets: number;
    totalBytes: number;
    totalMB: string;
    verifiedCount: number;
    pendingCount: number;
    failedCount: number;
    overallStatus: 'COMPLETE' | 'BLOCKED_ON_CREDENTIALS' | 'IN_PROGRESS' | 'FAILED';
  };
  items: MigrationItem[];
}

const fixturesDir = path.resolve(__dirname, '../src/fixtures/geojson');
const checkpointPath = path.resolve(fixturesDir, '.r2_migration_checkpoint.json');
const manifestOutputPath = path.resolve(__dirname, '../../docs/PHASE_16_4_MIGRATION_MANIFEST.json');
const publicManifestOutputPath = path.resolve(__dirname, '../../docs/PHASE_16_4_1_PUBLIC_STORAGE_MANIFEST.json');

function computeFileSha256(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function countFeatures(filePath: string): number {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (Array.isArray(raw)) return raw.length;
    if (Array.isArray(raw.features)) return raw.features.length;
    if (typeof raw.totalFeatures === 'number') return raw.totalFeatures;
    if (typeof raw.totalLayers === 'number') return raw.totalLayers;
    return 0;
  } catch {
    return 0;
  }
}

function loadCheckpoint(): Record<string, Partial<MigrationItem>> {
  if (fs.existsSync(checkpointPath)) {
    try {
      return JSON.parse(fs.readFileSync(checkpointPath, 'utf-8'));
    } catch {
      return {};
    }
  }
  return {};
}

function saveCheckpoint(items: MigrationItem[]): void {
  const map: Record<string, MigrationItem> = {};
  for (const item of items) {
    map[item.id] = item;
  }
  fs.writeFileSync(checkpointPath, JSON.stringify(map, null, 2), 'utf-8');
}

export function buildMigrationInventory(options: { unifiedPublic?: boolean } = {}): MigrationItem[] {
  const unified = options.unifiedPublic ?? false;
  const checkpoint = loadCheckpoint();
  const items: MigrationItem[] = [];

  const addItem = (
    fileName: string,
    relSubdir: string,
    remoteKey: string,
    scope: StoreScope,
    category: MigrationItem['category']
  ) => {
    const fullPath = path.join(fixturesDir, relSubdir, fileName);
    if (!fs.existsSync(fullPath)) return;

    const stat = fs.statSync(fullPath);
    const id = `${scope}:${remoteKey}`;
    const cached =
      checkpoint[id] ||
      Object.values(checkpoint).find((c) => c?.name === fileName && c?.sizeBytes === stat.size);

    const sha = cached?.localSha256 || computeFileSha256(fullPath);
    const features = cached?.featureCount !== undefined ? cached.featureCount : countFeatures(fullPath);

    items.push({
      id,
      name: fileName,
      localPath: fullPath,
      remoteKey,
      scope,
      category,
      sizeBytes: stat.size,
      sizeMB: (stat.size / 1048576).toFixed(2),
      localSha256: sha,
      featureCount: features,
      status: cached?.status || 'UPLOAD_PENDING',
      remoteSize: cached?.remoteSize,
      remoteSha256: cached?.remoteSha256,
      attempts: cached?.attempts || 0,
      lastAttempt: cached?.lastAttempt,
      error: cached?.error,
    });
  };

  if (unified) {
    // ========================================================================
    // PHASE 16.4.1 — UNIFIED PUBLIC BUCKET ARCHITECTURE ('ina-geoportal-data')
    // All 70 geospatial datasets are 100% public without login barriers.
    // ========================================================================
    // 1. Full Master Archives
    addItem(
      'real_batas_kabupaten_548.json',
      '',
      'datasets/ds-batas-kabkot/full/real_batas_kabupaten_548.json',
      'public',
      'DATASET_ARCHIVE'
    );
    addItem(
      'real_jalan_nasional_full.json',
      '',
      'datasets/ds-jalan-nasional/full/real_jalan_nasional_full.json',
      'public',
      'DATASET_ARCHIVE'
    );

    // 2. Web-optimized GeoJSON (geojson/web/)
    addItem('real_batas_kabupaten.json', '', 'geojson/web/real_batas_kabupaten.json', 'public', 'PUBLIC_RENDERING');
    addItem('real_jalan_nasional.json', '', 'geojson/web/real_jalan_nasional.json', 'public', 'PUBLIC_RENDERING');
    addItem('real_rawan_bencana_gempa.json', '', 'geojson/web/real_rawan_bencana_gempa.json', 'public', 'PUBLIC_RENDERING');
    addItem('real_tutupan_lahan.json', '', 'geojson/web/real_tutupan_lahan.json', 'public', 'PUBLIC_RENDERING');

    // 3. Healthcare Facilities (datasets/ds-faskes/)
    addItem(
      'real_fasilitas_kesehatan_national.json',
      '',
      'datasets/ds-faskes/real_fasilitas_kesehatan_national.json',
      'public',
      'PUBLIC_RENDERING'
    );

    // 4. Rupabumi Indonesia Registry (datasets/ds-rbi/)
    addItem('rbi_layers_registry.json', '', 'datasets/ds-rbi/rbi_layers_registry.json', 'public', 'PUBLIC_RENDERING');

    // 5. Manifests (manifests/)
    addItem('gempa_manifest.json', '', 'manifests/gempa_manifest.json', 'public', 'PUBLIC_RENDERING');
    addItem('tutupan_lahan_manifest.json', '', 'manifests/tutupan_lahan_manifest.json', 'public', 'PUBLIC_RENDERING');

    // 6. Kawasan Rawan Gempa Chunks (datasets/ds-rawan-gempa/chunks/ — 52 chunk files)
    const gempaDir = path.join(fixturesDir, 'chunks_gempa');
    if (fs.existsSync(gempaDir)) {
      const chunkFiles = fs
        .readdirSync(gempaDir)
        .filter((f) => f.startsWith('chunk_') && f.endsWith('.json'))
        .sort((a, b) => (parseInt(a.replace(/\D/g, '')) || 0) - (parseInt(b.replace(/\D/g, '')) || 0));

      for (const cf of chunkFiles) {
        addItem(cf, 'chunks_gempa', `datasets/ds-rawan-gempa/chunks/${cf}`, 'public', 'PUBLIC_RENDERING');
      }
    }

    // 7. Tutupan Lahan Partitions (datasets/ds-tutupan-lahan/partitions/ — 8 regional files)
    const tutupanDir = path.join(fixturesDir, 'tutupan_lahan_partitions');
    if (fs.existsSync(tutupanDir)) {
      const partFiles = fs
        .readdirSync(tutupanDir)
        .filter((f) => f.startsWith('reg_') && f.endsWith('.json'))
        .sort();

      for (const pf of partFiles) {
        addItem(pf, 'tutupan_lahan_partitions', `datasets/ds-tutupan-lahan/partitions/${pf}`, 'public', 'PUBLIC_RENDERING');
      }
    }
  } else {
    // ------------------------------------------------------------------------
    // Legacy Phase 16.4 Dual-Store Architecture (Backwards-Compatible Mode)
    // ------------------------------------------------------------------------
    addItem(
      'real_batas_kabupaten_548.json',
      '',
      'datasets/ds-batas-kabkot/real_batas_kabupaten_548.json',
      'private',
      'DATASET_ARCHIVE'
    );
    addItem(
      'real_jalan_nasional_full.json',
      '',
      'datasets/ds-jalan-nasional/real_jalan_nasional_full.json',
      'private',
      'DATASET_ARCHIVE'
    );

    addItem('real_batas_kabupaten.json', '', 'geojson/real_batas_kabupaten.json', 'public', 'PUBLIC_RENDERING');
    addItem('real_jalan_nasional.json', '', 'geojson/real_jalan_nasional.json', 'public', 'PUBLIC_RENDERING');
    addItem('real_rawan_bencana_gempa.json', '', 'geojson/real_rawan_bencana_gempa.json', 'public', 'PUBLIC_RENDERING');
    addItem(
      'real_fasilitas_kesehatan_national.json',
      '',
      'geojson/real_fasilitas_kesehatan_national.json',
      'public',
      'PUBLIC_RENDERING'
    );
    addItem('real_tutupan_lahan.json', '', 'geojson/real_tutupan_lahan.json', 'public', 'PUBLIC_RENDERING');

    addItem('gempa_manifest.json', '', 'geojson/gempa_manifest.json', 'public', 'PUBLIC_RENDERING');
    addItem('tutupan_lahan_manifest.json', '', 'geojson/tutupan_lahan_manifest.json', 'public', 'PUBLIC_RENDERING');
    addItem('rbi_layers_registry.json', '', 'geojson/rbi_layers_registry.json', 'public', 'PUBLIC_RENDERING');

    const gempaDir = path.join(fixturesDir, 'chunks_gempa');
    if (fs.existsSync(gempaDir)) {
      const chunkFiles = fs
        .readdirSync(gempaDir)
        .filter((f) => f.startsWith('chunk_') && f.endsWith('.json'))
        .sort((a, b) => (parseInt(a.replace(/\D/g, '')) || 0) - (parseInt(b.replace(/\D/g, '')) || 0));

      for (const cf of chunkFiles) {
        addItem(cf, 'chunks_gempa', `datasets/ds-rawan-gempa/chunks/${cf}`, 'public', 'PUBLIC_RENDERING');
      }
    }

    const tutupanDir = path.join(fixturesDir, 'tutupan_lahan_partitions');
    if (fs.existsSync(tutupanDir)) {
      const partFiles = fs
        .readdirSync(tutupanDir)
        .filter((f) => f.startsWith('reg_') && f.endsWith('.json'))
        .sort();

      for (const pf of partFiles) {
        addItem(pf, 'tutupan_lahan_partitions', `datasets/ds-tutupan-lahan/partitions/${pf}`, 'public', 'PUBLIC_RENDERING');
      }
    }
  }

  return items;
}

/** Helper returning the Phase 16.4.1 unified public inventory (100% public, 70 assets). */
export function buildPublicMigrationInventory(): MigrationItem[] {
  return buildMigrationInventory({ unifiedPublic: true });
}

export async function runMigration(options: {
  dryRun?: boolean;
  verifyOnly?: boolean;
  force?: boolean;
  unifiedPublic?: boolean;
} = {}): Promise<MigrationManifest> {
  const { dryRun = false, verifyOnly = false, force = false, unifiedPublic = true } = options;
  const items = buildMigrationInventory({ unifiedPublic });
  const hasCredentials = config.hasR2Credentials;

  console.log('================================================================================');
  console.log('   INA-GEOPORTAL v2.0 — CLOUDFLARE R2 REMOTE STORAGE MIGRATION RUNNER');
  console.log('================================================================================');
  console.log(`Architecture: ${unifiedPublic ? 'PHASE 16.4.1 UNIFIED PUBLIC BUCKET' : 'PHASE 16.4 DUAL-STORE'}`);
  console.log(`Mode: ${dryRun ? 'DRY-RUN' : verifyOnly ? 'VERIFY-ONLY' : 'LIVE UPLOAD'}`);
  console.log(`Target Bucket: ${config.r2BucketName || 'ina-geoportal-data'}`);
  console.log(`Custom Domain / Public URL: ${config.r2PublicUrl || 'https://data.inageoportal.go.id'}`);
  console.log(`Endpoint: ${config.r2Endpoint || '(UNCONFIGURED)'}`);
  console.log(`Credentials Present: ${hasCredentials ? 'YES' : 'NO'}`);
  console.log(`Total Assets in Inventory: ${items.length}`);
  console.log('--------------------------------------------------------------------------------');

  let publicDriver: R2StorageDriver | null = null;
  let privateDriver: R2StorageDriver | null = null;

  if (hasCredentials && !dryRun) {
    try {
      if (unifiedPublic) {
        publicDriver = new R2StorageDriver('public', { useScopePrefix: false });
        privateDriver = publicDriver;
      } else {
        publicDriver = new R2StorageDriver('public');
        privateDriver = new R2StorageDriver('private');
      }
    } catch (e: any) {
      console.error('[R2_INIT_ERROR] Gagal inisialisasi driver R2:', e.message);
    }
  }

  let verifiedCount = 0;
  let pendingCount = 0;
  let failedCount = 0;
  let totalBytes = 0;

  for (const item of items) {
    totalBytes += item.sizeBytes;

    if (!hasCredentials || dryRun) {
      pendingCount++;
      continue;
    }

    const driver = item.scope === 'public' ? publicDriver : privateDriver;
    if (!driver) {
      item.status = 'UPLOAD_FAILED';
      item.error = 'Driver not initialized';
      failedCount++;
      continue;
    }

    // Skip if already verified unless force is specified
    if (!force && item.status === 'UPLOADED_VERIFIED' && !verifyOnly) {
      verifiedCount++;
      console.log(`[SKIP_VERIFIED] ${item.remoteKey} (${item.sizeMB} MB)`);
      continue;
    }

    item.attempts++;
    item.lastAttempt = new Date().toISOString();

    try {
      console.log(`[PROCESSING] ${item.remoteKey} (${item.sizeMB} MB)...`);

      if (!verifyOnly) {
        // Upload with stream
        const fileStream = fs.createReadStream(item.localPath);
        await driver.upload(item.remoteKey, fileStream, inferContentType(item.name));
      }

      // Verification: Check HEAD metadata
      const meta = await driver.getMeta(item.remoteKey);
      if (!meta) {
        throw new Error('Remote object not found via HEAD verification');
      }

      item.remoteSize = meta.size;
      if (meta.size !== item.sizeBytes) {
        throw new Error(`Size mismatch: remote ${meta.size} vs local ${item.sizeBytes}`);
      }

      // Verification: Download and verify SHA256 checksum
      const remoteStream = await driver.createReadStream(item.remoteKey);
      const remoteSha = await new Promise<string>((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        remoteStream.on('data', (chunk) => hash.update(chunk));
        remoteStream.on('end', () => resolve(hash.digest('hex')));
        remoteStream.on('error', reject);
      });

      item.remoteSha256 = remoteSha;
      if (remoteSha !== item.localSha256) {
        throw new Error(`Checksum mismatch: remote ${remoteSha} vs local ${item.localSha256}`);
      }

      item.status = 'UPLOADED_VERIFIED';
      item.error = undefined;
      verifiedCount++;
      console.log(`[VERIFIED_OK] ${item.remoteKey} -> SHA256 match!`);
    } catch (err: any) {
      item.status = 'UPLOAD_FAILED';
      item.error = err.message || String(err);
      failedCount++;
      console.error(`[ERROR] ${item.remoteKey}: ${item.error}`);
    }

    // Save checkpoint after each item for resume safety
    saveCheckpoint(items);
  }

  const overallStatus = !hasCredentials
    ? 'BLOCKED_ON_CREDENTIALS'
    : failedCount > 0
    ? 'FAILED'
    : verifiedCount === items.length
    ? 'COMPLETE'
    : 'IN_PROGRESS';

  const manifest: MigrationManifest = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    environment: {
      hasCredentials,
      storageDriver: config.storageDriver,
      bucketName: config.r2BucketName || '',
      endpointConfigured: Boolean(config.r2Endpoint),
      credentialsMasked: {
        accountId: config.r2AccountId ? `${config.r2AccountId.slice(0, 4)}...masked` : '',
        accessKeyId: config.r2AccessKeyId ? `${config.r2AccessKeyId.slice(0, 4)}...masked` : '',
        hasSecret: Boolean(config.r2SecretAccessKey),
      },
    },
    summary: {
      totalAssets: items.length,
      totalBytes,
      totalMB: (totalBytes / 1048576).toFixed(2),
      verifiedCount,
      pendingCount,
      failedCount,
      overallStatus,
    },
    items,
  };

  // Write manifest to disk
  fs.writeFileSync(manifestOutputPath, JSON.stringify(manifest, null, 2), 'utf-8');
  if (unifiedPublic) {
    fs.writeFileSync(publicManifestOutputPath, JSON.stringify(manifest, null, 2), 'utf-8');
  }
  saveCheckpoint(items);

  console.log('--------------------------------------------------------------------------------');
  console.log(`Migration Summary:`);
  console.log(`  Total Assets:     ${manifest.summary.totalAssets}`);
  console.log(`  Total Volume:     ${manifest.summary.totalMB} MB`);
  console.log(`  Verified:         ${manifest.summary.verifiedCount}`);
  console.log(`  Pending:          ${manifest.summary.pendingCount}`);
  console.log(`  Failed:           ${manifest.summary.failedCount}`);
  console.log(`  Overall Status:   ${manifest.summary.overallStatus}`);
  console.log(`Manifest written:   ${manifestOutputPath}`);
  console.log('================================================================================');

  if (!hasCredentials) {
    console.log('\n[!] PERHATIAN: Kredensial Cloudflare R2 belum dikonfigurasi di environment.');
    console.log('    Status resmi: BLOCKED ON CREDENTIALS.');
    console.log('    Untuk mengeksekusi upload nyata, konfigurasikan variabel lingkungan berikut:');
    console.log('      • R2_ACCOUNT_ID');
    console.log('      • R2_ACCESS_KEY_ID');
    console.log('      • R2_SECRET_ACCESS_KEY');
    console.log('      • R2_BUCKET_NAME');
    console.log('      • R2_ENDPOINT (opsional, default: https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com)');
    console.log('      • R2_PUBLIC_URL (opsional, untuk CDN publik Webmap)');
  }

  return manifest;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verifyOnly = args.includes('--verify-only');
  const force = args.includes('--force');

  runMigration({ dryRun, verifyOnly, force }).catch((e) => {
    console.error('Fatal migration error:', e);
    process.exit(1);
  });
}
