import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { sendSuccess, sendError } from '../utils/responseFormatter';

export async function getSearchSuggestions(req: Request, res: Response): Promise<void> {
  try {
    const q = (req.query.q as string || '').trim().toLowerCase();
    const limit = Math.min(parseInt(req.query.limit as string || '5', 10), 20);

    if (!q) {
      sendSuccess(res, []);
      return;
    }

    const suggestions: Array<{
      type: 'dataset' | 'category' | 'node';
      id: string;
      title: string;
      sub: string;
      url: string;
    }> = [];

    // 1. Search Datasets
    const datasets = await prisma.dataset.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { abstract: { contains: q } },
          { description: { contains: q } },
        ],
      },
      include: {
        node: true,
      },
      take: limit,
    });

    for (const ds of datasets) {
      suggestions.push({
        type: 'dataset',
        id: ds.id,
        title: ds.title,
        sub: ds.node.name,
        url: `/katalog/${ds.id}`,
      });
    }

    // 2. Search Categories
    const categories = await prisma.category.findMany({
      where: {
        name: { contains: q },
      },
      take: 3,
    });

    for (const cat of categories) {
      suggestions.push({
        type: 'category',
        id: cat.id,
        title: cat.name,
        sub: 'Kategori Tematik',
        url: `/katalog?category=${cat.id}`,
      });
    }

    // 3. Search Nodes
    const nodes = await prisma.networkNode.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { description: { contains: q } },
        ],
      },
      take: 3,
    });

    for (const node of nodes) {
      suggestions.push({
        type: 'node',
        id: node.id,
        title: node.name,
        sub: `Simpul Jaringan (${node.type.toUpperCase()})`,
        url: `/simpul/${node.id}`,
      });
    }

    sendSuccess(res, suggestions.slice(0, limit));
  } catch (error: any) {
    sendError(res, 'SEARCH_SUGGEST_FAILED', error.message || 'Gagal mencari saran', 500);
  }
}
