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

export async function getUserDownloads(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    const downloads = await prisma.downloadHistory.findMany({
      where: { userId },
      include: {
        dataset: {
          include: {
            node: true,
            category: true,
          },
        },
      },
      orderBy: { downloadedAt: 'desc' },
    });

    sendSuccess(res, downloads, 'Riwayat unduhan berhasil dimuat');
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
