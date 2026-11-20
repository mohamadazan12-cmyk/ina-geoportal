import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { config } from '../config';
import { sendSuccess, sendError } from '../utils/responseFormatter';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { realGeospatialService } from '../services/realGeospatialService';
import { getStorageDriver, toCanonicalKey } from '../services/storage';
import { verifyToken } from '../utils/jwt';

export async function getDatasets(req: Request, res: Response): Promise<void> {
  try {
    const q = (req.query.q as string || '').trim().toLowerCase();
    const category = req.query.category as string;
    const nodeId = req.query.node_id as string;
    const format = req.query.format as string;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const accessType = req.query.access_type as string;
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit as string || '10', 10)));
    const sort = req.query.sort as string || 'newest';

    const where: any = {};

    if (q) {
      where.OR = [
        { title: { contains: q } },
        { abstract: { contains: q } },
        { description: { contains: q } },
      ];
    }

    if (category) {
      where.categoryId = category;
    }

    if (nodeId) {
      where.nodeId = nodeId;
    }

    if (format) {
      where.formatList = { contains: format.toLowerCase() };
    }

    if (year) {
      where.year = year;
    }

    if (accessType) {
      where.accessType = accessType.toLowerCase();
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'popular') {
      orderBy = { downloadCount: 'desc' };
    } else if (sort === 'title_asc') {
      orderBy = { title: 'asc' };
    } else if (sort === 'title_desc') {
      orderBy = { title: 'desc' };
    } else if (sort === 'year_desc') {
      orderBy = { year: 'desc' };
    }

    const total = await prisma.dataset.count({ where });
    const datasets = await prisma.dataset.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        category: true,
        node: true,
      },
    });

    const enrichedDatasets = datasets.map((d) => {
      const publicDownloadUrl = realGeospatialService.getPublicDownloadUrl(d.id);
      const canonicalKey = toCanonicalKey(`${d.id}.json`);
      const r2PublicUrl = config.r2PublicUrl ? `${config.r2PublicUrl}/${canonicalKey}` : publicDownloadUrl;
      return {
        ...d,
        publicDownloadUrl,
        remoteKey: canonicalKey,
        r2PublicUrl,
        storageSource: config.storageDriver,
      };
    });

    sendSuccess(
      res,
      enrichedDatasets,
      'Data katalog berhasil dimuat',
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    );
  } catch (error: any) {
    sendError(res, 'DATASET_FETCH_ERROR', error.message || 'Gagal memuat dataset', 500);
  }
}

export async function getDatasetById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const dataset = await prisma.dataset.findUnique({
      where: { id },
      include: {
        category: true,
        node: true,
      },
    });

    if (!dataset) {
      sendError(res, 'NOT_FOUND', `Dataset dengan ID '${id}' tidak ditemukan.`, 404);
      return;
    }

    const publicDownloadUrl = realGeospatialService.getPublicDownloadUrl(id);
    const canonicalKey = toCanonicalKey(`${id}.json`);
    const r2PublicUrl = config.r2PublicUrl ? `${config.r2PublicUrl}/${canonicalKey}` : publicDownloadUrl;

    sendSuccess(
      res,
      {
        ...dataset,
        publicDownloadUrl,
        remoteKey: canonicalKey,
        r2PublicUrl,
        storageSource: config.storageDriver,
      },
      'Detail dataset berhasil dimuat'
    );
  } catch (error: any) {
    sendError(res, 'DATASET_DETAIL_ERROR', error.message || 'Gagal memuat detail dataset', 500);
  }
}

export async function getCategories(_req: Request, res: Response): Promise<void> {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { datasets: true },
        },
      },
    });

    const result = categories.map((c) => ({
      ...c,
      datasetCount: c._count.datasets,
    }));

    sendSuccess(res, result, 'Kategori berhasil dimuat');
  } catch (error: any) {
    sendError(res, 'CATEGORIES_FETCH_ERROR', error.message || 'Gagal memuat kategori', 500);
  }
}

export async function getDatasetGeoJSON(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const preferDemo = req.query.demo === 'true';
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const scope = req.query.scope as string | undefined;
    const full = req.query.full === 'true';

    let bbox: [number, number, number, number] | undefined = undefined;
    if (req.query.bbox && typeof req.query.bbox === 'string') {
      const parts = (req.query.bbox as string).replace(/[\[\]\s]/g, '').split(',').map(Number);
      if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
        bbox = [parts[0], parts[1], parts[2], parts[3]];
      }
    }

    try {
      const geoResult = await realGeospatialService.getDatasetGeoJSON(
        id,
        preferDemo,
        page,
        limit,
        bbox,
        scope,
        full
      );
      res.setHeader('Content-Type', 'application/geo+json');
      res.setHeader('X-Data-Source', geoResult.dataSourceStatus);
      res.setHeader('X-Is-Demo', String(geoResult.isDemo));
      res.setHeader('X-Source-Agency', encodeURIComponent(geoResult.sourceAgency));
      res.setHeader('X-Feature-Count', String(geoResult.featureCount));
      if (geoResult.totalCount !== undefined) {
        res.setHeader('X-Total-Count', String(geoResult.totalCount));
      }
      if (geoResult.pagination) {
        res.setHeader('X-Page', String(geoResult.pagination.page));
        res.setHeader('X-Total-Pages', String(geoResult.pagination.totalPages));
      }
      if (bbox) {
        res.setHeader('X-Filter-Bbox', bbox.join(','));
      }
      if (geoResult.storageDriver) {
        res.setHeader('X-Storage-Driver', geoResult.storageDriver);
      }
      if (geoResult.storageSource) {
        res.setHeader('X-Storage-Source', geoResult.storageSource);
        if (geoResult.storageSource === 'local-fallback') {
          res.setHeader('X-Storage-Fallback', 'true');
        }
      }
      if (geoResult.canonicalKey) {
        res.setHeader('X-Canonical-Key', geoResult.canonicalKey);
      }
      if (geoResult.publicUrl) {
        res.setHeader('X-Public-Url', geoResult.publicUrl);
      }
      res.setHeader(
        'Access-Control-Expose-Headers',
        'X-Data-Source, X-Is-Demo, X-Source-Agency, X-Feature-Count, X-Total-Count, X-Page, X-Total-Pages, X-Filter-Bbox, X-Storage-Driver, X-Storage-Source, X-Storage-Fallback, X-Canonical-Key, X-Public-Url'
      );
      res.json(geoResult.data);
    } catch (err: any) {
      sendError(res, 'GEOJSON_NOT_FOUND', err.message || `Data GeoJSON untuk '${id}' tidak ditemukan.`, 404);
    }
  } catch (error: any) {
    sendError(res, 'GEOJSON_ERROR', error.message || 'Gagal memuat GeoJSON', 500);
  }
}

export async function getDatasetLiveStatus(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const status = await realGeospatialService.probeLiveStatus(id);
    sendSuccess(res, status, 'Status konektivitas upstream real berhasil diperiksa');
  } catch (error: any) {
    sendError(res, 'LIVE_STATUS_ERROR', error.message || 'Gagal memeriksa status layanan live', 500);
  }
}

export async function requestDownload(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { format = 'geojson', purpose = 'Penelitian' } = req.body;

    // Phase 12: Public Access for Viewing — Session Required for Downloading
    if (!req.user) {
      sendError(
        res,
        'AUTH_REQUIRED',
        'Akses ditolak. Login diperlukan untuk mengunduh dataset atau dokumen geospasial.',
        401
      );
      return;
    }

    const dataset = await prisma.dataset.findUnique({
      where: { id },
    });

    if (!dataset) {
      sendError(res, 'NOT_FOUND', 'Dataset tidak ditemukan', 404);
      return;
    }

    // Condition B: Restricted Dataset
    if (dataset.accessType === 'restricted') {
      if (!purpose || purpose.trim().length < 5) {
        sendError(
          res,
          'PURPOSE_REQUIRED',
          'Untuk mengunduh dataset terbatas, silakan isi tujuan penggunaan data secara jelas (minimal 5 karakter).',
          422
        );
        return;
      }
    }

    // Record download history for authenticated user
    const status = dataset.accessType === 'restricted' ? 'APPROVED' : 'REDIRECTED';

    const historyRecord = await prisma.downloadHistory.create({
      data: {
        userId: req.user.userId,
        datasetId: dataset.id,
        format: format.toLowerCase(),
        purpose: purpose.trim() || 'Unduh Berkas Geospasial',
        status,
      },
    });

    // Increment download count
    await prisma.dataset.update({
      where: { id: dataset.id },
      data: {
        downloadCount: { increment: 1 },
      },
    });

    const clientToken = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : '';
    const downloadUrl = `/api/v1/datasets/${dataset.id}/download-file?format=${encodeURIComponent(format.toLowerCase())}${clientToken ? `&token=${encodeURIComponent(clientToken)}` : ''}`;

    // Resolve canonical R2 download URL
    const fileInfo = await realGeospatialService.getDownloadFilePath(id, true);
    const r2PublicBase = config.r2PublicUrl || 'https://pub-9dc737b540c54b5597b47a06cbbda81e.r2.dev';
    const canonicalKey = toCanonicalKey(fileInfo.key);
    const r2PublicUrl = `${r2PublicBase}/${canonicalKey}`;

    sendSuccess(
      res,
      {
        historyId: historyRecord.id,
        datasetId: dataset.id,
        title: dataset.title,
        format: format.toLowerCase(),
        accessType: dataset.accessType,
        status,
        storageSource: 'Cloudflare R2',
        canonicalKey,
        publicUrl: r2PublicUrl,
        r2PublicUrl,
        downloadUrl,
        expiresInSeconds: 3600,
      },
      'Permohonan unduh berhasil disetujui. Silakan unduh berkas Anda.'
    );
  } catch (error: any) {
    sendError(res, 'DOWNLOAD_REQUEST_FAILED', error.message || 'Gagal memproses permohonan unduh', 500);
  }
}

export async function downloadFile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const format = (req.query.format as string || 'geojson').toLowerCase();
    const preferReal = req.query.real !== 'false';

    // Phase 12 Security: Verify authentication via header or query token
    let user = req.user;
    if (!user && req.query.token) {
      try {
        user = verifyToken(req.query.token as string);
      } catch {
        // invalid token
      }
    }

    if (!user) {
      sendError(
        res,
        'AUTH_REQUIRED',
        'Akses ditolak. Login diperlukan untuk mengunduh berkas.',
        401
      );
      return;
    }

    const dataset = await prisma.dataset.findUnique({
      where: { id },
    });

    if (!dataset) {
      sendError(res, 'NOT_FOUND', 'Dataset atau dokumen tidak ditemukan di katalog.', 404);
      return;
    }

    try {
      const fileInfo = await realGeospatialService.getDownloadFilePath(id, preferReal);

      const driver = getStorageDriver('private');
      if (!(await driver.exists(fileInfo.key))) {
        sendError(res, 'FILE_NOT_FOUND', 'Dokumen belum tersedia untuk diunduh.', 404);
        return;
      }

      // Safe filename generation preventing path traversal
      const sanitizedId = id.replace(/[^a-zA-Z0-9_-]/g, '');
      const sanitizedFormat = format.replace(/[^a-zA-Z0-9]/g, '');
      const downloadName = `${sanitizedId}_${fileInfo.isReal ? 'real' : 'demo'}.${sanitizedFormat === 'shp' ? 'geojson' : sanitizedFormat}`;

      res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
      res.setHeader('Content-Type', sanitizedFormat === 'kml' ? 'application/vnd.google-earth.kml+xml' : 'application/json');
      res.setHeader('X-Data-Source', fileInfo.isReal ? 'REAL' : 'DEMO');

      // Record successful download in download history
      try {
        await prisma.downloadHistory.create({
          data: {
            userId: user.userId,
            datasetId: dataset.id,
            format: sanitizedFormat,
            purpose: (req.query.purpose as string) || 'Unduh Berkas Geospasial',
            status: 'COMPLETED',
          },
        });
        await prisma.dataset.update({
          where: { id: dataset.id },
          data: { downloadCount: { increment: 1 } },
        });
      } catch {
        // continue streaming even if logging fails
      }

      const stream = await driver.createReadStream(fileInfo.key);
      stream.pipe(res);
    } catch (err: any) {
      sendError(res, 'FILE_NOT_FOUND', err.message || 'Dokumen belum tersedia untuk diunduh.', 404);
    }
  } catch (error: any) {
    sendError(res, 'FILE_STREAM_ERROR', error.message || 'Gagal mengirim file', 500);
  }
}
