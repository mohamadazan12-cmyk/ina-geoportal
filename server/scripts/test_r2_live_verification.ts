import { S3Client, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../src/config';
import fs from 'fs';
import path from 'path';

async function verifyLiveR2() {
  console.log('=== VERIFYING LIVE CLOUDFLARE R2 BUCKET ===');
  const client = new S3Client({
    region: 'auto',
    endpoint: config.r2Endpoint,
    credentials: {
      accessKeyId: config.r2AccessKeyId,
      secretAccessKey: config.r2SecretAccessKey,
    },
  });

  const bucket = config.r2BucketName;
  console.log('Target Bucket:', bucket);

  // 1. List all objects in bucket
  let allObjects: { Key?: string; Size?: number; ETag?: string }[] = [];
  let continuationToken: string | undefined = undefined;

  do {
    const listRes = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
      })
    );

    if (listRes.Contents) {
      allObjects.push(...listRes.Contents);
    }
    continuationToken = listRes.NextContinuationToken;
  } while (continuationToken);

  console.log(`Total Objects in S3 Bucket: ${allObjects.length}`);
  const totalRemoteBytes = allObjects.reduce((acc, obj) => acc + (obj.Size || 0), 0);
  console.log(`Total Remote Bytes in S3 Bucket: ${totalRemoteBytes} bytes`);

  // 2. Compare against Manifest
  const manifestPath = path.resolve(__dirname, '../../docs/PHASE_16_4_1_PUBLIC_STORAGE_MANIFEST.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  console.log(`Manifest Items Count: ${manifest.items.length}`);
  console.log(`Manifest Total Bytes: ${manifest.summary.totalBytes}`);

  const missingKeys: string[] = [];
  const sizeMismatches: string[] = [];

  for (const item of manifest.items) {
    const remoteObj = allObjects.find((o) => o.Key === item.remoteKey);
    if (!remoteObj) {
      missingKeys.push(item.remoteKey);
    } else if (remoteObj.Size !== item.sizeBytes) {
      sizeMismatches.push(`${item.remoteKey}: local=${item.sizeBytes} remote=${remoteObj.Size}`);
    }
  }

  console.log(`Missing Keys: ${missingKeys.length}`);
  if (missingKeys.length > 0) {
    console.error('Missing:', missingKeys);
  }
  console.log(`Size Mismatches: ${sizeMismatches.length}`);
  if (sizeMismatches.length > 0) {
    console.error('Mismatches:', sizeMismatches);
  }

  // 3. Test Public HTTP access via R2_PUBLIC_URL
  const publicBaseUrl = config.r2PublicUrl;
  console.log(`Testing Public Access via ${publicBaseUrl}...`);

  const testUrls = [
    'geojson/web/real_batas_kabupaten.json',
    'geojson/web/real_jalan_nasional.json',
    'manifests/gempa_manifest.json',
    'datasets/ds-faskes/real_fasilitas_kesehatan_national.json',
    'datasets/ds-batas-kabkot/full/real_batas_kabupaten_548.json',
  ];

  for (const key of testUrls) {
    const url = `${publicBaseUrl}/${key}`;
    try {
      const headRes = await fetch(url, { method: 'HEAD' });
      console.log(`[PUBLIC HEAD] ${headRes.status} ${headRes.statusText} -> ${key} (${headRes.headers.get('content-length')} bytes, ${headRes.headers.get('content-type')})`);
    } catch (err: any) {
      console.error(`[PUBLIC HEAD FAILED] ${key}:`, err.message);
    }
  }

  // 4. Test Range Request (206 Partial Content)
  const rangeUrl = `${publicBaseUrl}/datasets/ds-batas-kabkot/full/real_batas_kabupaten_548.json`;
  try {
    const rangeRes = await fetch(rangeUrl, {
      headers: { Range: 'bytes=0-1023' },
    });
    console.log(`[PUBLIC RANGE 0-1023] ${rangeRes.status} ${rangeRes.statusText} -> ${rangeRes.headers.get('content-range')}, len=${rangeRes.headers.get('content-length')}`);
  } catch (err: any) {
    console.error(`[PUBLIC RANGE FAILED]:`, err.message);
  }

  console.log('=== VERIFICATION COMPLETED ===');
}

verifyLiveR2().catch((e) => {
  console.error('Verification error:', e);
  process.exit(1);
});
