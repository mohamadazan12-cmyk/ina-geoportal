import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { sendSuccess, sendError } from '../utils/responseFormatter';

export async function getUserProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        institution: true,
        role: true,
        avatarUrl: true,
        provider: true,
        googleId: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            bookmarks: true,
            downloadHistory: true,
          },
        },
      },
    });

    if (!user) {
      sendError(res, 'NOT_FOUND', 'Pengguna tidak ditemukan', 404);
      return;
    }

    sendSuccess(res, {
      ...user,
      bookmarkCount: user._count.bookmarks,
      downloadCount: user._count.downloadHistory,
    });
  } catch (error: any) {
    sendError(res, 'PROFILE_FETCH_ERROR', error.message || 'Gagal mengambil profil pengguna', 500);
  }
}

export async function updateUserProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { name, institution } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      sendError(res, 'VALIDATION_ERROR', 'Nama lengkap minimal 2 karakter', 422);
      return;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name.trim(),
        institution: institution ? String(institution).trim() : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        institution: true,
        role: true,
        avatarUrl: true,
        provider: true,
        googleId: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    sendSuccess(res, updated, 'Profil pengguna berhasil diperbarui');
  } catch (error: any) {
    sendError(res, 'PROFILE_UPDATE_ERROR', error.message || 'Gagal memperbarui profil pengguna', 500);
  }
}

export async function getUserDownloads(req: AuthenticatedRequest, res: Response): Promise<void> {
  return getDownloadHistory(req, res);
}

export async function getDownloadHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
    const categoryId = req.query.categoryId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const search = req.query.search as string | undefined;

    const where: any = { userId };

    if (categoryId) {
      where.dataset = { ...where.dataset, categoryId };
    }

    if (search) {
      where.dataset = {
        ...where.dataset,
        title: { contains: String(search).trim(), mode: 'insensitive' },
      };
    }

    if (startDate || endDate) {
      where.downloadedAt = {};
      if (startDate) {
        where.downloadedAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.downloadedAt.lte = new Date(endDate);
      }
    }

    const [total, downloads] = await Promise.all([
      prisma.downloadHistory.count({ where }),
      prisma.downloadHistory.findMany({
        where,
        include: {
          dataset: {
            include: {
              node: true,
              category: true,
            },
          },
        },
        orderBy: { downloadedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const enriched = downloads.map((rec) => ({
      ...rec,
      storageSource: 'Cloudflare R2',
    }));

    // If query has pagination parameters, return structured paginated response,
    // otherwise return direct array for backwards compatibility with existing UI.
    const hasPaginationParams = req.query.page !== undefined || req.query.limit !== undefined || req.query.categoryId !== undefined;

    if (hasPaginationParams) {
      sendSuccess(
        res,
        enriched,
        'Riwayat unduhan berhasil dimuat',
        {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        }
      );
    } else {
      sendSuccess(res, enriched, 'Riwayat unduhan berhasil dimuat');
    }
  } catch (error: any) {
    sendError(res, 'DOWNLOADS_FETCH_ERROR', error.message || 'Gagal memuat riwayat unduhan', 500);
  }
}

export async function getUserBookmarks(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      include: {
        dataset: {
          include: {
            node: true,
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, bookmarks, 'Bookmark berhasil dimuat');
  } catch (error: any) {
    sendError(res, 'BOOKMARKS_FETCH_ERROR', error.message || 'Gagal memuat bookmark', 500);
  }
}

export async function toggleBookmark(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { datasetId } = req.body;

    if (!datasetId) {
      sendError(res, 'BAD_REQUEST', 'datasetId wajib disertakan', 400);
      return;
    }

    // Verify dataset exists
    const dataset = await prisma.dataset.findUnique({ where: { id: datasetId } });
    if (!dataset) {
      sendError(res, 'NOT_FOUND', 'Dataset tidak ditemukan', 404);
      return;
    }

    const existing = await prisma.bookmark.findUnique({
      where: {
        userId_datasetId: {
          userId,
          datasetId,
        },
      },
    });

    if (existing) {
      await prisma.bookmark.delete({
        where: { id: existing.id },
      });
      sendSuccess(res, { bookmarked: false, datasetId }, 'Bookmark berhasil dihapus');
    } else {
      await prisma.bookmark.create({
        data: {
          userId,
          datasetId,
        },
      });
      sendSuccess(res, { bookmarked: true, datasetId }, 'Dataset berhasil disimpan ke bookmark');
    }
  } catch (error: any) {
    sendError(res, 'BOOKMARK_TOGGLE_ERROR', error.message || 'Gagal memproses bookmark', 500);
  }
}
