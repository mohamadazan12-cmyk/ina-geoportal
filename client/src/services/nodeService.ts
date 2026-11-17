import { apiClient } from './apiClient';
import { NetworkNode, PaginatedMeta } from '../types/dataset';

export interface NodeFilters {
  type?: string;
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export const nodeService = {
  async getNodes(filters: NodeFilters = {}): Promise<{ data: NetworkNode[]; meta: PaginatedMeta }> {
    const params = new URLSearchParams();
    if (filters.type) params.set('type', filters.type);
    if (filters.status) params.set('status', filters.status);
    if (filters.q) params.set('q', filters.q);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));

    const res: any = await apiClient.get(`/nodes?${params.toString()}`);
    return {
      data: res.data || [],
      meta: res.meta || { page: 1, limit: 10, total: 0, totalPages: 1 },
    };
  },

  async getNodeById(nodeId: string): Promise<NetworkNode> {
    const res: any = await apiClient.get(`/nodes/${nodeId}`);
    return res.data;
  },
};
