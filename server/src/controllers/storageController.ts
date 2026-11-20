import { Request, Response } from 'express';
import { config } from '../config';
import { getStorageDriver, toCanonicalKey, CANONICAL_KEYS_70 } from '../services/storage';
import { sendSuccess, sendError } from '../utils/responseFormatter';

/**
 * PHASE 16.7 — CLOUDFLARE R2 RUNTIME STORAGE CONTROLLER
 *
 * Provides CORS-safe public streaming and diagnostics for all 70 canonical
 * geospatial objects stored in Cloudflare R2.
 */

export async function getStorageStatus(_req: Request, res: Response): Promise<void> {
  try {
    const driver = getStorageDriver('public');
    const activeSource = (driver as any).getActiveSource
      ? (driver as any).getActiveSource()
      : driver.name;

    sendSuccess(
      res,
      {
        storageDriver: driver.name,
        activeSource,
        hasR2Credentials: config.hasR2Credentials,
        bucketName: config.r2BucketName || 'ina-geoportal-data',
        publicBaseUrl: config.r2PublicUrl || 'https://pub-9dc737b540c54b5597b47a06cbbda81e.r2.dev',
        totalCanonicalAssets: CANONICAL_KEYS_70.length,
        corsBypassProvided: true,
        features: {
          directPublicDownloads: true,
          bboxSpatialFiltering: true,
          lazyChunkLoading: true,
          httpRangeStreaming: true,
          resilientLocalFallback: true,
        },
      },
      'Status penyimpanan Cloudflare R2 berhasil dimuat'
    );
  } catch (err: any) {
    sendError(res, 'STORAGE_STATUS_ERROR', err?.message || 'Gagal memuat status storage', 500);
  }
}

export async function streamR2Object(req: Request, res: Response): Promise<void> {
  try {
    // The path after /api/v1/storage/r2/
    const subpath = req.params[0] || '';
    if (!subpath) {
      sendError(res, 'INVALID_KEY', 'Kunci objek kanonikal diperlukan.', 400);
      return;
    }

    const canonicalKey = toCanonicalKey(subpath);
    const driver = getStorageDriver('public');

    const meta = await driver.getMeta(canonicalKey);
    if (!meta) {
      sendError(res, 'NOT_FOUND', `Objek R2 '${canonicalKey}' tidak ditemukan.`, 404);
      return;
    }

    const activeSource = (driver as any).getActiveSource
      ? (driver as any).getActiveSource()
      : driver.name;

    // Set CORS headers for direct browser consumption
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
    res.setHeader(
      'Access-Control-Expose-Headers',
      'Content-Range, Content-Length, Accept-Ranges, X-Storage-Driver, X-Storage-Source, X-Canonical-Key'
    );
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', meta.contentType || 'application/geo+json');
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    res.setHeader('X-Storage-Driver', driver.name);
    res.setHeader('X-Storage-Source', activeSource);
    res.setHeader('X-Canonical-Key', canonicalKey);

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    if (req.method === 'HEAD') {
      res.setHeader('Content-Length', String(meta.size));
      res.status(200).end();
      return;
    }

    // Handle Range Requests
    const rangeHeader = req.headers.range;
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
      if (match) {
        const start = match[1] ? parseInt(match[1], 10) : 0;
        const end = match[2] ? parseInt(match[2], 10) : meta.size - 1;

        if (start < meta.size && end < meta.size && start <= end) {
          const chunkLength = end - start + 1;
          res.status(206);
          res.setHeader('Content-Range', `bytes ${start}-${end}/${meta.size}`);
          res.setHeader('Content-Length', String(chunkLength));

          const stream = await driver.createReadStream(canonicalKey, { start, end });
          stream.pipe(res);
          return;
        }
      }
    }

    // Full stream
    res.setHeader('Content-Length', String(meta.size));
    const stream = await driver.createReadStream(canonicalKey);
    stream.pipe(res);
  } catch (err: any) {
    sendError(res, 'STREAM_ERROR', err?.message || 'Gagal streaming objek R2', 500);
  }
}
