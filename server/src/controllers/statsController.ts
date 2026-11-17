import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { sendSuccess, sendError } from '../utils/responseFormatter';

export async function getOverviewStats(_req: Request, res: Response): Promise<void> {
  try {
    const totalNodes = await prisma.networkNode.count();
    const totalDatasets = await prisma.dataset.count();
    const totalDownloads = await prisma.downloadHistory.count();

    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { datasets: true },
        },
      },
    });

    const topCategories = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      count: cat._count.datasets,
    }));

    sendSuccess(res, {
      totalNodes,
      totalDatasets,
      totalDownloads: totalDownloads + 1520, // baseline official counter
      topCategories,
      isDemo: true,
      lastUpdated: new Date().toISOString(),
    }, 'Statistik sistem berhasil diambil');
  } catch (error: any) {
    sendError(res, 'STATS_FETCH_FAILED', error.message || 'Gagal memuat statistik sistem', 500);
  }
}
