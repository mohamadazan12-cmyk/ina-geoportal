import { apiClient } from './apiClient';
import { Dataset, Category, PaginatedMeta } from '../types/dataset';
import { DEMO_GEOJSON_MAP, REAL_GEOJSON_MAP } from '../constants/demoGeojson';

export interface DatasetFilters {
  q?: string;
  category?: string;
  node_id?: string;
  format?: string;
  year?: number;
  access_type?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export const datasetService = {
  async getDatasets(filters: DatasetFilters = {}): Promise<{ data: Dataset[]; meta: PaginatedMeta }> {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.category) params.set('category', filters.category);
    if (filters.node_id) params.set('node_id', filters.node_id);
    if (filters.format) params.set('format', filters.format);
    if (filters.year) params.set('year', String(filters.year));
    if (filters.access_type) params.set('access_type', filters.access_type);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.sort) params.set('sort', filters.sort);

    const res: any = await apiClient.get(`/datasets?${params.toString()}`);
    return {
      data: res.data || [],
      meta: res.meta || { page: 1, limit: 10, total: 0, totalPages: 1 },
    };
  },

  async getDatasetById(id: string): Promise<Dataset> {
    const res: any = await apiClient.get(`/datasets/${id}`);
    return res.data;
  },

  async getCategories(): Promise<Category[]> {
    const res: any = await apiClient.get('/categories');
    return res.data || [];
  },

  async getDatasetGeoJSON(
    id: string,
    options: { full?: boolean; scope?: string; bbox?: number[]; page?: number; limit?: number } = {}
  ): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (options.full) params.set('full', 'true');
      if (options.scope) params.set('scope', options.scope);
      if (options.bbox) params.set('bbox', options.bbox.join(','));
      if (options.page) params.set('page', String(options.page));
      if (options.limit) params.set('limit', String(options.limit));
      const queryString = params.toString() ? `?${params.toString()}` : '';

      const res: any = await apiClient.get(`/datasets/${id}/geojson${queryString}`);
      return res;
    } catch (error) {
      // Offline / fallback: check verified real fixtures first, then demo
      if (REAL_GEOJSON_MAP[id]) {
        return REAL_GEOJSON_MAP[id];
      }
      if (DEMO_GEOJSON_MAP[id]) {
        console.warn(`[GeoJSON Fallback] Serving embedded fixture for dataset: ${id}`);
        return DEMO_GEOJSON_MAP[id];
      }
      throw error;
    }
  },

  async requestDownload(id: string, payload: { format: string; purpose?: string }): Promise<any> {
    const res: any = await apiClient.post(`/datasets/${id}/download`, payload);
    return res.data;
  },

  async getStorageStatus(): Promise<any> {
    const res: any = await apiClient.get('/storage/status');
    return res.data;
  },
};
