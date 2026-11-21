import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { sendSuccess, sendError } from '../utils/responseFormatter';

export async function getNodes(req: Request, res: Response): Promise<void> {
  try {
    const q = (req.query.q as string || '').trim().toLowerCase();
    const type = req.query.type as string;
    const status = req.query.status as string;
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit as string || '10', 10)));

    const where: any = {};

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { province: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type.toLowerCase();
    }

    if (status) {
      where.status = status.toLowerCase();
    }

    const total = await prisma.networkNode.count({ where });
    const nodes = await prisma.networkNode.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: {
          select: { datasets: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = nodes.map((node) => ({
      ...node,
      datasetCount: node._count.datasets,
    }));

    sendSuccess(
      res,
      result,
      'Data Simpul Jaringan berhasil dimuat',
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    );
  } catch (error: any) {
    sendError(res, 'NODES_FETCH_ERROR', error.message || 'Gagal memuat simpul jaringan', 500);
  }
}

export async function getNodeById(req: Request, res: Response): Promise<void> {
  try {
    const { nodeId } = req.params;

    const node = await prisma.networkNode.findUnique({
      where: { id: nodeId },
      include: {
        datasets: {
          include: {
            category: true,
          },
        },
        _count: {
          select: { datasets: true },
        },
      },
    });

    if (!node) {
      sendError(res, 'NOT_FOUND', `Simpul Jaringan '${nodeId}' tidak ditemukan.`, 404);
      return;
    }

    sendSuccess(res, {
      ...node,
      datasetCount: node._count.datasets,
    }, 'Profil Simpul Jaringan berhasil dimuat');
  } catch (error: any) {
    sendError(res, 'NODE_DETAIL_ERROR', error.message || 'Gagal memuat detail simpul jaringan', 500);
  }
}
